use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;
use sqlx::SqlitePool;
use anyhow::Result;
use log::{info, warn};

use crate::models::{BalanceSnapshot, AppSettings};
use crate::services::deepseek_api::DeepSeekApiClient;
use crate::keychain::KeychainService;

pub struct BalancePoller {
    pool: SqlitePool,
    api_client: DeepSeekApiClient,
    keychain: KeychainService,
    settings: Arc<RwLock<AppSettings>>,
    active_api_key_id: Arc<RwLock<String>>,
    last_snapshot: Arc<RwLock<Option<BalanceSnapshot>>>,
    alert_engine: Arc<crate::services::alert_engine::AlertEngine>,
}

impl BalancePoller {
    pub fn new(
        pool: SqlitePool,
        settings: Arc<RwLock<AppSettings>>,
        active_api_key_id: Arc<RwLock<String>>,
        alert_engine: Arc<crate::services::alert_engine::AlertEngine>,
    ) -> Self {
        Self {
            pool,
            api_client: DeepSeekApiClient::new(),
            keychain: KeychainService::new(),
            settings,
            active_api_key_id,
            last_snapshot: Arc::new(RwLock::new(None)),
            alert_engine,
        }
    }

    #[allow(dead_code)]
    pub async fn start(&self) {
        let mut consecutive_errors = 0u32;
        let mut current_interval_secs;

        loop {
            let settings = self.settings.read().await;
            current_interval_secs = settings.balance_refresh_interval_seconds;
            drop(settings);

            match self.poll_balance().await {
                Ok(snapshot) => {
                    consecutive_errors = 0;
                    let mut last = self.last_snapshot.write().await;
                    *last = Some(snapshot);
                    info!("Balance refreshed successfully");
                }
                Err(e) => {
                    consecutive_errors += 1;
                    let backoff_secs = std::cmp::min(
                        current_interval_secs * (2_i64.pow(consecutive_errors.min(5))),
                        300
                    );
                    warn!("Balance poll failed (attempt {}): {}. Backing off for {}s", 
                          consecutive_errors, e, backoff_secs);
                    sleep(Duration::from_secs(backoff_secs as u64)).await;
                    continue;
                }
            }

            sleep(Duration::from_secs(current_interval_secs as u64)).await;
        }
    }

    async fn poll_balance(&self) -> Result<BalanceSnapshot> {
        let selected_key_id = self.active_api_key_id.read().await.clone();
        let active_key: Option<(String, String)> = if selected_key_id.is_empty() {
            sqlx::query_as(
                "SELECT id, keychain_ref FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
            )
            .fetch_optional(&self.pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT id, keychain_ref FROM api_keys WHERE id = ?1 AND is_active = 1 LIMIT 1"
            )
            .bind(&selected_key_id)
            .fetch_optional(&self.pool)
            .await?
        };

        let (key_id, _) = active_key.ok_or_else(|| anyhow::anyhow!("No active API key"))?;
        
        let api_key = self.keychain.get_api_key(&key_id)?;
        
        let response = self.api_client.get_balance(&api_key).await?;
        let snapshots = self.api_client.create_balance_snapshot(&key_id, &response);
        
        if snapshots.is_empty() {
            anyhow::bail!("No balance info in response");
        }

        for snapshot in snapshots.iter() {
            sqlx::query(
                "INSERT INTO balance_snapshots 
                 (id, api_key_id, captured_at, is_available, currency, total_balance, granted_balance, topped_up_balance)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
            )
            .bind(&snapshot.id)
            .bind(&snapshot.api_key_id)
            .bind(&snapshot.captured_at)
            .bind(snapshot.is_available as i32)
            .bind(&snapshot.currency)
            .bind(&snapshot.total_balance)
            .bind(&snapshot.granted_balance)
            .bind(&snapshot.topped_up_balance)
            .execute(&self.pool)
            .await?;
        }

        let snapshot = snapshots[0].clone();

        // Perform alert checks on new balance snapshot
        let s = self.settings.read().await;
        let alert_config = crate::models::AlertConfig {
            low_balance_threshold: s.low_balance_threshold.clone(),
            hourly_cost_threshold: s.hourly_cost_threshold.clone(),
            single_request_token_threshold: s.single_request_token_threshold,
            notify_on_401: s.notify_on_401,
            notify_on_429: s.notify_on_429,
            notify_on_503: s.notify_on_503,
        };
        drop(s);

        let _ = self.alert_engine.check_low_balance(&alert_config, &snapshot).await;

        Ok(snapshot)
    }

    #[allow(dead_code)]
    pub async fn get_last_snapshot(&self) -> Option<BalanceSnapshot> {
        self.last_snapshot.read().await.clone()
    }

    pub async fn refresh_now(&self) -> Result<BalanceSnapshot> {
        let snapshot = self.poll_balance().await?;
        let mut last = self.last_snapshot.write().await;
        *last = Some(snapshot.clone());
        Ok(snapshot)
    }

    pub async fn load_last_snapshot_from_db(&self) -> Result<()> {
        let selected_key_id = self.active_api_key_id.read().await.clone();
        
        let row: Option<BalanceSnapshot> = if selected_key_id.is_empty() {
            sqlx::query_as(
                "SELECT id, api_key_id, captured_at, is_available, currency, total_balance, granted_balance, topped_up_balance 
                 FROM balance_snapshots 
                 ORDER BY captured_at DESC LIMIT 1"
            )
            .fetch_optional(&self.pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT id, api_key_id, captured_at, is_available, currency, total_balance, granted_balance, topped_up_balance 
                 FROM balance_snapshots 
                 WHERE api_key_id = ?1 
                 ORDER BY captured_at DESC LIMIT 1"
            )
            .bind(&selected_key_id)
            .fetch_optional(&self.pool)
            .await?
        };

        if let Some(snapshot) = row {
            let mut last = self.last_snapshot.write().await;
            *last = Some(snapshot);
        }
        Ok(())
    }
}

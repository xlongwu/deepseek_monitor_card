use sqlx::SqlitePool;
use anyhow::Result;
use chrono::Utc;
use uuid::Uuid;
use log::{info, error};
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri_plugin_notification::NotificationExt;

use crate::models::{AlertEvent, AlertConfig, BalanceSnapshot};

pub struct AlertEngine {
    pool: SqlitePool,
    app_handle: Arc<RwLock<Option<tauri::AppHandle>>>,
}

impl AlertEngine {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            app_handle: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn set_app_handle(&self, handle: tauri::AppHandle) {
        let mut h = self.app_handle.write().await;
        *h = Some(handle);
    }

    pub async fn check_low_balance(
        &self,
        config: &AlertConfig,
        balance: &BalanceSnapshot,
    ) -> Result<Option<AlertEvent>> {
        let threshold: f64 = config.low_balance_threshold.parse().unwrap_or(10.0);
        let current: f64 = balance.total_balance.parse().unwrap_or(0.0);

        if current < threshold {
            let event = AlertEvent {
                id: Uuid::new_v4().to_string(),
                api_key_id: Some(balance.api_key_id.clone()),
                alert_type: "low_balance".to_string(),
                severity: "warning".to_string(),
                title: "余额不足提醒".to_string(),
                message: format!("当前余额 {} {}，低于阈值 {} {}", 
                    current, balance.currency, threshold, balance.currency),
                triggered_at: Utc::now().to_rfc3339(),
                acknowledged_at: None,
            };
            self.save_alert(&event).await?;
            return Ok(Some(event));
        }

        Ok(None)
    }

    pub async fn check_hourly_cost(
        &self,
        config: &AlertConfig,
        api_key_id: &str,
        hourly_cost: &str,
    ) -> Result<Option<AlertEvent>> {
        let threshold: f64 = config.hourly_cost_threshold.parse().unwrap_or(5.0);
        let cost: f64 = hourly_cost.parse().unwrap_or(0.0);

        if cost > threshold {
            let event = AlertEvent {
                id: Uuid::new_v4().to_string(),
                api_key_id: Some(api_key_id.to_string()),
                alert_type: "high_hourly_cost".to_string(),
                severity: "warning".to_string(),
                title: "高消耗提醒".to_string(),
                message: format!("最近1小时消耗 {}，超过阈值 {}", cost, threshold),
                triggered_at: Utc::now().to_rfc3339(),
                acknowledged_at: None,
            };
            self.save_alert(&event).await?;
            return Ok(Some(event));
        }

        Ok(None)
    }

    pub async fn check_api_error(
        &self,
        config: &AlertConfig,
        api_key_id: &str,
        status_code: u16,
    ) -> Result<Option<AlertEvent>> {
        let should_notify = match status_code {
            401 => config.notify_on_401,
            429 => config.notify_on_429,
            503 => config.notify_on_503,
            _ => false,
        };

        if should_notify {
            let (title, message) = match status_code {
                401 => ("API Key 无效".to_string(), 
                       "DeepSeek API 返回 401，请检查 API Key 是否有效".to_string()),
                429 => ("请求过于频繁".to_string(),
                       "DeepSeek API 返回 429，请稍后重试".to_string()),
                503 => ("服务暂不可用".to_string(),
                       "DeepSeek API 返回 503，服务可能暂时不可用".to_string()),
                _ => return Ok(None),
            };

            let event = AlertEvent {
                id: Uuid::new_v4().to_string(),
                api_key_id: Some(api_key_id.to_string()),
                alert_type: format!("api_error_{}", status_code),
                severity: "error".to_string(),
                title,
                message,
                triggered_at: Utc::now().to_rfc3339(),
                acknowledged_at: None,
            };
            self.save_alert(&event).await?;
            return Ok(Some(event));
        }

        Ok(None)
    }

    pub async fn check_large_request(
        &self,
        config: &AlertConfig,
        api_key_id: &str,
        total_tokens: i64,
    ) -> Result<Option<AlertEvent>> {
        if total_tokens > config.single_request_token_threshold {
            let event = AlertEvent {
                id: Uuid::new_v4().to_string(),
                api_key_id: Some(api_key_id.to_string()),
                alert_type: "large_request".to_string(),
                severity: "warning".to_string(),
                title: "大额请求提醒".to_string(),
                message: format!("单次请求使用 {} tokens，超过阈值 {}", 
                    total_tokens, config.single_request_token_threshold),
                triggered_at: Utc::now().to_rfc3339(),
                acknowledged_at: None,
            };
            self.save_alert(&event).await?;
            return Ok(Some(event));
        }

        Ok(None)
    }

    async fn save_alert(&self, event: &AlertEvent) -> Result<()> {
        sqlx::query(
            "INSERT INTO alert_events 
             (id, api_key_id, alert_type, severity, title, message, triggered_at, acknowledged_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
        )
        .bind(&event.id)
        .bind(&event.api_key_id)
        .bind(&event.alert_type)
        .bind(&event.severity)
        .bind(&event.title)
        .bind(&event.message)
        .bind(&event.triggered_at)
        .bind(&event.acknowledged_at)
        .execute(&self.pool)
        .await?;

        info!("Alert saved: {} - {}", event.alert_type, event.title);

        // Try to trigger system notification if app_handle is set
        if let Some(handle) = &*self.app_handle.read().await {
            if let Err(e) = handle.notification()
                .builder()
                .title(&event.title)
                .body(&event.message)
                .show() {
                error!("Failed to send desktop notification: {}", e);
            }
        }

        Ok(())
    }

    pub async fn get_unacknowledged_alerts(&self) -> Result<Vec<AlertEvent>> {
        let alerts: Vec<AlertEvent> = sqlx::query_as(
            "SELECT id, api_key_id, alert_type, severity, title, message, triggered_at, acknowledged_at
             FROM alert_events 
             WHERE acknowledged_at IS NULL
             ORDER BY triggered_at DESC
             LIMIT 50"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(alerts)
    }

    pub async fn acknowledge_alert(&self, alert_id: &str) -> Result<()> {
        sqlx::query(
            "UPDATE alert_events SET acknowledged_at = ?1 WHERE id = ?2"
        )
        .bind(Utc::now().to_rfc3339())
        .bind(alert_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

use tauri::{command, State, Manager};
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::*;
use crate::db::Database;
use crate::keychain::KeychainService;
use crate::services::{
    balance_poller::BalancePoller,
    usage_aggregator::UsageAggregator,
    settings_service::SettingsService,
    alert_engine::AlertEngine,
};
use crate::proxy::LocalProxy;

pub struct AppState {
    pub db: Arc<Database>,
    pub keychain: Arc<KeychainService>,
    pub balance_poller: Arc<BalancePoller>,
    pub usage_aggregator: Arc<UsageAggregator>,
    pub settings_service: Arc<SettingsService>,
    pub alert_engine: Arc<AlertEngine>,
    pub proxy: Arc<LocalProxy>,
    pub active_api_key_id: Arc<RwLock<String>>,
    pub app_settings: Arc<RwLock<AppSettings>>,
}

#[command]
pub async fn get_dashboard_summary(state: State<'_, AppState>) -> Result<DashboardSummary, String> {
    let active_key_id = state.active_api_key_id.read().await.clone();
    
    // Query latest CNY snapshot from SQLite
    let balance_cny: Option<BalanceSnapshot> = sqlx::query_as(
        "SELECT id, api_key_id, captured_at, is_available, currency, total_balance, granted_balance, topped_up_balance 
         FROM balance_snapshots 
         WHERE api_key_id = ?1 AND currency = 'CNY' 
         ORDER BY captured_at DESC LIMIT 1"
    )
    .bind(&active_key_id)
    .fetch_optional(state.db.pool())
    .await
    .ok()
    .flatten();

    // Query latest USD snapshot from SQLite
    let balance_usd: Option<BalanceSnapshot> = sqlx::query_as(
        "SELECT id, api_key_id, captured_at, is_available, currency, total_balance, granted_balance, topped_up_balance 
         FROM balance_snapshots 
         WHERE api_key_id = ?1 AND currency = 'USD' 
         ORDER BY captured_at DESC LIMIT 1"
    )
    .bind(&active_key_id)
    .fetch_optional(state.db.pool())
    .await
    .ok()
    .flatten();

    let balance = balance_cny.clone().or(balance_usd.clone());
    
    let (today_requests, today_prompt, today_completion, today_total, today_cost) = 
        state.usage_aggregator.get_today_stats(&active_key_id).await
            .map_err(|e| e.to_string())?;
    
    let last_hour_cost = state.usage_aggregator.get_last_hour_cost(&active_key_id).await
        .map_err(|e| e.to_string())?;
    
    let proxy_status = state.proxy.get_status().await
        .map_err(|e| e.to_string())?;
    
    let status = if balance.is_some() {
        "normal".to_string()
    } else {
        "offline".to_string()
    };

    Ok(DashboardSummary {
        balance,
        balance_cny,
        balance_usd,
        today_requests,
        today_prompt_tokens: today_prompt,
        today_completion_tokens: today_completion,
        today_total_tokens: today_total,
        today_estimated_cost: today_cost,
        last_hour_cost,
        proxy_status,
        last_refresh: Some(chrono::Utc::now().to_rfc3339()),
        status,
    })
}

#[command]
pub async fn get_balance(state: State<'_, AppState>) -> Result<BalanceSnapshot, String> {
    state.balance_poller.refresh_now().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_usage_stats(
    state: State<'_, AppState>,
    range: TimeRange,
) -> Result<UsageStats, String> {
    let active_key_id = state.active_api_key_id.read().await.clone();
    state.usage_aggregator.get_usage_stats(&active_key_id, &range).await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn save_api_key(
    state: State<'_, AppState>,
    alias: String,
    api_key: String,
) -> Result<(), String> {
    let key_id = uuid::Uuid::new_v4().to_string();
    let fingerprint = format!("sk-********************{}", &api_key[api_key.len().saturating_sub(4)..]);
    
    state.keychain.save_api_key(&key_id, &api_key)
        .map_err(|e| e.to_string())?;
    
    let keychain_ref = KeychainService::generate_keychain_ref(&key_id);
    
    // First, set all other keys to is_active = 0 in database
    sqlx::query("UPDATE api_keys SET is_active = 0")
        .execute(state.db.pool())
        .await
        .map_err(|e| e.to_string())?;
    
    sqlx::query(
        "INSERT INTO api_keys (id, alias, provider, key_fingerprint, keychain_ref, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    )
    .bind(&key_id)
    .bind(&alias)
    .bind("deepseek")
    .bind(&fingerprint)
    .bind(&keychain_ref)
    .bind(1i32) // Set new key to active
    .bind(chrono::Utc::now().to_rfc3339())
    .bind(chrono::Utc::now().to_rfc3339())
    .execute(state.db.pool())
    .await
    .map_err(|e| e.to_string())?;
    
    let mut active_id = state.active_api_key_id.write().await;
    *active_id = key_id;
    
    Ok(())
}

#[command]
pub async fn list_api_keys(state: State<'_, AppState>) -> Result<Vec<ApiKeyMeta>, String> {
    // Return all keys, sorted by creation time
    let keys: Vec<ApiKeyMeta> = sqlx::query_as(
        "SELECT id, alias, provider, key_fingerprint, currency, is_active, created_at, updated_at
         FROM api_keys ORDER BY created_at DESC"
    )
    .fetch_all(state.db.pool())
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(keys)
}

#[command]
pub async fn delete_api_key(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Attempt keychain deletion first
    let _ = state.keychain.delete_api_key(&id);
    
    // Physically delete key from database
    sqlx::query("DELETE FROM api_keys WHERE id = ?1")
        .bind(&id)
        .execute(state.db.pool())
        .await
        .map_err(|e| e.to_string())?;

    let mut active_id = state.active_api_key_id.write().await;
    if *active_id == id {
        // Find another key to activate if any exist
        let next_active = sqlx::query_scalar::<_, String>(
            "SELECT id FROM api_keys ORDER BY created_at DESC LIMIT 1"
        )
        .fetch_optional(state.db.pool())
        .await
        .map_err(|e| e.to_string())?;
        
        if let Some(next_id) = next_active {
            sqlx::query("UPDATE api_keys SET is_active = 1 WHERE id = ?1")
                .bind(&next_id)
                .execute(state.db.pool())
                .await
                .map_err(|e| e.to_string())?;
            *active_id = next_id;
        } else {
            *active_id = String::new();
        }
    }
    
    Ok(())
}

#[command]
pub async fn set_active_api_key(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Check if the key exists
    let key_exists = sqlx::query_scalar::<_, i32>(
        "SELECT COUNT(*) FROM api_keys WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(state.db.pool())
    .await
    .map_err(|e| e.to_string())? > 0;
    
    if !key_exists {
        return Err("API Key not found".to_string());
    }

    // Set all other keys to inactive
    sqlx::query("UPDATE api_keys SET is_active = 0")
        .execute(state.db.pool())
        .await
        .map_err(|e| e.to_string())?;
        
    // Set the selected key to active
    sqlx::query("UPDATE api_keys SET is_active = 1 WHERE id = ?1")
        .bind(&id)
        .execute(state.db.pool())
        .await
        .map_err(|e| e.to_string())?;

    let mut active_id = state.active_api_key_id.write().await;
    *active_id = id;
    
    Ok(())
}

#[command]
pub async fn start_proxy(state: State<'_, AppState>) -> Result<ProxyStatus, String> {
    let config = state.settings_service.get_proxy_config().await
        .map_err(|e| e.to_string())?;
    
    state.proxy.update_config(config).await;
    state.proxy.start().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn stop_proxy(state: State<'_, AppState>) -> Result<(), String> {
    state.proxy.stop().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_proxy_status(state: State<'_, AppState>) -> Result<ProxyStatus, String> {
    state.proxy.get_status().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_alert_config(state: State<'_, AppState>) -> Result<AlertConfig, String> {
    state.settings_service.get_alert_config().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn set_alert_config(
    state: State<'_, AppState>,
    config: AlertConfig,
) -> Result<(), String> {
    let mut settings = state.app_settings.write().await;
    settings.low_balance_threshold = config.low_balance_threshold;
    settings.hourly_cost_threshold = config.hourly_cost_threshold;
    settings.single_request_token_threshold = config.single_request_token_threshold;
    settings.notify_on_401 = config.notify_on_401;
    settings.notify_on_429 = config.notify_on_429;
    settings.notify_on_503 = config.notify_on_503;
    drop(settings);
    
    let settings = state.app_settings.read().await.clone();
    state.settings_service.save_settings(&settings).await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn get_alert_events(state: State<'_, AppState>) -> Result<Vec<AlertEvent>, String> {
    state.alert_engine.get_unacknowledged_alerts().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn acknowledge_alert(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state.alert_engine.acknowledge_alert(&id).await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    state.settings_service.get_settings().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn set_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    state.settings_service.save_settings(&settings).await
        .map_err(|e| e.to_string())?;
    
    let mut app_settings = state.app_settings.write().await;
    *app_settings = settings;
    
    Ok(())
}

#[command]
pub async fn refresh_balance(state: State<'_, AppState>) -> Result<BalanceSnapshot, String> {
    state.balance_poller.refresh_now().await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn export_usage(
    state: State<'_, AppState>,
    format: String,
    range: TimeRange,
) -> Result<String, String> {
    let active_key_id = state.active_api_key_id.read().await.clone();
    
    let logs: Vec<RequestLog> = sqlx::query_as(
        "SELECT id, api_key_id, source_name, provider, endpoint, method, model,
         request_started_at, request_finished_at, duration_ms, status_code, success, stream,
         prompt_tokens, completion_tokens, total_tokens,
         prompt_cache_hit_tokens, prompt_cache_miss_tokens, reasoning_tokens,
         estimated_cost, currency, usage_captured, usage_missing_reason
         FROM request_logs 
         WHERE api_key_id = ?1 AND request_started_at >= ?2 AND request_started_at < ?3"
    )
    .bind(&active_key_id)
    .bind(&range.start)
    .bind(&range.end)
    .fetch_all(state.db.pool())
    .await
    .map_err(|e| e.to_string())?;
    
    match format.as_str() {
        "json" => {
            serde_json::to_string(&logs).map_err(|e| e.to_string())
        }
        "csv" => {
            let mut csv = String::from("id,api_key_id,source_name,model,request_started_at,duration_ms,status_code,success,prompt_tokens,completion_tokens,total_tokens,estimated_cost,currency\n");
            for log in logs {
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
                    log.id, log.api_key_id,
                    log.source_name.unwrap_or_default(),
                    log.model.unwrap_or_default(),
                    log.request_started_at,
                    log.duration_ms.unwrap_or(0),
                    log.status_code.unwrap_or(0),
                    log.success,
                    log.prompt_tokens.unwrap_or(0),
                    log.completion_tokens.unwrap_or(0),
                    log.total_tokens.unwrap_or(0),
                    log.estimated_cost.unwrap_or_default(),
                    log.currency.unwrap_or_default()
                ));
            }
            Ok(csv)
        }
        _ => Err("Unsupported format".to_string()),
    }
}

#[command]
pub async fn toggle_mini_window(app_handle: tauri::AppHandle, show: bool) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("mini") {
        if show {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        } else {
            window.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[command]
pub async fn toggle_main_window(app_handle: tauri::AppHandle, show: bool) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if show {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        } else {
            window.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}


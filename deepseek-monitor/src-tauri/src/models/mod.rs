use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiKeyMeta {
    pub id: String,
    pub alias: String,
    pub provider: String,
    pub key_fingerprint: String,
    pub currency: Option<String>,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BalanceSnapshot {
    pub id: String,
    pub api_key_id: String,
    pub captured_at: String,
    pub is_available: bool,
    pub currency: String,
    pub total_balance: String,
    pub granted_balance: String,
    pub topped_up_balance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekBalanceResponse {
    pub is_available: bool,
    pub balance_infos: Vec<BalanceInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceInfo {
    pub currency: String,
    pub total_balance: String,
    pub granted_balance: String,
    pub topped_up_balance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RequestLog {
    pub id: String,
    pub api_key_id: String,
    pub source_name: Option<String>,
    pub provider: String,
    pub endpoint: String,
    pub method: String,
    pub model: Option<String>,
    pub request_started_at: String,
    pub request_finished_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub status_code: Option<i32>,
    pub success: i32,
    pub stream: i32,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
    pub prompt_cache_hit_tokens: Option<i64>,
    pub prompt_cache_miss_tokens: Option<i64>,
    pub reasoning_tokens: Option<i64>,
    pub estimated_cost: Option<String>,
    pub currency: Option<String>,
    pub usage_captured: i32,
    pub usage_missing_reason: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DailyUsage {
    pub id: String,
    pub api_key_id: String,
    pub usage_date: String,
    pub source_name: Option<String>,
    pub model: Option<String>,
    pub request_count: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub reasoning_tokens: i64,
    pub estimated_cost: Option<String>,
    pub currency: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PriceRule {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub currency: String,
    pub input_price_per_million: String,
    pub cache_hit_input_price_per_million: Option<String>,
    pub output_price_per_million: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub balance_refresh_interval_seconds: i64,
    pub startup_on_login: bool,
    pub show_tray_icon: bool,
    pub default_currency: String,
    pub timezone: String,
    pub proxy_enabled: bool,
    pub proxy_host: String,
    pub proxy_port: i32,
    pub proxy_require_token: bool,
    pub proxy_token: String,
    pub inject_stream_usage: bool,
    pub max_body_size_mb: i32,
    pub max_concurrent_requests: i32,
    pub store_prompt_body: bool,
    pub store_completion_body: bool,
    pub store_request_hash: bool,
    pub redact_headers: bool,
    pub keep_raw_error_body: bool,
    pub low_balance_threshold: String,
    pub hourly_cost_threshold: String,
    pub single_request_token_threshold: i64,
    pub notify_on_401: bool,
    pub notify_on_429: bool,
    pub notify_on_503: bool,
    pub enable_system_notification: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AlertEvent {
    pub id: String,
    pub api_key_id: Option<String>,
    pub alert_type: String,
    pub severity: String,
    pub title: String,
    pub message: String,
    pub triggered_at: String,
    pub acknowledged_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub balance: Option<BalanceSnapshot>,
    pub balance_cny: Option<BalanceSnapshot>,
    pub balance_usd: Option<BalanceSnapshot>,
    pub today_requests: i64,
    pub today_prompt_tokens: i64,
    pub today_completion_tokens: i64,
    pub today_total_tokens: i64,
    pub today_estimated_cost: String,
    pub last_hour_cost: String,
    pub proxy_status: ProxyStatus,
    pub last_refresh: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub enabled: bool,
    pub running: bool,
    pub host: String,
    pub port: i32,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub total_requests: i64,
    pub total_prompt_tokens: i64,
    pub total_completion_tokens: i64,
    pub total_tokens: i64,
    pub total_estimated_cost: String,
    pub by_model: Vec<ModelStat>,
    pub by_source: Vec<SourceStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ModelStat {
    pub model: String,
    pub request_count: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub estimated_cost: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SourceStat {
    pub source_name: String,
    pub request_count: i64,
    pub estimated_cost: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub host: String,
    pub port: i32,
    pub require_token: bool,
    pub token: String,
    pub inject_stream_usage: bool,
    pub max_body_size_mb: i32,
    pub max_concurrent_requests: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    pub low_balance_threshold: String,
    pub hourly_cost_threshold: String,
    pub single_request_token_threshold: i64,
    pub notify_on_401: bool,
    pub notify_on_429: bool,
    pub notify_on_503: bool,
}

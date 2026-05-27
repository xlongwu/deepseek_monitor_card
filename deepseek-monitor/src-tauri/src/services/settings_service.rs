use sqlx::SqlitePool;
use anyhow::Result;
use crate::models::{AppSettings, ProxyConfig, AlertConfig};

pub struct SettingsService {
    pool: SqlitePool,
}

impl SettingsService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get_settings(&self) -> Result<AppSettings> {
        let rows: Vec<(String, String)> = sqlx::query_as("SELECT key, value FROM app_settings")
            .fetch_all(&self.pool)
            .await?;

        let mut settings = Self::default_settings();
        
        for (key, value) in rows {
            match key.as_str() {
                "balance_refresh_interval_seconds" => {
                    settings.balance_refresh_interval_seconds = value.parse().unwrap_or(60)
                }
                "startup_on_login" => settings.startup_on_login = value == "true",
                "show_tray_icon" => settings.show_tray_icon = value == "true",
                "default_currency" => settings.default_currency = value,
                "timezone" => settings.timezone = value,
                "proxy_enabled" => settings.proxy_enabled = value == "true",
                "proxy_host" => settings.proxy_host = value,
                "proxy_port" => settings.proxy_port = value.parse().unwrap_or(8787),
                "proxy_require_token" => settings.proxy_require_token = value == "true",
                "proxy_token" => settings.proxy_token = value,
                "inject_stream_usage" => settings.inject_stream_usage = value == "true",
                "max_body_size_mb" => settings.max_body_size_mb = value.parse().unwrap_or(20),
                "max_concurrent_requests" => settings.max_concurrent_requests = value.parse().unwrap_or(32),
                "store_prompt_body" => settings.store_prompt_body = value == "true",
                "store_completion_body" => settings.store_completion_body = value == "true",
                "store_request_hash" => settings.store_request_hash = value == "true",
                "redact_headers" => settings.redact_headers = value == "true",
                "keep_raw_error_body" => settings.keep_raw_error_body = value == "true",
                "low_balance_threshold" => settings.low_balance_threshold = value,
                "hourly_cost_threshold" => settings.hourly_cost_threshold = value,
                "single_request_token_threshold" => {
                    settings.single_request_token_threshold = value.parse().unwrap_or(100000)
                }
                "notify_on_401" => settings.notify_on_401 = value == "true",
                "notify_on_429" => settings.notify_on_429 = value == "true",
                "notify_on_503" => settings.notify_on_503 = value == "true",
                "enable_system_notification" => settings.enable_system_notification = value == "true",
                _ => {}
            }
        }

        Ok(settings)
    }

    pub async fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let settings_map = vec![
            ("balance_refresh_interval_seconds", settings.balance_refresh_interval_seconds.to_string()),
            ("startup_on_login", settings.startup_on_login.to_string()),
            ("show_tray_icon", settings.show_tray_icon.to_string()),
            ("default_currency", settings.default_currency.clone()),
            ("timezone", settings.timezone.clone()),
            ("proxy_enabled", settings.proxy_enabled.to_string()),
            ("proxy_host", settings.proxy_host.clone()),
            ("proxy_port", settings.proxy_port.to_string()),
            ("proxy_require_token", settings.proxy_require_token.to_string()),
            ("proxy_token", settings.proxy_token.clone()),
            ("inject_stream_usage", settings.inject_stream_usage.to_string()),
            ("max_body_size_mb", settings.max_body_size_mb.to_string()),
            ("max_concurrent_requests", settings.max_concurrent_requests.to_string()),
            ("store_prompt_body", settings.store_prompt_body.to_string()),
            ("store_completion_body", settings.store_completion_body.to_string()),
            ("store_request_hash", settings.store_request_hash.to_string()),
            ("redact_headers", settings.redact_headers.to_string()),
            ("keep_raw_error_body", settings.keep_raw_error_body.to_string()),
            ("low_balance_threshold", settings.low_balance_threshold.clone()),
            ("hourly_cost_threshold", settings.hourly_cost_threshold.clone()),
            ("single_request_token_threshold", settings.single_request_token_threshold.to_string()),
            ("notify_on_401", settings.notify_on_401.to_string()),
            ("notify_on_429", settings.notify_on_429.to_string()),
            ("notify_on_503", settings.notify_on_503.to_string()),
            ("enable_system_notification", settings.enable_system_notification.to_string()),
        ];

        for (key, value) in settings_map {
            sqlx::query(
                "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
            )
            .bind(key)
            .bind(&value)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn get_proxy_config(&self) -> Result<ProxyConfig> {
        let settings = self.get_settings().await?;
        Ok(ProxyConfig {
            enabled: settings.proxy_enabled,
            host: settings.proxy_host,
            port: settings.proxy_port,
            require_token: settings.proxy_require_token,
            token: settings.proxy_token,
            inject_stream_usage: settings.inject_stream_usage,
            max_body_size_mb: settings.max_body_size_mb,
            max_concurrent_requests: settings.max_concurrent_requests,
        })
    }

    pub async fn get_alert_config(&self) -> Result<AlertConfig> {
        let settings = self.get_settings().await?;
        Ok(AlertConfig {
            low_balance_threshold: settings.low_balance_threshold,
            hourly_cost_threshold: settings.hourly_cost_threshold,
            single_request_token_threshold: settings.single_request_token_threshold,
            notify_on_401: settings.notify_on_401,
            notify_on_429: settings.notify_on_429,
            notify_on_503: settings.notify_on_503,
        })
    }

    fn default_settings() -> AppSettings {
        let secure_token = format!("sk-local-{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
        AppSettings {
            balance_refresh_interval_seconds: 60,
            startup_on_login: true,
            show_tray_icon: true,
            default_currency: "CNY".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            proxy_enabled: true,
            proxy_host: "127.0.0.1".to_string(),
            proxy_port: 8787,
            proxy_require_token: true,
            proxy_token: secure_token,
            inject_stream_usage: true,
            max_body_size_mb: 20,
            max_concurrent_requests: 32,
            store_prompt_body: false,
            store_completion_body: false,
            store_request_hash: true,
            redact_headers: true,
            keep_raw_error_body: false,
            low_balance_threshold: "10.00".to_string(),
            hourly_cost_threshold: "5.00".to_string(),
            single_request_token_threshold: 100000,
            notify_on_401: true,
            notify_on_429: true,
            notify_on_503: true,
            enable_system_notification: true,
        }
    }
}

#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::Manager;

mod commands;
mod db;
mod models;
mod services;
mod proxy;
mod keychain;

use commands::AppState;
use db::{Database, get_db_path};
use keychain::KeychainService;
use services::{
    balance_poller::BalancePoller,
    usage_aggregator::UsageAggregator,
    settings_service::SettingsService,
    alert_engine::AlertEngine,
};
use proxy::LocalProxy;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_path = get_db_path();
    let db = Arc::new(Database::new(db_path).await?);
    let pool = db.pool().clone();

    let settings_service = Arc::new(SettingsService::new(pool.clone()));
    let settings = settings_service.get_settings().await?;
    let app_settings = Arc::new(RwLock::new(settings.clone()));

    let keychain = Arc::new(KeychainService::new());
    let usage_aggregator = Arc::new(UsageAggregator::new(pool.clone()));
    let alert_engine = Arc::new(AlertEngine::new(pool.clone()));

    let initial_active_key_id = sqlx::query_scalar::<_, String>(
        "SELECT id FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(db.pool())
    .await?
    .unwrap_or_default();
    let active_api_key_id = Arc::new(RwLock::new(initial_active_key_id));

    let proxy_config = settings_service.get_proxy_config().await?;
    let proxy = Arc::new(LocalProxy::new(
        proxy_config,
        usage_aggregator.clone(),
        keychain.clone(),
        active_api_key_id.clone(),
        db.clone(),
        alert_engine.clone(),
    ));

    let balance_poller = Arc::new(BalancePoller::new(
        pool.clone(),
        app_settings.clone(),
        active_api_key_id.clone(),
        alert_engine.clone(),
    ));

    let app_state = AppState {
        db: db.clone(),
        keychain: keychain.clone(),
        balance_poller: balance_poller.clone(),
        usage_aggregator: usage_aggregator.clone(),
        settings_service: settings_service.clone(),
        alert_engine: alert_engine.clone(),
        proxy: proxy.clone(),
        active_api_key_id: active_api_key_id.clone(),
        app_settings: app_settings.clone(),
    };

    // Load last balance snapshot from database on startup and start background poller loop
    let poller_clone = balance_poller.clone();
    tokio::spawn(async move {
        let _ = poller_clone.load_last_snapshot_from_db().await;
        poller_clone.start().await;
    });

    if settings.proxy_enabled {
        let proxy_clone = proxy.clone();
        tokio::spawn(async move {
            proxy_clone.start().await.ok();
        });
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(app_state)
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Link AlertEngine with AppHandle for native system alerts
            let state = handle.state::<AppState>();
            let alert_engine = state.alert_engine.clone();
            let handle_clone = handle.clone();
            tauri::async_runtime::spawn(async move {
                alert_engine.set_app_handle(handle_clone).await;
            });
            
            let show_i = tauri::menu::MenuItem::with_id(
                &handle,
                "show",
                "显示主窗口",
                true,
                None::<&str>,
            )?;
            let refresh_i = tauri::menu::MenuItem::with_id(
                &handle,
                "refresh",
                "刷新余额",
                true,
                None::<&str>,
            )?;
            let quit_i = tauri::menu::MenuItem::with_id(
                &handle,
                "quit",
                "退出",
                true,
                None::<&str>,
            )?;
            
            let menu = tauri::menu::Menu::with_items(
                &handle,
                &[
                    &show_i,
                    &refresh_i,
                    &tauri::menu::PredefinedMenuItem::separator(&handle)?,
                    &quit_i,
                ],
            )?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "refresh" => {
                        let state = app.state::<AppState>();
                        let poller = state.balance_poller.clone();
                        tauri::async_runtime::spawn(async move {
                            poller.refresh_now().await.ok();
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_dashboard_summary,
            commands::get_balance,
            commands::get_usage_stats,
            commands::save_api_key,
            commands::list_api_keys,
            commands::delete_api_key,
            commands::set_active_api_key,
            commands::start_proxy,
            commands::stop_proxy,
            commands::get_proxy_status,
            commands::get_alert_config,
            commands::set_alert_config,
            commands::get_alert_events,
            commands::acknowledge_alert,
            commands::get_settings,
            commands::set_settings,
            commands::refresh_balance,
            commands::export_usage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

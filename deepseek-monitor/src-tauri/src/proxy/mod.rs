use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{oneshot, RwLock};
use tower::ServiceBuilder;
use tower_http::limit::RequestBodyLimitLayer;
use anyhow::Result;
use log::{info, error};
use chrono::Utc;
use uuid::Uuid;
use futures_util::StreamExt;

use crate::models::{ProxyConfig, ProxyStatus, RequestLog};
use crate::services::usage_aggregator::UsageAggregator;
use crate::keychain::KeychainService;

#[derive(Clone)]
pub struct ProxyState {
    pub config: Arc<RwLock<ProxyConfig>>,
    pub usage_aggregator: Arc<UsageAggregator>,
    pub keychain: Arc<KeychainService>,
    pub active_api_key_id: Arc<RwLock<String>>,
    pub db: Arc<crate::db::Database>,
    pub alert_engine: Arc<crate::services::alert_engine::AlertEngine>,
}

pub struct LocalProxy {
    state: ProxyState,
    running: Arc<RwLock<bool>>,
    current_port: Arc<RwLock<Option<i32>>>,
    shutdown_tx: Arc<RwLock<Option<oneshot::Sender<()>>>>,
}

impl LocalProxy {
    pub fn new(
        config: ProxyConfig,
        usage_aggregator: Arc<UsageAggregator>,
        keychain: Arc<KeychainService>,
        active_api_key_id: Arc<RwLock<String>>,
        db: Arc<crate::db::Database>,
        alert_engine: Arc<crate::services::alert_engine::AlertEngine>,
    ) -> Self {
        Self {
            state: ProxyState {
                config: Arc::new(RwLock::new(config)),
                usage_aggregator,
                keychain,
                active_api_key_id,
                db,
                alert_engine,
            },
            running: Arc::new(RwLock::new(false)),
            current_port: Arc::new(RwLock::new(None)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn start(&self) -> Result<ProxyStatus> {
        let mut running = self.running.write().await;
        if *running {
            return self.get_status().await;
        }

        let config = self.state.config.read().await.clone();
        let host = config.host.clone();
        let port = self.find_available_port(host.as_str(), config.port).await?;
        
        let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
        let listener = TcpListener::bind(addr).await?;
        
        let app = self.create_router().await;
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        
        *running = true;
        *self.current_port.write().await = Some(port);
        *self.shutdown_tx.write().await = Some(shutdown_tx);
        drop(running);
        
        let listener_clone = listener;
        let running_clone = self.running.clone();
        let current_port_clone = self.current_port.clone();
        
        tokio::spawn(async move {
            axum::serve(listener_clone, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
            let mut r = running_clone.write().await;
            *r = false;
            let mut current_port = current_port_clone.write().await;
            *current_port = None;
        });

        info!("Local proxy started on http://{}:{}", host, port);
        
        Ok(ProxyStatus {
            enabled: config.enabled,
            running: true,
            host: host.clone(),
            port,
            url: format!("http://{}:{}", host, port),
        })
    }

    pub async fn stop(&self) -> Result<()> {
        if let Some(shutdown_tx) = self.shutdown_tx.write().await.take() {
            let _ = shutdown_tx.send(());
        }
        let mut running = self.running.write().await;
        *running = false;
        let mut current_port = self.current_port.write().await;
        *current_port = None;
        info!("Local proxy stopped");
        Ok(())
    }

    pub async fn get_status(&self) -> Result<ProxyStatus> {
        let config = self.state.config.read().await.clone();
        let running = *self.running.read().await;
        let port = self.current_port.read().await.unwrap_or(config.port);
        
        Ok(ProxyStatus {
            enabled: config.enabled,
            running,
            host: config.host.clone(),
            port,
            url: format!("http://{}:{}", config.host, port),
        })
    }

    pub async fn update_config(&self, config: ProxyConfig) {
        let mut cfg = self.state.config.write().await;
        *cfg = config;
    }

    async fn find_available_port(&self, host: &str, start_port: i32) -> Result<i32> {
        for port in start_port..=start_port + 10 {
            let addr: SocketAddr = format!("{}:{}", host, port).parse()?;
            match TcpListener::bind(addr).await {
                Ok(listener) => {
                    drop(listener);
                    return Ok(port);
                }
                Err(_) => continue,
            }
        }
        anyhow::bail!("No available port found in range {}-{}", start_port, start_port + 10)
    }

    async fn create_router(&self) -> Router {
        let state = self.state.clone();
        let config = state.config.read().await.clone();
        let body_limit = config.max_body_size_mb as usize * 1024 * 1024;

        Router::new()
            .route("/chat/completions", post(handle_chat_completions))
            .route("/v1/chat/completions", post(handle_chat_completions))
            .route("/anthropic/v1/messages", post(handle_anthropic_messages))
            .route("/v1/messages", post(handle_anthropic_messages))
            .route("/models", get(handle_models))
            .route("/v1/models", get(handle_models))
            .route("/user/balance", get(handle_balance))
            .layer(ServiceBuilder::new().layer(RequestBodyLimitLayer::new(body_limit)))
            .with_state(state)
    }
}

async fn handle_chat_completions(
    state: State<ProxyState>,
    headers: HeaderMap,
    request: Request<Body>,
) -> impl IntoResponse {
    let deepseek_url = "https://api.deepseek.com/chat/completions";
    forward_proxy_request(state, headers, request, deepseek_url, "/chat/completions").await
}

async fn handle_anthropic_messages(
    state: State<ProxyState>,
    headers: HeaderMap,
    request: Request<Body>,
) -> impl IntoResponse {
    let deepseek_url = "https://api.deepseek.com/anthropic/v1/messages";
    forward_proxy_request(state, headers, request, deepseek_url, "/anthropic/v1/messages").await
}

async fn forward_proxy_request(
    State(state): State<ProxyState>,
    headers: HeaderMap,
    request: Request<Body>,
    target_url: &str,
    endpoint: &str,
) -> Response {
    let start_time = Utc::now();
    let request_id = Uuid::new_v4().to_string();
    
    let config = state.config.read().await.clone();
    
    if config.require_token {
        let token = headers.get("X-Local-Proxy-Token")
            .and_then(|v| v.to_str().ok());
        if token != Some(&config.token) {
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body(Body::from(json!({"error": "Invalid proxy token"}).to_string()))
                .unwrap();
        }
    }

    let body_bytes = match axum::body::to_bytes(request.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from(json!({"error": "Failed to read request body"}).to_string()))
                .unwrap();
        }
    };

    let mut body_json: Value = match serde_json::from_slice(&body_bytes) {
        Ok(json) => json,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from(json!({"error": "Invalid JSON"}).to_string()))
                .unwrap();
        }
    };

    let is_stream = body_json.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);
    
    if is_stream && config.inject_stream_usage {
        if let Some(stream_options) = body_json.get_mut("stream_options") {
            if let Some(obj) = stream_options.as_object_mut() {
                obj.insert("include_usage".to_string(), json!(true));
            }
        } else {
            body_json["stream_options"] = json!({"include_usage": true});
        }
    }

    let api_key_id = state.active_api_key_id.read().await.clone();
    let api_key = match state.keychain.get_api_key(&api_key_id) {
        Ok(key) => key,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(json!({
                    "error": {
                        "message": "Failed to read API key from keychain",
                        "type": "local_proxy_error",
                        "code": "KEYCHAIN_READ_FAILED"
                    }
                }).to_string()))
                .unwrap();
        }
    };

    let client = reqwest::Client::new();
    
    let source_name = headers.get("X-Client-Name")
        .and_then(|v| v.to_str().ok())
        .or_else(|| headers.get("User-Agent").and_then(|v| v.to_str().ok()))
        .unwrap_or("unknown")
        .to_string();

    let model = body_json.get("model").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();

    let response = match client.post(target_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body_json)
        .send()
        .await {
        Ok(resp) => resp,
        Err(e) => {
            error!("Proxy request failed: {}", e);
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(json!({"error": "Failed to connect to DeepSeek API"}).to_string()))
                .unwrap();
        }
    };

    let status = response.status();
    let response_headers = response.headers().clone();
    
    // Check and trigger API Error Alerts for status codes 401, 429, 503
    let status_code_u16 = status.as_u16();
    if status_code_u16 == 401 || status_code_u16 == 429 || status_code_u16 == 503 {
        let alert_engine = state.alert_engine.clone();
        let api_key_id_clone = api_key_id.clone();
        let pool = state.db.pool().clone();
        tokio::spawn(async move {
            let s = sqlx::query_as::<_, (String, String)>("SELECT key, value FROM app_settings")
                .fetch_all(&pool)
                .await;
            if let Ok(rows) = s {
                let mut notify_401 = true;
                let mut notify_429 = true;
                let mut notify_503 = true;
                for (k, v) in rows {
                    match k.as_str() {
                        "notify_on_401" => notify_401 = v == "true",
                        "notify_on_429" => notify_429 = v == "true",
                        "notify_on_503" => notify_503 = v == "true",
                        _ => {}
                    }
                }
                let alert_config = crate::models::AlertConfig {
                    low_balance_threshold: "10.00".to_string(),
                    hourly_cost_threshold: "5.00".to_string(),
                    single_request_token_threshold: 100000,
                    notify_on_401: notify_401,
                    notify_on_429: notify_429,
                    notify_on_503: notify_503,
                };
                let _ = alert_engine.check_api_error(&alert_config, &api_key_id_clone, status_code_u16).await;
            }
        });
    }

    if is_stream {
        let mut inner_stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut captured_usage: Option<Value> = None;
        
        let state_clone = state.clone();
        let model_clone = model.clone();
        let api_key_id_clone = api_key_id.clone();
        let source_name_clone = source_name.clone();
        let request_id_clone = request_id.clone();
        let endpoint_clone = endpoint.to_string();

        let interceptor_stream = async_stream::try_stream! {
            while let Some(chunk_result) = inner_stream.next().await {
                let bytes = chunk_result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
                yield bytes.clone();
                
                if let Ok(text) = std::str::from_utf8(&bytes) {
                    buffer.push_str(text);
                    while let Some(pos) = buffer.find('\n') {
                        let line = buffer[..pos].trim().to_string();
                        buffer = buffer[pos + 1..].to_string();
                        
                        if line.starts_with("data: ") {
                            let payload = line["data: ".len()..].trim();
                            if payload != "[DONE]" {
                                if let Ok(val) = serde_json::from_str::<Value>(payload) {
                                    if let Some(usage) = val.get("usage") {
                                        captured_usage = Some(usage.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Stream succeeded, complete logging and trigger alerts
            let duration = (Utc::now() - start_time).num_milliseconds();
            let (prompt_tokens, completion_tokens, total_tokens) = if let Some(ref u) = captured_usage {
                (
                    u.get("prompt_tokens").or_else(|| u.get("input_tokens")).and_then(|v| v.as_i64()),
                    u.get("completion_tokens").or_else(|| u.get("output_tokens")).and_then(|v| v.as_i64()),
                    u.get("total_tokens").and_then(|v| v.as_i64()),
                )
            } else {
                (None, None, None)
            };
            
            let total_tokens_val = total_tokens.or_else(|| {
                if let (Some(p), Some(c)) = (prompt_tokens, completion_tokens) {
                    Some(p + c)
                } else {
                    None
                }
            });
            
            let estimated_cost = calculate_cost(&model_clone, prompt_tokens, completion_tokens, &state_clone).await;
            
            let log = RequestLog {
                id: request_id_clone.clone(),
                api_key_id: api_key_id_clone.clone(),
                source_name: Some(source_name_clone.clone()),
                provider: "deepseek".to_string(),
                endpoint: endpoint_clone.clone(),
                method: "POST".to_string(),
                model: Some(model_clone.clone()),
                request_started_at: start_time.to_rfc3339(),
                request_finished_at: Some(Utc::now().to_rfc3339()),
                duration_ms: Some(duration),
                status_code: Some(StatusCode::OK.as_u16() as i32),
                success: 1,
                stream: 1,
                prompt_tokens,
                completion_tokens,
                total_tokens: total_tokens_val,
                prompt_cache_hit_tokens: captured_usage.as_ref().and_then(|u| {
                    u.get("prompt_cache_hit_tokens").or_else(|| u.get("cache_read_input_tokens")).and_then(|v| v.as_i64())
                }),
                prompt_cache_miss_tokens: captured_usage.as_ref().and_then(|u| {
                    u.get("prompt_cache_miss_tokens").and_then(|v| v.as_i64())
                }),
                reasoning_tokens: captured_usage.as_ref().and_then(|u| {
                    u.get("completion_tokens_details")
                        .and_then(|d| d.get("reasoning_tokens"))
                        .or_else(|| u.get("reasoning_tokens"))
                        .and_then(|v| v.as_i64())
                }),
                estimated_cost: Some(estimated_cost.clone()),
                currency: Some("CNY".to_string()),
                usage_captured: if captured_usage.is_some() { 1 } else { 0 },
                usage_missing_reason: if captured_usage.is_none() { Some("Stream usage not found".to_string()) } else { None },
            };
            
            let aggregator = state_clone.usage_aggregator.clone();
            let alert_engine = state_clone.alert_engine.clone();
            let pool = state_clone.db.pool().clone();
            
            tokio::spawn(async move {
                let _ = aggregator.log_request(&log).await;
                
                // Fetch alert configs and run checks
                let s = sqlx::query_as::<_, (String, String)>("SELECT key, value FROM app_settings")
                    .fetch_all(&pool)
                    .await;
                if let Ok(rows) = s {
                    let mut low_balance = "10.00".to_string();
                    let mut hourly_cost = "5.00".to_string();
                    let mut single_token = 100000;
                    for (k, v) in rows {
                        match k.as_str() {
                            "low_balance_threshold" => low_balance = v,
                            "hourly_cost_threshold" => hourly_cost = v,
                            "single_request_token_threshold" => single_token = v.parse().unwrap_or(100000),
                            _ => {}
                        }
                    }
                    let alert_config = crate::models::AlertConfig {
                        low_balance_threshold: low_balance,
                        hourly_cost_threshold: hourly_cost,
                        single_request_token_threshold: single_token,
                        notify_on_401: true,
                        notify_on_429: true,
                        notify_on_503: true,
                    };
                    
                    if let Ok(cost) = aggregator.get_last_hour_cost(&api_key_id_clone).await {
                        let _ = alert_engine.check_hourly_cost(&alert_config, &api_key_id_clone, &cost).await;
                    }
                    
                    if let Some(tokens) = total_tokens_val {
                        let _ = alert_engine.check_large_request(&alert_config, &api_key_id_clone, tokens).await;
                    }
                }
            });
        };

        let mapped_stream = interceptor_stream.map(|res| -> Result<axum::body::Bytes, std::io::Error> { res });
        let body = Body::from_stream(mapped_stream);
        let mut response_builder = Response::builder().status(status);
        for (key, value) in response_headers.iter() {
            if let Ok(name) = key.as_str().parse::<axum::http::HeaderName>() {
                response_builder = response_builder.header(name, value.clone());
            }
        }
        response_builder.body(body).unwrap()
    } else {
        let response_bytes = match response.bytes().await {
            Ok(bytes) => bytes,
            Err(_) => {
                return Response::builder()
                    .status(StatusCode::BAD_GATEWAY)
                    .body(Body::from(json!({"error": "Failed to read response"}).to_string()))
                    .unwrap();
            }
        };

        let response_json: Value = match serde_json::from_slice(&response_bytes) {
            Ok(json) => json,
            Err(_) => {
                return Response::builder()
                    .status(status)
                    .body(Body::from(response_bytes))
                    .unwrap();
            }
        };

        let usage = response_json.get("usage").cloned();
        let usage_exists = usage.is_some();
        
        let (prompt_tokens, completion_tokens, total_tokens) = if let Some(ref u) = usage {
            let input = u.get("prompt_tokens").or_else(|| u.get("input_tokens")).and_then(|v| v.as_i64());
            let output = u.get("completion_tokens").or_else(|| u.get("output_tokens")).and_then(|v| v.as_i64());
            let total = u.get("total_tokens").and_then(|v| v.as_i64()).or_else(|| {
                if let (Some(i), Some(o)) = (input, output) {
                    Some(i + o)
                } else {
                    None
                }
            });
            (input, output, total)
        } else {
            (None, None, None)
        };

        let estimated_cost = calculate_cost(&model, prompt_tokens, completion_tokens, &state).await;

        let log = RequestLog {
            id: request_id,
            api_key_id: api_key_id.clone(),
            source_name: Some(source_name),
            provider: "deepseek".to_string(),
            endpoint: endpoint.to_string(),
            method: "POST".to_string(),
            model: Some(model),
            request_started_at: start_time.to_rfc3339(),
            request_finished_at: Some(Utc::now().to_rfc3339()),
            duration_ms: Some((Utc::now() - start_time).num_milliseconds()),
            status_code: Some(status.as_u16() as i32),
            success: if status.is_success() { 1 } else { 0 },
            stream: 0,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            prompt_cache_hit_tokens: usage.as_ref().and_then(|u| {
                u.get("prompt_cache_hit_tokens").or_else(|| u.get("cache_read_input_tokens")).and_then(|v| v.as_i64())
            }),
            prompt_cache_miss_tokens: usage.as_ref().and_then(|u| {
                u.get("prompt_cache_miss_tokens").and_then(|v| v.as_i64())
            }),
            reasoning_tokens: usage.as_ref().and_then(|u| {
                u.get("completion_tokens_details")
                    .and_then(|d| d.get("reasoning_tokens"))
                    .or_else(|| u.get("reasoning_tokens"))
                    .and_then(|v| v.as_i64())
            }),
            estimated_cost: Some(estimated_cost),
            currency: Some("CNY".to_string()),
            usage_captured: if usage_exists { 1 } else { 0 },
            usage_missing_reason: if !usage_exists { Some("No usage in response".to_string()) } else { None },
        };

        let aggregator = state.usage_aggregator.clone();
        let alert_engine = state.alert_engine.clone();
        let pool = state.db.pool().clone();
        let api_key_id_clone = api_key_id.clone();
        let total_tokens_val = total_tokens;

        tokio::spawn(async move {
            let _ = aggregator.log_request(&log).await;
            
            // Check alerts
            let s = sqlx::query_as::<_, (String, String)>("SELECT key, value FROM app_settings")
                .fetch_all(&pool)
                .await;
            if let Ok(rows) = s {
                let mut low_balance = "10.00".to_string();
                let mut hourly_cost = "5.00".to_string();
                let mut single_token = 100000;
                for (k, v) in rows {
                    match k.as_str() {
                        "low_balance_threshold" => low_balance = v,
                        "hourly_cost_threshold" => hourly_cost = v,
                        "single_request_token_threshold" => single_token = v.parse().unwrap_or(100000),
                        _ => {}
                    }
                }
                let alert_config = crate::models::AlertConfig {
                    low_balance_threshold: low_balance,
                    hourly_cost_threshold: hourly_cost,
                    single_request_token_threshold: single_token,
                    notify_on_401: true,
                    notify_on_429: true,
                    notify_on_503: true,
                };
                
                if let Ok(cost) = aggregator.get_last_hour_cost(&api_key_id_clone).await {
                    let _ = alert_engine.check_hourly_cost(&alert_config, &api_key_id_clone, &cost).await;
                }
                
                if let Some(tokens) = total_tokens_val {
                    let _ = alert_engine.check_large_request(&alert_config, &api_key_id_clone, tokens).await;
                }
            }
        });

        let mut response_builder = Response::builder().status(status);
        for (key, value) in response_headers.iter() {
            if let Ok(name) = key.as_str().parse::<axum::http::HeaderName>() {
                response_builder = response_builder.header(name, value.clone());
            }
        }
        response_builder.body(Body::from(response_bytes)).unwrap()
    }
}

async fn handle_models(State(_state): State<ProxyState>) -> impl IntoResponse {
    let client = reqwest::Client::new();
    
    match client.get("https://api.deepseek.com/models")
        .send()
        .await {
        Ok(response) => {
            let status = response.status();
            let body = response.bytes().await.unwrap_or_default();
            Response::builder()
                .status(status)
                .header("Content-Type", "application/json")
                .body(Body::from(body))
                .unwrap()
        }
        Err(_) => {
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(json!({"error": "Failed to fetch models"}).to_string()))
                .unwrap()
        }
    }
}

async fn handle_balance(State(state): State<ProxyState>) -> impl IntoResponse {
    let api_key_id = state.active_api_key_id.read().await.clone();
    let api_key = match state.keychain.get_api_key(&api_key_id) {
        Ok(key) => key,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(json!({
                    "error": {
                        "message": "Failed to read API key from keychain",
                        "type": "local_proxy_error",
                        "code": "KEYCHAIN_READ_FAILED"
                    }
                }).to_string()))
                .unwrap();
        }
    };

    let client = reqwest::Client::new();
    match client.get("https://api.deepseek.com/user/balance")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await {
        Ok(response) => {
            let status = response.status();
            let body = response.bytes().await.unwrap_or_default();
            Response::builder()
                .status(status)
                .header("Content-Type", "application/json")
                .body(Body::from(body))
                .unwrap()
        }
        Err(_) => {
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(json!({"error": "Failed to fetch balance"}).to_string()))
                .unwrap()
        }
    }
}

async fn calculate_cost(
    model: &str,
    prompt_tokens: Option<i64>,
    completion_tokens: Option<i64>,
    state: &ProxyState,
) -> String {
    // Query database for dynamic price rule
    let db_rule: Option<(String, String)> = sqlx::query_as(
        "SELECT input_price_per_million, output_price_per_million 
         FROM price_rules 
         WHERE provider = 'deepseek' AND model = ?1 
         LIMIT 1"
    )
    .bind(model)
    .fetch_optional(state.db.pool())
    .await
    .ok()
    .flatten();

    let (input_price, output_price) = if let Some((input_str, output_str)) = db_rule {
        (
            input_str.parse::<f64>().unwrap_or(1.0),
            output_str.parse::<f64>().unwrap_or(2.0),
        )
    } else {
        // Fallback pricing
        let input = match model {
            "deepseek-chat" => 1.0,
            "deepseek-coder" => 1.0,
            "deepseek-reasoner" => 4.0,
            _ => 1.0,
        };
        let output = match model {
            "deepseek-chat" => 2.0,
            "deepseek-coder" => 2.0,
            "deepseek-reasoner" => 16.0,
            _ => 2.0,
        };
        (input, output)
    };

    let input_cost = prompt_tokens.unwrap_or(0) as f64 / 1_000_000.0 * input_price;
    let output_cost = completion_tokens.unwrap_or(0) as f64 / 1_000_000.0 * output_price;
    let total = input_cost + output_cost;

    format!("{:.6}", total)
}

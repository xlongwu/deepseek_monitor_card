export interface ApiKeyMeta {
  id: string;
  alias: string;
  provider: string;
  key_fingerprint: string;
  currency?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceSnapshot {
  id: string;
  api_key_id: string;
  captured_at: string;
  is_available: boolean;
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface RequestLog {
  id: string;
  api_key_id: string;
  source_name?: string;
  provider: string;
  endpoint: string;
  method: string;
  model?: string;
  request_started_at: string;
  request_finished_at?: string;
  duration_ms?: number;
  status_code?: number;
  success: boolean;
  stream: boolean;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  reasoning_tokens?: number;
  estimated_cost?: string;
  currency?: string;
  usage_captured: boolean;
  usage_missing_reason?: string;
}

export interface DailyUsage {
  id: string;
  api_key_id: string;
  usage_date: string;
  source_name?: string;
  model?: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  estimated_cost?: string;
  currency?: string;
}

export interface PriceRule {
  id: string;
  provider: string;
  model: string;
  currency: string;
  input_price_per_million: string;
  cache_hit_input_price_per_million?: string;
  output_price_per_million: string;
}

export interface AppSettings {
  balance_refresh_interval_seconds: number;
  startup_on_login: boolean;
  show_tray_icon: boolean;
  default_currency: string;
  timezone: string;
  proxy_enabled: boolean;
  proxy_host: string;
  proxy_port: number;
  proxy_require_token: boolean;
  proxy_token: string;
  inject_stream_usage: boolean;
  max_body_size_mb: number;
  max_concurrent_requests: number;
  store_prompt_body: boolean;
  store_completion_body: boolean;
  store_request_hash: boolean;
  redact_headers: boolean;
  keep_raw_error_body: boolean;
  low_balance_threshold: string;
  hourly_cost_threshold: string;
  single_request_token_threshold: number;
  notify_on_401: boolean;
  notify_on_429: boolean;
  notify_on_503: boolean;
  enable_system_notification: boolean;
}

export interface AlertEvent {
  id: string;
  api_key_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  triggered_at: string;
  acknowledged_at?: string;
}

export interface DashboardSummary {
  balance?: BalanceSnapshot;
  balance_cny?: BalanceSnapshot;
  balance_usd?: BalanceSnapshot;
  today_requests: number;
  today_prompt_tokens: number;
  today_completion_tokens: number;
  today_total_tokens: number;
  today_estimated_cost: string;
  last_hour_cost: string;
  today_estimated_cost_cny: string;
  today_estimated_cost_usd: string;
  last_hour_cost_cny: string;
  last_hour_cost_usd: string;
  proxy_status: ProxyStatus;
  last_refresh?: string;
  status: string;
}

export interface ProxyStatus {
  enabled: boolean;
  running: boolean;
  host: string;
  port: number;
  url: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface UsageStats {
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_estimated_cost: string;
  total_estimated_cost_cny: string;
  total_estimated_cost_usd: string;
  by_model: ModelStat[];
  by_source: SourceStat[];
}

export interface ModelStat {
  model: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: string;
}

export interface SourceStat {
  source_name: string;
  request_count: number;
  estimated_cost: string;
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  require_token: boolean;
  token: string;
  inject_stream_usage: boolean;
  max_body_size_mb: number;
  max_concurrent_requests: number;
}

export interface AlertConfig {
  low_balance_threshold: string;
  hourly_cost_threshold: string;
  single_request_token_threshold: number;
  notify_on_401: boolean;
  notify_on_429: boolean;
  notify_on_503: boolean;
}

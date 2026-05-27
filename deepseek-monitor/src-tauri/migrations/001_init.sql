-- Migration: 001_init
-- Description: Initialize all tables for DeepSeek Monitor

-- API Keys metadata (actual keys stored in OS keychain)
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'deepseek',
    key_fingerprint TEXT NOT NULL,
    keychain_ref TEXT NOT NULL,
    currency TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Balance snapshots from DeepSeek API
CREATE TABLE IF NOT EXISTS balance_snapshots (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    is_available INTEGER NOT NULL,
    currency TEXT NOT NULL,
    total_balance TEXT NOT NULL,
    granted_balance TEXT NOT NULL,
    topped_up_balance TEXT NOT NULL,
    raw_json TEXT,
    error_code TEXT,
    error_message TEXT,
    FOREIGN KEY(api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_balance_snapshots_time
ON balance_snapshots(api_key_id, captured_at);

-- Request logs captured by local proxy
CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    source_name TEXT,
    provider TEXT NOT NULL DEFAULT 'deepseek',
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    model TEXT,
    request_started_at TEXT NOT NULL,
    request_finished_at TEXT,
    duration_ms INTEGER,
    status_code INTEGER,
    success INTEGER NOT NULL DEFAULT 0,
    stream INTEGER NOT NULL DEFAULT 0,

    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    prompt_cache_hit_tokens INTEGER,
    prompt_cache_miss_tokens INTEGER,
    reasoning_tokens INTEGER,

    estimated_cost TEXT,
    currency TEXT,
    usage_captured INTEGER NOT NULL DEFAULT 0,
    usage_missing_reason TEXT,

    request_hash TEXT,
    error_code TEXT,
    error_message TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_request_logs_time
ON request_logs(api_key_id, request_started_at);

CREATE INDEX IF NOT EXISTS idx_request_logs_model
ON request_logs(api_key_id, model, request_started_at);

CREATE INDEX IF NOT EXISTS idx_request_logs_source
ON request_logs(api_key_id, source_name, request_started_at);

-- Daily usage materialized table for fast queries
CREATE TABLE IF NOT EXISTS daily_usage (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    usage_date TEXT NOT NULL,
    source_name TEXT,
    model TEXT,
    request_count INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost TEXT,
    currency TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(api_key_id, usage_date, source_name, model)
);

-- Price rules for cost estimation
CREATE TABLE IF NOT EXISTS price_rules (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'deepseek',
    model TEXT NOT NULL,
    currency TEXT NOT NULL,
    input_price_per_million TEXT NOT NULL,
    cache_hit_input_price_per_million TEXT,
    output_price_per_million TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    source_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Application settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Alert events
CREATE TABLE IF NOT EXISTS alert_events (
    id TEXT PRIMARY KEY,
    api_key_id TEXT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TEXT NOT NULL,
    acknowledged_at TEXT,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_events_time
ON alert_events(triggered_at);

CREATE INDEX IF NOT EXISTS idx_alert_events_ack
ON alert_events(acknowledged_at);

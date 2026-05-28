-- Migration: 002_seed_data
-- Description: Seed default settings and price rules

-- Default application settings
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
('balance_refresh_interval_seconds', '0', datetime('now')),
('startup_on_login', 'false', datetime('now')),
('show_tray_icon', 'true', datetime('now')),
('default_currency', 'CNY', datetime('now')),
('timezone', 'Asia/Shanghai', datetime('now')),
('proxy_enabled', 'false', datetime('now')),
('proxy_host', '127.0.0.1', datetime('now')),
('proxy_port', '8787', datetime('now')),
('proxy_require_token', 'true', datetime('now')),
('proxy_token', 'auto-generate', datetime('now')),
('inject_stream_usage', 'true', datetime('now')),
('max_body_size_mb', '20', datetime('now')),
('max_concurrent_requests', '32', datetime('now')),
('store_prompt_body', 'false', datetime('now')),
('store_completion_body', 'false', datetime('now')),
('store_request_hash', 'true', datetime('now')),
('redact_headers', 'true', datetime('now')),
('keep_raw_error_body', 'false', datetime('now')),
('low_balance_threshold', '10.00', datetime('now')),
('hourly_cost_threshold', '5.00', datetime('now')),
('single_request_token_threshold', '100000', datetime('now')),
('notify_on_401', 'true', datetime('now')),
('notify_on_429', 'true', datetime('now')),
('notify_on_503', 'true', datetime('now')),
('enable_system_notification', 'true', datetime('now'));

-- Default DeepSeek price rules (CNY & USD)
-- Note: These contain official pricing for prompt cache hit/miss and output tokens.
INSERT OR IGNORE INTO price_rules (id, provider, model, currency, input_price_per_million, cache_hit_input_price_per_million, output_price_per_million, effective_from, source_url, created_at, updated_at) VALUES
-- CNY Rules
('price-cny-chat', 'deepseek', 'deepseek-chat', 'CNY', '1.00', '0.50', '2.00', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-cny-coder', 'deepseek', 'deepseek-coder', 'CNY', '1.00', '0.50', '2.00', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-cny-reasoner', 'deepseek', 'deepseek-reasoner', 'CNY', '4.00', '1.00', '16.00', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-cny-v4-flash', 'deepseek', 'deepseek-v4-flash', 'CNY', '0.50', '0.10', '1.00', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-cny-v4-pro', 'deepseek', 'deepseek-v4-pro', 'CNY', '2.00', '1.00', '8.00', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
-- USD Rules
('price-usd-chat', 'deepseek', 'deepseek-chat', 'USD', '0.14', '0.07', '0.28', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-usd-coder', 'deepseek', 'deepseek-coder', 'USD', '0.14', '0.07', '0.28', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-usd-reasoner', 'deepseek', 'deepseek-reasoner', 'USD', '0.55', '0.14', '2.19', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-usd-v4-flash', 'deepseek', 'deepseek-v4-flash', 'USD', '0.07', '0.015', '0.14', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now')),
('price-usd-v4-pro', 'deepseek', 'deepseek-v4-pro', 'USD', '0.28', '0.14', '1.10', '2024-01-01', 'https://api-docs.deepseek.com/zh-cn/', datetime('now'), datetime('now'));

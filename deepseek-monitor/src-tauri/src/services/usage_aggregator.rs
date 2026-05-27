use sqlx::SqlitePool;
use anyhow::Result;
use chrono::{Utc, Duration};
use crate::models::{RequestLog, UsageStats, TimeRange, ModelStat, SourceStat};

pub struct UsageAggregator {
    pool: SqlitePool,
}

impl UsageAggregator {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn log_request(&self, log: &RequestLog) -> Result<()> {
        sqlx::query(
            "INSERT INTO request_logs 
             (id, api_key_id, source_name, provider, endpoint, method, model, 
              request_started_at, request_finished_at, duration_ms, status_code, success, stream,
              prompt_tokens, completion_tokens, total_tokens, 
              prompt_cache_hit_tokens, prompt_cache_miss_tokens, reasoning_tokens,
              estimated_cost, currency, usage_captured, usage_missing_reason, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)"
        )
        .bind(&log.id)
        .bind(&log.api_key_id)
        .bind(&log.source_name)
        .bind(&log.provider)
        .bind(&log.endpoint)
        .bind(&log.method)
        .bind(&log.model)
        .bind(&log.request_started_at)
        .bind(&log.request_finished_at)
        .bind(log.duration_ms)
        .bind(log.status_code)
        .bind(log.success)
        .bind(log.stream)
        .bind(log.prompt_tokens)
        .bind(log.completion_tokens)
        .bind(log.total_tokens)
        .bind(log.prompt_cache_hit_tokens)
        .bind(log.prompt_cache_miss_tokens)
        .bind(log.reasoning_tokens)
        .bind(&log.estimated_cost)
        .bind(&log.currency)
        .bind(log.usage_captured)
        .bind(&log.usage_missing_reason)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;

        self.update_daily_usage(log).await?;
        
        Ok(())
    }

    async fn update_daily_usage(&self, log: &RequestLog) -> Result<()> {
        let date = log.request_started_at.split('T').next()
            .unwrap_or(&log.request_started_at)
            .to_string();
        
        let source = log.source_name.as_deref().unwrap_or("unknown");
        let model = log.model.as_deref().unwrap_or("unknown");
        
        sqlx::query(
            "INSERT INTO daily_usage 
             (id, api_key_id, usage_date, source_name, model, request_count, 
              prompt_tokens, completion_tokens, total_tokens, reasoning_tokens, 
              estimated_cost, currency, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(api_key_id, usage_date, source_name, model) DO UPDATE SET
             request_count = request_count + 1,
             prompt_tokens = prompt_tokens + excluded.prompt_tokens,
             completion_tokens = completion_tokens + excluded.completion_tokens,
             total_tokens = total_tokens + excluded.total_tokens,
             reasoning_tokens = reasoning_tokens + excluded.reasoning_tokens,
             estimated_cost = CAST(COALESCE(estimated_cost, '0') AS DECIMAL) + CAST(COALESCE(excluded.estimated_cost, '0') AS DECIMAL),
             updated_at = excluded.updated_at"
        )
        .bind(&log.id)
        .bind(&log.api_key_id)
        .bind(&date)
        .bind(source)
        .bind(model)
        .bind(log.prompt_tokens.unwrap_or(0))
        .bind(log.completion_tokens.unwrap_or(0))
        .bind(log.total_tokens.unwrap_or(0))
        .bind(log.reasoning_tokens.unwrap_or(0))
        .bind(&log.estimated_cost)
        .bind(&log.currency)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_today_stats(&self, api_key_id: &str) -> Result<(i64, i64, i64, i64, String)> {
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let tomorrow = (Utc::now() + Duration::days(1)).format("%Y-%m-%d").to_string();

        let row: (i64, i64, i64, i64, Option<String>) = sqlx::query_as(
            "SELECT 
                COUNT(*) as request_count,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) as completion_tokens,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                SUM(CAST(COALESCE(estimated_cost, '0') AS DECIMAL)) as estimated_cost
             FROM request_logs 
             WHERE api_key_id = ?1 
               AND request_started_at >= ?2 
               AND request_started_at < ?3"
        )
        .bind(api_key_id)
        .bind(&today)
        .bind(&tomorrow)
        .fetch_one(&self.pool)
        .await?;

        Ok((row.0, row.1, row.2, row.3, row.4.unwrap_or_else(|| "0.00".to_string())))
    }

    pub async fn get_last_hour_cost(&self, api_key_id: &str) -> Result<String> {
        let one_hour_ago = (Utc::now() - Duration::hours(1)).to_rfc3339();

        let cost: Option<String> = sqlx::query_scalar(
            "SELECT SUM(CAST(COALESCE(estimated_cost, '0') AS DECIMAL)) 
             FROM request_logs 
             WHERE api_key_id = ?1 AND request_started_at >= ?2"
        )
        .bind(api_key_id)
        .bind(&one_hour_ago)
        .fetch_one(&self.pool)
        .await?;

        Ok(cost.unwrap_or_else(|| "0.00".to_string()))
    }

    pub async fn get_usage_stats(&self, api_key_id: &str, range: &TimeRange) -> Result<UsageStats> {
        let total: (i64, i64, i64, i64, Option<String>) = sqlx::query_as(
            "SELECT 
                COUNT(*) as request_count,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) as completion_tokens,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                SUM(CAST(COALESCE(estimated_cost, '0') AS DECIMAL)) as estimated_cost
             FROM request_logs 
             WHERE api_key_id = ?1 
               AND request_started_at >= ?2 
               AND request_started_at < ?3"
        )
        .bind(api_key_id)
        .bind(&range.start)
        .bind(&range.end)
        .fetch_one(&self.pool)
        .await?;

        let by_model: Vec<ModelStat> = sqlx::query_as(
            "SELECT 
                COALESCE(model, 'unknown') as model,
                COUNT(*) as request_count,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) as completion_tokens,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                SUM(CAST(COALESCE(estimated_cost, '0') AS DECIMAL)) as estimated_cost
             FROM request_logs 
             WHERE api_key_id = ?1 
               AND request_started_at >= ?2 
               AND request_started_at < ?3
             GROUP BY model
             ORDER BY estimated_cost DESC"
        )
        .bind(api_key_id)
        .bind(&range.start)
        .bind(&range.end)
        .fetch_all(&self.pool)
        .await?;

        let by_source: Vec<SourceStat> = sqlx::query_as(
            "SELECT 
                COALESCE(source_name, 'unknown') as source_name,
                COUNT(*) as request_count,
                SUM(CAST(COALESCE(estimated_cost, '0') AS DECIMAL)) as estimated_cost
             FROM request_logs 
             WHERE api_key_id = ?1 
               AND request_started_at >= ?2 
               AND request_started_at < ?3
             GROUP BY source_name
             ORDER BY request_count DESC"
        )
        .bind(api_key_id)
        .bind(&range.start)
        .bind(&range.end)
        .fetch_all(&self.pool)
        .await?;

        Ok(UsageStats {
            total_requests: total.0,
            total_prompt_tokens: total.1,
            total_completion_tokens: total.2,
            total_tokens: total.3,
            total_estimated_cost: total.4.unwrap_or_else(|| "0.00".to_string()),
            by_model,
            by_source,
        })
    }
}

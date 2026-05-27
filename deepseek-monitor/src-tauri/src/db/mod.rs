use sqlx::{sqlite::{SqliteConnectOptions, SqlitePoolOptions}, Pool, Sqlite};
use std::path::PathBuf;
use anyhow::Result;

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(db_path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists first
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let connect_options = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .foreign_keys(true);
        
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(connect_options)
            .await?;

        let db = Self { pool };
        db.run_migrations().await?;
        
        Ok(db)
    }

    async fn run_migrations(&self) -> Result<()> {
        let migrations = [
            include_str!("../../migrations/001_init.sql"),
            include_str!("../../migrations/002_seed_data.sql"),
        ];

        for (idx, migration) in migrations.iter().enumerate() {
            if idx == 0 {
                let init_applied: bool = sqlx::query_scalar::<_, i32>(
                    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'api_keys'"
                )
                .fetch_optional(&self.pool)
                .await?
                .is_some();
                
                if init_applied {
                    continue;
                }
            } else if idx == 1 {
                let settings_seeded: bool = sqlx::query_scalar::<_, i32>(
                    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_settings'"
                )
                .fetch_optional(&self.pool)
                .await?
                .is_some() && 
                sqlx::query_scalar::<_, i32>(
                    "SELECT COUNT(*) FROM app_settings"
                )
                .fetch_one(&self.pool)
                .await? > 0;

                if settings_seeded {
                    continue;
                }
            }

            sqlx::query(migration)
                .execute(&self.pool)
                .await?;
        }

        // Self-healing migration: Seed new CNY/USD pricing rules if they don't exist
        let new_rules = vec![
            ("price-cny-chat", "deepseek", "deepseek-chat", "CNY", "1.00", "0.50", "2.00"),
            ("price-cny-coder", "deepseek", "deepseek-coder", "CNY", "1.00", "0.50", "2.00"),
            ("price-cny-reasoner", "deepseek", "deepseek-reasoner", "CNY", "4.00", "1.00", "16.00"),
            ("price-cny-v4-flash", "deepseek", "deepseek-v4-flash", "CNY", "0.50", "0.10", "1.00"),
            ("price-cny-v4-pro", "deepseek", "deepseek-v4-pro", "CNY", "2.00", "1.00", "8.00"),
            ("price-usd-chat", "deepseek", "deepseek-chat", "USD", "0.14", "0.07", "0.28"),
            ("price-usd-coder", "deepseek", "deepseek-coder", "USD", "0.14", "0.07", "0.28"),
            ("price-usd-reasoner", "deepseek", "deepseek-reasoner", "USD", "0.55", "0.14", "2.19"),
            ("price-usd-v4-flash", "deepseek", "deepseek-v4-flash", "USD", "0.07", "0.015", "0.14"),
            ("price-usd-v4-pro", "deepseek", "deepseek-v4-pro", "USD", "0.28", "0.14", "1.10"),
        ];

        for rule in new_rules {
            sqlx::query(
                "INSERT OR IGNORE INTO price_rules 
                 (id, provider, model, currency, input_price_per_million, cache_hit_input_price_per_million, output_price_per_million, effective_from, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '2024-01-01', datetime('now'), datetime('now'))"
            )
            .bind(rule.0)
            .bind(rule.1)
            .bind(rule.2)
            .bind(rule.3)
            .bind(rule.4)
            .bind(rule.5)
            .bind(rule.6)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}

pub fn get_db_path() -> PathBuf {
    let app_dir = if cfg!(debug_assertions) {
        // Development mode: Use a local directory in the project folder
        std::env::current_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."))
            .join("data")
    } else {
        // Production mode: Use standard system AppData/Application Support directory
        dirs::data_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")))
            .join("com.deepseek.monitor")
    };
    
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("deepseek_monitor.db")
}

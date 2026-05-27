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

        Ok(())
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}

pub fn get_db_path() -> PathBuf {
    // Use a local directory in the project folder for development
    // This avoids permission issues with system directories
    let app_dir = std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("data");
    
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("deepseek_monitor.db")
}

use reqwest::Client;
use anyhow::{Result, Context};
use crate::models::{DeepSeekBalanceResponse, BalanceSnapshot};
use chrono::Utc;
use uuid::Uuid;

pub struct DeepSeekApiClient {
    client: Client,
    base_url: String,
}

impl DeepSeekApiClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "https://api.deepseek.com".to_string(),
        }
    }

    pub async fn get_balance(&self, api_key: &str) -> Result<DeepSeekBalanceResponse> {
        let response = self.client
            .get(format!("{}/user/balance", self.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .send()
            .await
            .context("Failed to send balance request")?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("DeepSeek API error: {} - {}", status, body);
        }

        let balance_response: DeepSeekBalanceResponse = response
            .json()
            .await
            .context("Failed to parse balance response")?;

        Ok(balance_response)
    }

    pub fn create_balance_snapshot(
        &self,
        api_key_id: &str,
        response: &DeepSeekBalanceResponse,
    ) -> Vec<BalanceSnapshot> {
        let now = Utc::now().to_rfc3339();
        
        response.balance_infos.iter().map(|info| {
            BalanceSnapshot {
                id: Uuid::new_v4().to_string(),
                api_key_id: api_key_id.to_string(),
                captured_at: now.clone(),
                is_available: response.is_available,
                currency: info.currency.clone(),
                total_balance: info.total_balance.clone(),
                granted_balance: info.granted_balance.clone(),
                topped_up_balance: info.topped_up_balance.clone(),
            }
        }).collect()
    }
}

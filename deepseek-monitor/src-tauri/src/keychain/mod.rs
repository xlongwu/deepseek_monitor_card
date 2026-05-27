use keyring::Entry;
use anyhow::{Result, Context};

const SERVICE_NAME: &str = "com.deepseek.monitor";

pub struct KeychainService;

impl KeychainService {
    pub fn new() -> Self {
        Self
    }

    pub fn save_api_key(&self, key_id: &str, api_key: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key_id)
            .context("Failed to create keychain entry")?;
        entry.set_password(api_key)
            .context("Failed to save API key to keychain")?;
        Ok(())
    }

    pub fn get_api_key(&self, key_id: &str) -> Result<String> {
        let entry = Entry::new(SERVICE_NAME, key_id)
            .context("Failed to create keychain entry")?;
        let password = entry.get_password()
            .context("Failed to read API key from keychain")?;
        Ok(password)
    }

    pub fn delete_api_key(&self, key_id: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key_id)
            .context("Failed to create keychain entry")?;
        entry.delete_credential()
            .context("Failed to delete API key from keychain")?;
        Ok(())
    }

    pub fn generate_keychain_ref(key_id: &str) -> String {
        format!("{}:{}", SERVICE_NAME, key_id)
    }
}

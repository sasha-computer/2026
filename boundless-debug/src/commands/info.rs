use crate::chain::ChainClient;
use crate::commands::Context;
use crate::explorer::ExplorerClient;
use crate::output;
use anyhow::Result;
use serde::Serialize;

#[derive(Debug, Serialize, serde::Deserialize)]
pub struct RequestInfo {
    // From Explorer API
    pub request_id: String,
    pub status: String,
    pub source: String,
    pub client_address: String,
    pub lock_prover: Option<String>,
    pub fulfill_prover: Option<String>,
    pub created_at_iso: String,
    pub min_price_formatted: String,
    pub max_price_formatted: String,

    // From chain
    pub image_id: Option<String>,
    pub image_url: Option<String>,
    pub input_type: Option<u8>,
    pub input_size_bytes: Option<usize>,
    pub timeout_seconds: Option<u32>,
}

impl std::fmt::Display for RequestInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Request: {}", self.request_id)?;
        writeln!(f, "Status: {}", self.status)?;
        writeln!(f, "Source: {}", self.source)?;
        writeln!(f, "Requestor: {}", self.client_address)?;

        if let Some(ref prover) = self.lock_prover {
            writeln!(f, "Locked by: {}", prover)?;
        }
        if let Some(ref prover) = self.fulfill_prover {
            writeln!(f, "Fulfilled by: {}", prover)?;
        }

        writeln!(f, "Created: {}", self.created_at_iso)?;
        writeln!(f, "Price range: {} - {}", self.min_price_formatted, self.max_price_formatted)?;

        if let Some(ref url) = self.image_url {
            writeln!(f, "Image URL: {}", url)?;
        }
        if let Some(ref id) = self.image_id {
            writeln!(f, "Image ID: {}", output::truncate_hex(id, 20))?;
        }
        if let Some(size) = self.input_size_bytes {
            writeln!(f, "Input size: {} bytes", size)?;
        }
        if let Some(timeout) = self.timeout_seconds {
            writeln!(f, "Timeout: {} seconds", timeout)?;
        }

        Ok(())
    }
}

pub async fn run(ctx: &Context, request_id: &str) -> Result<()> {
    output::info(&format!(
        "Fetching info for request {}...",
        output::truncate_hex(request_id, 20)
    ));

    // Fetch from Explorer API first (for status and formatted prices)
    let explorer = ExplorerClient::new();
    let explorer_data = explorer.get_request(request_id).await?;

    // Try to fetch from chain for full request data
    let chain_client = ChainClient::new(&ctx.rpc_url, &ctx.ipfs_gateway, ctx.pinata_jwt.clone());
    let chain_data = chain_client.get_request(request_id).await.ok();

    let info = if let Some(exp) = explorer_data {
        RequestInfo {
            request_id: exp.request_id,
            status: exp.request_status,
            source: exp.source,
            client_address: exp.client_address,
            lock_prover: exp.lock_prover_address,
            fulfill_prover: exp.fulfill_prover_address,
            created_at_iso: exp.created_at_iso,
            min_price_formatted: exp.min_price_formatted,
            max_price_formatted: exp.max_price_formatted,
            image_id: chain_data.as_ref().map(|c| c.image_id.clone()),
            image_url: chain_data.as_ref().map(|c| c.image_url.clone()),
            input_type: chain_data.as_ref().map(|c| c.input_type),
            input_size_bytes: chain_data
                .as_ref()
                .map(|c| c.input_data.len().saturating_sub(2) / 2),
            timeout_seconds: chain_data.as_ref().map(|c| c.timeout),
        }
    } else if let Some(chain) = chain_data {
        // Fallback to chain-only data
        RequestInfo {
            request_id: chain.request_id,
            status: "unknown".to_string(),
            source: "chain".to_string(),
            client_address: chain.client_address,
            lock_prover: None,
            fulfill_prover: None,
            created_at_iso: "N/A".to_string(),
            min_price_formatted: format!("{} wei", chain.min_price),
            max_price_formatted: format!("{} wei", chain.max_price),
            image_id: Some(chain.image_id),
            image_url: Some(chain.image_url),
            input_type: Some(chain.input_type),
            input_size_bytes: Some(chain.input_data.len().saturating_sub(2) / 2),
            timeout_seconds: Some(chain.timeout),
        }
    } else {
        anyhow::bail!("Request not found in Explorer API or on chain");
    };

    output::success("Request found");
    output::print_result(&info, ctx.json_output);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_request_info_full() -> RequestInfo {
        RequestInfo {
            request_id: "0x1234567890abcdef".to_string(),
            status: "fulfilled".to_string(),
            source: "explorer".to_string(),
            client_address: "0xabcdef1234567890".to_string(),
            lock_prover: Some("0xprover1".to_string()),
            fulfill_prover: Some("0xprover2".to_string()),
            created_at_iso: "2024-01-01T00:00:00Z".to_string(),
            min_price_formatted: "0.001 ETH".to_string(),
            max_price_formatted: "0.01 ETH".to_string(),
            image_id: Some("0ximage123".to_string()),
            image_url: Some("ipfs://QmTest".to_string()),
            input_type: Some(1),
            input_size_bytes: Some(256),
            timeout_seconds: Some(3600),
        }
    }

    fn sample_request_info_minimal() -> RequestInfo {
        RequestInfo {
            request_id: "0x123".to_string(),
            status: "pending".to_string(),
            source: "chain".to_string(),
            client_address: "0xabc".to_string(),
            lock_prover: None,
            fulfill_prover: None,
            created_at_iso: "2024-01-01".to_string(),
            min_price_formatted: "0.001 ETH".to_string(),
            max_price_formatted: "0.01 ETH".to_string(),
            image_id: None,
            image_url: None,
            input_type: None,
            input_size_bytes: None,
            timeout_seconds: None,
        }
    }

    #[test]
    fn test_request_info_display_full() {
        let info = sample_request_info_full();
        let display = format!("{}", info);

        assert!(display.contains("Request: 0x1234567890abcdef"));
        assert!(display.contains("Status: fulfilled"));
        assert!(display.contains("Locked by: 0xprover1"));
        assert!(display.contains("Fulfilled by: 0xprover2"));
        assert!(display.contains("Price range: 0.001 ETH - 0.01 ETH"));
        assert!(display.contains("Timeout: 3600 seconds"));
        assert!(display.contains("Image URL: ipfs://QmTest"));
    }

    #[test]
    fn test_request_info_display_minimal() {
        let info = sample_request_info_minimal();
        let display = format!("{}", info);

        // Should contain required fields
        assert!(display.contains("Request: 0x123"));
        assert!(display.contains("Status: pending"));
        assert!(display.contains("Source: chain"));

        // Should NOT contain optional fields when None
        assert!(!display.contains("Locked by:"));
        assert!(!display.contains("Fulfilled by:"));
        assert!(!display.contains("Image URL:"));
        assert!(!display.contains("Timeout:"));
    }

    #[test]
    fn test_request_info_json_serialization() {
        let info = sample_request_info_full();
        let json = serde_json::to_string_pretty(&info).expect("should serialize");

        assert!(json.contains("\"request_id\": \"0x1234567890abcdef\""));
        assert!(json.contains("\"status\": \"fulfilled\""));
        assert!(json.contains("\"timeout_seconds\": 3600"));
    }

    #[test]
    fn test_request_info_json_roundtrip() {
        let info = sample_request_info_full();
        let json = serde_json::to_string(&info).expect("should serialize");
        let parsed: RequestInfo = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(parsed.request_id, info.request_id);
        assert_eq!(parsed.status, info.status);
        assert_eq!(parsed.timeout_seconds, info.timeout_seconds);
        assert_eq!(parsed.lock_prover, info.lock_prover);
    }

    #[test]
    fn test_request_info_minimal_json_roundtrip() {
        let info = sample_request_info_minimal();
        let json = serde_json::to_string(&info).expect("should serialize");
        let parsed: RequestInfo = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(parsed.request_id, info.request_id);
        assert!(parsed.lock_prover.is_none());
        assert!(parsed.image_url.is_none());
    }
}

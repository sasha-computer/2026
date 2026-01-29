use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

const EXPLORER_BASE_URL: &str = "https://d2mdvlnmyov1e1.cloudfront.net";

/// Market request data from the Explorer API
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct MarketRequest {
    pub chain_id: u64,
    pub request_digest: String,
    pub request_id: String,
    pub request_status: String,
    pub source: String,
    pub client_address: String,
    pub lock_prover_address: Option<String>,
    pub fulfill_prover_address: Option<String>,
    pub created_at: u64,
    pub created_at_iso: String,
    pub min_price: String,
    pub min_price_formatted: String,
    pub max_price: String,
    pub max_price_formatted: String,
    pub lock_collateral: String,
    pub lock_collateral_formatted: String,
    // Request data fields (for offchain requests)
    pub image_id: Option<String>,
    pub image_url: Option<String>,
    pub input_type: Option<String>,
    pub input_data: Option<String>,
}

/// Response wrapper for paginated requests (used by list command)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketRequestsResponse {
    pub chain_id: u64,
    pub data: Vec<MarketRequest>,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

/// Explorer API client
pub struct ExplorerClient {
    client: reqwest::Client,
    base_url: String,
}

impl ExplorerClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .user_agent("boundless-debug/0.1.0")
            .build()
            .expect("failed to build HTTP client");

        Self {
            client,
            base_url: EXPLORER_BASE_URL.to_string(),
        }
    }

    /// Fetch a single request by ID from the Explorer API
    pub async fn get_request(&self, request_id: &str) -> Result<Option<MarketRequest>> {
        let url = format!("{}/v1/market/requests/{}", self.base_url, request_id);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .context("Failed to fetch from Explorer API")?;

        if response.status() == 404 {
            return Ok(None);
        }

        if !response.status().is_success() {
            anyhow::bail!(
                "Explorer API returned error: HTTP {}",
                response.status()
            );
        }

        let text = response
            .text()
            .await
            .context("Failed to read Explorer API response body")?;

        let requests: Vec<MarketRequest> = serde_json::from_str(&text)
            .with_context(|| format!("Failed to parse Explorer API response: {}", &text[..text.len().min(200)]))?;

        Ok(requests.into_iter().next())
    }

    /// Fetch requests for a specific requestor address (used by list command)
    #[allow(dead_code)]
    pub async fn get_requestor_requests(
        &self,
        address: &str,
        limit: Option<u32>,
    ) -> Result<Vec<MarketRequest>> {
        let mut url = format!(
            "{}/v1/market/requestors/{}/requests",
            self.base_url, address
        );

        if let Some(l) = limit {
            url.push_str(&format!("?limit={}", l));
        }

        let response: MarketRequestsResponse = self
            .client
            .get(&url)
            .send()
            .await
            .context("Failed to fetch from Explorer API")?
            .json()
            .await
            .context("Failed to parse Explorer API response")?;

        Ok(response.data)
    }
}

impl Default for ExplorerClient {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_API_RESPONSE: &str = r#"[{
        "chain_id": 8453,
        "request_digest": "0xabc123def456",
        "request_id": "0xdef456abc789",
        "request_status": "fulfilled",
        "source": "onchain",
        "client_address": "0x1234567890abcdef1234567890abcdef12345678",
        "lock_prover_address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "fulfill_prover_address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "created_at": 1704067200,
        "created_at_iso": "2024-01-01T00:00:00Z",
        "min_price": "1000000000000000",
        "min_price_formatted": "0.001 ETH",
        "max_price": "2000000000000000",
        "max_price_formatted": "0.002 ETH",
        "lock_collateral": "10000000000000000",
        "lock_collateral_formatted": "0.01 ETH"
    }]"#;

    #[test]
    fn test_parse_market_request() {
        let requests: Vec<MarketRequest> =
            serde_json::from_str(SAMPLE_API_RESPONSE).expect("should parse valid API response");

        assert_eq!(requests.len(), 1);
        let req = &requests[0];
        assert_eq!(req.chain_id, 8453);
        assert_eq!(req.request_status, "fulfilled");
        assert_eq!(req.min_price_formatted, "0.001 ETH");
    }

    #[test]
    fn test_parse_with_extra_fields() {
        // API returns fields we don't know about - should not fail
        let json = r#"[{
            "chain_id": 8453,
            "request_digest": "0x123",
            "request_id": "0x456",
            "request_status": "pending",
            "source": "portal",
            "client_address": "0xabc",
            "lock_prover_address": null,
            "fulfill_prover_address": null,
            "created_at": 0,
            "created_at_iso": "",
            "min_price": "0",
            "min_price_formatted": "0 ETH",
            "max_price": "0",
            "max_price_formatted": "0 ETH",
            "lock_collateral": "0",
            "lock_collateral_formatted": "0 ETH",
            "image_id": "0xunknown_field",
            "updated_at": 12345,
            "fulfill_seal": "0xseal",
            "some_future_field": "value"
        }]"#;

        let requests: Vec<MarketRequest> =
            serde_json::from_str(json).expect("should ignore unknown fields");

        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].chain_id, 8453);
        assert_eq!(requests[0].request_status, "pending");
    }

    #[test]
    fn test_parse_with_missing_fields() {
        // API omits some fields - should use defaults
        let json = r#"[{
            "chain_id": 8453,
            "request_id": "0x123",
            "request_status": "pending"
        }]"#;

        let requests: Vec<MarketRequest> =
            serde_json::from_str(json).expect("should use defaults for missing fields");

        assert_eq!(requests.len(), 1);
        let req = &requests[0];
        assert_eq!(req.chain_id, 8453);
        assert_eq!(req.source, ""); // default empty string
        assert_eq!(req.created_at, 0); // default 0
        assert!(req.lock_prover_address.is_none());
    }

    #[test]
    fn test_parse_empty_array() {
        let requests: Vec<MarketRequest> =
            serde_json::from_str("[]").expect("should parse empty array");
        assert!(requests.is_empty());
    }

    #[test]
    fn test_parse_null_prover_addresses() {
        let json = r#"[{
            "chain_id": 8453,
            "request_digest": "0x123",
            "request_id": "0x456",
            "request_status": "pending",
            "source": "portal",
            "client_address": "0xabc",
            "lock_prover_address": null,
            "fulfill_prover_address": null,
            "created_at": 0,
            "created_at_iso": "",
            "min_price": "0",
            "min_price_formatted": "0",
            "max_price": "0",
            "max_price_formatted": "0",
            "lock_collateral": "0",
            "lock_collateral_formatted": "0"
        }]"#;

        let requests: Vec<MarketRequest> = serde_json::from_str(json).unwrap();
        assert!(requests[0].lock_prover_address.is_none());
        assert!(requests[0].fulfill_prover_address.is_none());
    }

    #[test]
    fn test_market_request_serialization_roundtrip() {
        let request = MarketRequest {
            chain_id: 8453,
            request_digest: "0xabc".to_string(),
            request_id: "0xdef".to_string(),
            request_status: "fulfilled".to_string(),
            source: "test".to_string(),
            client_address: "0x123".to_string(),
            lock_prover_address: Some("0xprover".to_string()),
            fulfill_prover_address: None,
            created_at: 1000,
            created_at_iso: "2024-01-01".to_string(),
            min_price: "100".to_string(),
            min_price_formatted: "0.0001 ETH".to_string(),
            max_price: "200".to_string(),
            max_price_formatted: "0.0002 ETH".to_string(),
            lock_collateral: "50".to_string(),
            lock_collateral_formatted: "0.00005 ETH".to_string(),
        };

        let json = serde_json::to_string(&request).expect("should serialize");
        let parsed: MarketRequest = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(parsed.chain_id, request.chain_id);
        assert_eq!(parsed.request_status, request.request_status);
        assert_eq!(parsed.lock_prover_address, request.lock_prover_address);
    }
}

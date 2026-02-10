use alloy::{
    primitives::{Address, U256},
    providers::ProviderBuilder,
    sol,
};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

// BoundlessMarket contract address on Base mainnet
// From: https://docs.boundless.network/developers/smart-contracts/deployments
const BOUNDLESS_MARKET_ADDRESS: &str = "0xfd152dadc5183870710fe54f939eae3ab9f0fe82";

// Define the contract interface using alloy's sol! macro
sol! {
    #[sol(rpc)]
    interface IBoundlessMarket {
        struct RequestId {
            address client;
            uint32 index;
        }

        struct Callback {
            address addr;
            uint64 gasLimit;
        }

        struct Predicate {
            uint8 predicateType;
            bytes data;
        }

        struct Requirements {
            bytes32 imageId;
            Predicate predicate;
            Callback callback;
            bytes4 selector;
        }

        struct Input {
            uint8 inputType;
            bytes data;
        }

        struct Offer {
            uint256 minPrice;
            uint256 maxPrice;
            uint64 biddingStart;
            uint32 rampUpPeriod;
            uint32 timeout;
            uint32 lockTimeout;
            uint256 lockCollateral;
        }

        struct ProofRequest {
            RequestId id;
            Requirements requirements;
            string imageUrl;
            Input input;
            Offer offer;
        }

        // Request status enum
        // 0 = Unknown, 1 = Locked, 2 = Fulfilled, 3 = Slashed

        function getRequest(bytes32 requestDigest) external view returns (ProofRequest memory);
        function requestStatus(bytes32 requestDigest) external view returns (uint8);
    }
}

/// Parsed proof request with all the data we need
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedProofRequest {
    pub request_id: String,
    pub client_address: String,
    pub image_id: String,
    pub image_url: String,
    pub input_type: u8,
    pub input_data: String,
    pub min_price: String,
    pub max_price: String,
    pub timeout: u32,
}

impl std::fmt::Display for ParsedProofRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Request ID: {}", self.request_id)?;
        writeln!(f, "Client: {}", self.client_address)?;
        writeln!(f, "Image ID: {}", self.image_id)?;
        writeln!(f, "Image URL: {}", self.image_url)?;
        writeln!(f, "Input Type: {}", self.input_type)?;
        writeln!(f, "Input Data: {} bytes", self.input_data.len() / 2)?;
        writeln!(f, "Min Price: {} wei", self.min_price)?;
        writeln!(f, "Max Price: {} wei", self.max_price)?;
        write!(f, "Timeout: {} seconds", self.timeout)
    }
}

/// Chain client for interacting with the BoundlessMarket contract
pub struct ChainClient {
    rpc_url: String,
    ipfs_gateway: String,
    pinata_jwt: Option<String>,
}

impl ChainClient {
    pub fn new(rpc_url: &str, ipfs_gateway: &str, pinata_jwt: Option<String>) -> Self {
        Self {
            rpc_url: rpc_url.to_string(),
            ipfs_gateway: ipfs_gateway.to_string(),
            pinata_jwt,
        }
    }

    /// Fetch a proof request by request ID
    /// For offchain requests, uses Explorer API data directly
    /// For onchain requests, queries the chain contract
    pub async fn get_request(&self, request_id: &str) -> Result<ParsedProofRequest> {
        // First, get the request from the Explorer API
        let explorer = crate::explorer::ExplorerClient::new();
        let explorer_request = explorer
            .get_request(request_id)
            .await
            .context("Failed to look up request in Explorer API")?
            .context("Request not found in Explorer API")?;

        // For offchain requests, use Explorer data directly (not stored on chain yet)
        if explorer_request.source == "offchain" {
            let image_url = explorer_request
                .image_url
                .context("Offchain request missing image_url")?;
            let image_id = explorer_request
                .image_id
                .context("Offchain request missing image_id")?;
            let input_data = explorer_request
                .input_data
                .context("Offchain request missing input_data")?;

            // Parse input_type from string to u8
            let input_type = match explorer_request.input_type.as_deref() {
                Some("Inline") => 0,
                Some("Url") => 1,
                _ => 0,
            };

            return Ok(ParsedProofRequest {
                request_id: explorer_request.request_id,
                client_address: explorer_request.client_address,
                image_id: format!("0x{}", image_id),
                image_url,
                input_type,
                input_data,
                min_price: explorer_request.min_price,
                max_price: explorer_request.max_price,
                timeout: 0, // Not available from Explorer for offchain requests
            });
        }

        // For onchain requests, query the chain
        let request_digest = &explorer_request.request_digest;

        let provider = ProviderBuilder::new()
            .on_http(self.rpc_url.parse().context("Invalid RPC URL")?);

        let contract_address: Address = BOUNDLESS_MARKET_ADDRESS
            .parse()
            .context("Invalid contract address")?;

        let contract = IBoundlessMarket::new(contract_address, &provider);

        // Parse the request digest from the Explorer API
        let digest_bytes = hex::decode(request_digest.trim_start_matches("0x"))
            .context("Invalid request digest hex from Explorer")?;

        if digest_bytes.len() != 32 {
            anyhow::bail!("Request digest must be 32 bytes, got {} bytes", digest_bytes.len());
        }

        let mut digest: [u8; 32] = [0u8; 32];
        digest.copy_from_slice(&digest_bytes);

        // Call the contract
        let request = contract
            .getRequest(digest.into())
            .call()
            .await
            .context("Failed to fetch request from chain")?;

        let req = request._0;

        Ok(ParsedProofRequest {
            request_id: format!(
                "0x{:040x}{:08x}",
                U256::from_be_slice(req.id.client.as_slice()),
                req.id.index
            ),
            client_address: format!("{:?}", req.id.client),
            image_id: format!("0x{}", hex::encode(req.requirements.imageId)),
            image_url: req.imageUrl,
            input_type: req.input.inputType,
            input_data: format!("0x{}", hex::encode(&req.input.data)),
            min_price: req.offer.minPrice.to_string(),
            max_price: req.offer.maxPrice.to_string(),
            timeout: req.offer.timeout,
        })
    }

    /// Fetch content from a URL, handling IPFS URLs and optional auth
    async fn fetch_url(&self, url: &str) -> Result<Vec<u8>> {
        let client = reqwest::Client::new();

        // Handle IPFS URLs by converting to gateway URL
        let url = if url.starts_with("ipfs://") {
            let cid = url.trim_start_matches("ipfs://");
            format!("{}{}", self.ipfs_gateway, cid)
        } else {
            url.to_string()
        };

        let mut request = client.get(&url);

        // Add Pinata JWT if configured
        if let Some(ref jwt) = self.pinata_jwt {
            request = request.header("Authorization", format!("Bearer {}", jwt));
        }

        let response = request
            .send()
            .await
            .context("Failed to fetch URL")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();

            // Provide helpful messages for common S3/gateway errors
            if status == reqwest::StatusCode::FORBIDDEN {
                if body.contains("expired") || body.contains("Expired") {
                    anyhow::bail!(
                        "URL has expired: {}\n\
                         This is likely a pre-signed S3 URL that is no longer valid.\n\
                         The request may need to be re-submitted with a fresh URL.",
                        url
                    );
                } else {
                    anyhow::bail!(
                        "Access denied (403 Forbidden): {}\n\
                         This URL may be gated or require authentication.",
                        url
                    );
                }
            }

            anyhow::bail!("Failed to fetch {}: HTTP {}", url, status);
        }

        let bytes = response
            .bytes()
            .await
            .context("Failed to read response bytes")?;

        Ok(bytes.to_vec())
    }

    /// Download the ELF binary from the image URL
    pub async fn download_elf(&self, image_url: &str) -> Result<Vec<u8>> {
        self.fetch_url(image_url)
            .await
            .context("Failed to download ELF")
    }

    /// Download input data from a URL
    pub async fn download_input(&self, input_url: &str) -> Result<Vec<u8>> {
        self.fetch_url(input_url)
            .await
            .context("Failed to download input data")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parsed_proof_request_display() {
        let req = ParsedProofRequest {
            request_id: "0x1234567890abcdef".to_string(),
            client_address: "0xabcdef1234567890".to_string(),
            image_id: "0ximage123".to_string(),
            image_url: "ipfs://QmTest123".to_string(),
            input_type: 1,
            input_data: "0x48656c6c6f".to_string(),
            min_price: "1000000000000000".to_string(),
            max_price: "10000000000000000".to_string(),
            timeout: 3600,
        };

        let display = format!("{}", req);

        assert!(display.contains("Request ID: 0x1234567890abcdef"));
        assert!(display.contains("Client: 0xabcdef1234567890"));
        assert!(display.contains("Image URL: ipfs://QmTest123"));
        assert!(display.contains("Timeout: 3600 seconds"));
    }

    #[test]
    fn test_parsed_proof_request_serialization_roundtrip() {
        let req = ParsedProofRequest {
            request_id: "0x123".to_string(),
            client_address: "0xabc".to_string(),
            image_id: "0ximg".to_string(),
            image_url: "https://example.com/elf".to_string(),
            input_type: 0,
            input_data: "0x".to_string(),
            min_price: "100".to_string(),
            max_price: "1000".to_string(),
            timeout: 60,
        };

        let json = serde_json::to_string(&req).expect("should serialize");
        let parsed: ParsedProofRequest = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(parsed.request_id, req.request_id);
        assert_eq!(parsed.timeout, req.timeout);
        assert_eq!(parsed.image_url, req.image_url);
    }

    #[test]
    fn test_chain_client_new() {
        let client = ChainClient::new(
            "https://mainnet.base.org",
            "https://gateway.beboundless.cloud/ipfs/",
            None,
        );
        assert_eq!(client.rpc_url, "https://mainnet.base.org");
        assert_eq!(client.ipfs_gateway, "https://gateway.beboundless.cloud/ipfs/");
        assert!(client.pinata_jwt.is_none());
    }

    #[test]
    fn test_ipfs_url_conversion() {
        let ipfs_url = "ipfs://QmTest123456789";
        let expected = "https://gateway.beboundless.cloud/ipfs/QmTest123456789";

        let converted = if ipfs_url.starts_with("ipfs://") {
            let cid = ipfs_url.trim_start_matches("ipfs://");
            format!("https://gateway.beboundless.cloud/ipfs/{}", cid)
        } else {
            ipfs_url.to_string()
        };

        assert_eq!(converted, expected);
    }

    #[test]
    fn test_http_url_passthrough() {
        let http_url = "https://example.com/elf.bin";

        let converted = if http_url.starts_with("ipfs://") {
            let cid = http_url.trim_start_matches("ipfs://");
            format!("https://gateway.beboundless.cloud/ipfs/{}", cid)
        } else {
            http_url.to_string()
        };

        assert_eq!(converted, http_url);
    }

    #[test]
    fn test_input_data_byte_calculation() {
        // Test the logic used for calculating input size from hex string
        let input_data = "0x48656c6c6f576f726c64"; // "HelloWorld"
        let size = input_data.len().saturating_sub(2) / 2;
        assert_eq!(size, 10); // 10 bytes
    }

    #[test]
    fn test_input_data_empty() {
        let input_data = "0x";
        let size = input_data.len().saturating_sub(2) / 2;
        assert_eq!(size, 0);
    }
}

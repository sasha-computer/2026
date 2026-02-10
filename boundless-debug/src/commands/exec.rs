use crate::chain::ChainClient;
use crate::commands::Context;
use crate::output;
use anyhow::{Context as AnyhowContext, Result};
use serde::Serialize;

#[derive(Debug, Serialize, serde::Deserialize)]
pub struct ExecResult {
    pub success: bool,
    pub request_id: String,
    pub image_url: String,
    pub elf_size_bytes: usize,
    pub cycles: Option<u64>,
    pub journal: Option<String>,
    pub error: Option<String>,
}

impl std::fmt::Display for ExecResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.success {
            writeln!(f, "Execution successful")?;
            if let Some(cycles) = self.cycles {
                writeln!(f, "  Cycles: {}", cycles)?;
            }
            if let Some(ref journal) = self.journal {
                writeln!(f, "  Journal: {}", journal)?;
            }
        } else {
            writeln!(f, "Execution failed")?;
            if let Some(ref error) = self.error {
                writeln!(f, "  Error: {}", error)?;
            }
        }
        Ok(())
    }
}

pub async fn run(ctx: &Context, request_id: &str) -> Result<()> {
    output::info(&format!(
        "Fetching request {} from chain...",
        output::truncate_hex(request_id, 20)
    ));

    let chain_client = ChainClient::new(&ctx.rpc_url, &ctx.ipfs_gateway, ctx.pinata_jwt.clone());

    // Fetch the request from chain
    let request = chain_client
        .get_request(request_id)
        .await
        .context("Failed to fetch request from chain")?;

    output::success(&format!(
        "Request found: {}",
        output::truncate_hex(&request.request_id, 20)
    ));

    if ctx.verbose {
        println!("\n{}\n", request);
    }

    // Download the ELF
    output::info(&format!("Downloading ELF from {}...", &request.image_url));

    let elf_bytes = chain_client
        .download_elf(&request.image_url)
        .await
        .context("Failed to download ELF")?;

    output::success(&format!(
        "Downloaded ELF ({} bytes)",
        elf_bytes.len()
    ));

    // Get input data (either inline hex or fetched from URL)
    let input_data = if request.input_type == 1 {
        // URL input - fetch from URL
        output::info(&format!("Fetching input from {}...", &request.input_data));
        chain_client
            .download_input(&request.input_data)
            .await
            .context("Failed to fetch input from URL")?
    } else {
        // Inline input - decode hex
        hex::decode(request.input_data.trim_start_matches("0x"))
            .context("Failed to parse input data")?
    };

    output::info(&format!(
        "Executing with {} bytes of input...",
        input_data.len()
    ));

    // Execute in zkVM
    let result = execute_in_zkvm(&elf_bytes, &input_data, ctx.verbose).await;

    let exec_result = match result {
        Ok((cycles, journal)) => ExecResult {
            success: true,
            request_id: request.request_id.clone(),
            image_url: request.image_url.clone(),
            elf_size_bytes: elf_bytes.len(),
            cycles: Some(cycles),
            journal: Some(format!("0x{}", hex::encode(&journal))),
            error: None,
        },
        Err(e) => {
            // Collect full error chain for better debugging
            let error_chain: Vec<String> = e.chain().map(|c| c.to_string()).collect();
            let full_error = error_chain.join(": ");
            ExecResult {
                success: false,
                request_id: request.request_id.clone(),
                image_url: request.image_url.clone(),
                elf_size_bytes: elf_bytes.len(),
                cycles: None,
                journal: None,
                error: Some(full_error),
            }
        }
    };

    if exec_result.success {
        output::success("Execution successful");
    } else {
        output::error("Execution failed");
    }

    output::print_result(&exec_result, ctx.json_output);

    Ok(())
}

/// Execute the ELF in the RISC Zero zkVM (execute-only mode, no proving)
async fn execute_in_zkvm(
    elf: &[u8],
    input: &[u8],
    verbose: bool,
) -> Result<(u64, Vec<u8>)> {
    use risc0_zkvm::{default_executor, ExecutorEnv};

    if verbose {
        output::info("Building executor environment...");
    }

    // Build the executor environment with input
    let env = ExecutorEnv::builder()
        .write_slice(input)
        .build()
        .context("Failed to build executor environment")?;

    if verbose {
        output::info("Starting execution...");
    }

    // Execute (this is synchronous but fast for execute-only)
    let executor = default_executor();
    let session = executor
        .execute(env, elf)
        .context("Execution failed")?;

    let cycles = session.cycles();
    // The journal is a Journal struct containing bytes
    let journal: Vec<u8> = session.journal.bytes.clone();

    if verbose {
        output::success(&format!("Completed in {} cycles", cycles));
    }

    Ok((cycles, journal))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_exec_result_success() -> ExecResult {
        ExecResult {
            success: true,
            request_id: "0x123abc".to_string(),
            image_url: "ipfs://QmTest".to_string(),
            elf_size_bytes: 1024,
            cycles: Some(1000000),
            journal: Some("0xdeadbeef".to_string()),
            error: None,
        }
    }

    fn sample_exec_result_failure() -> ExecResult {
        ExecResult {
            success: false,
            request_id: "0x123abc".to_string(),
            image_url: "ipfs://QmTest".to_string(),
            elf_size_bytes: 1024,
            cycles: None,
            journal: None,
            error: Some("Guest panicked: assertion failed".to_string()),
        }
    }

    #[test]
    fn test_exec_result_display_success() {
        let result = sample_exec_result_success();
        let display = format!("{}", result);

        assert!(display.contains("Execution successful"));
        assert!(display.contains("Cycles: 1000000"));
        assert!(display.contains("Journal: 0xdeadbeef"));
        assert!(!display.contains("failed"));
    }

    #[test]
    fn test_exec_result_display_failure() {
        let result = sample_exec_result_failure();
        let display = format!("{}", result);

        assert!(display.contains("Execution failed"));
        assert!(display.contains("Error: Guest panicked"));
        assert!(!display.contains("Cycles:"));
    }

    #[test]
    fn test_exec_result_json_serialization() {
        let result = sample_exec_result_success();
        let json = serde_json::to_string_pretty(&result).expect("should serialize");

        assert!(json.contains("\"success\": true"));
        assert!(json.contains("\"cycles\": 1000000"));
        assert!(json.contains("\"elf_size_bytes\": 1024"));
    }

    #[test]
    fn test_exec_result_json_roundtrip() {
        let result = sample_exec_result_success();
        let json = serde_json::to_string(&result).expect("should serialize");
        let parsed: ExecResult = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(parsed.success, result.success);
        assert_eq!(parsed.cycles, result.cycles);
        assert_eq!(parsed.journal, result.journal);
        assert_eq!(parsed.elf_size_bytes, result.elf_size_bytes);
    }

    #[test]
    fn test_exec_result_failure_json_roundtrip() {
        let result = sample_exec_result_failure();
        let json = serde_json::to_string(&result).expect("should serialize");
        let parsed: ExecResult = serde_json::from_str(&json).expect("should deserialize");

        assert!(!parsed.success);
        assert!(parsed.error.is_some());
        assert!(parsed.cycles.is_none());
        assert!(parsed.journal.is_none());
    }
}

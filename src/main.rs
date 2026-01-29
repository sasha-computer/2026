use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

mod commands;
mod chain;
mod explorer;
mod output;

#[derive(Parser)]
#[command(name = "boundless-debug")]
#[command(about = "Debug tool for Boundless proof requests - execute guest programs locally")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Output format as JSON
    #[arg(long, global = true)]
    json: bool,

    /// Verbose output
    #[arg(short, long, global = true)]
    verbose: bool,

    /// RPC URL for Base mainnet (required)
    #[arg(long, env = "RPC_URL")]
    rpc_url: Option<String>,

    /// IPFS gateway URL for fetching content
    #[arg(long, env = "IPFS_GATEWAY", default_value = "https://gateway.beboundless.cloud/ipfs/")]
    ipfs_gateway: String,

    /// Pinata JWT for authenticated IPFS access
    #[arg(long, env = "PINATA_JWT")]
    pinata_jwt: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Execute a proof request locally in the zkVM
    Exec {
        /// The request ID (hex string)
        request_id: String,
    },

    /// Show detailed information about a proof request
    Info {
        /// The request ID (hex string)
        request_id: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env file if present
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();

    let rpc_url = cli.rpc_url.ok_or_else(|| {
        anyhow::anyhow!(
            "RPC_URL is required but not set.\n\n\
             Add it to your .env file:\n\
             RPC_URL=https://your-base-mainnet-rpc.com\n\n\
             You can get an RPC URL from providers like Alchemy, Infura, or QuickNode."
        )
    })?;

    let ctx = commands::Context {
        rpc_url,
        json_output: cli.json,
        verbose: cli.verbose,
        ipfs_gateway: cli.ipfs_gateway,
        pinata_jwt: cli.pinata_jwt,
    };

    match cli.command {
        Commands::Exec { request_id } => {
            commands::exec::run(&ctx, &request_id).await?;
        }
        Commands::Info { request_id } => {
            commands::info::run(&ctx, &request_id).await?;
        }
    }

    Ok(())
}

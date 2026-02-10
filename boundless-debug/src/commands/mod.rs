pub mod exec;
pub mod info;

/// Shared context for all commands
pub struct Context {
    pub rpc_url: String,
    pub json_output: bool,
    pub verbose: bool,
    pub ipfs_gateway: String,
    pub pinata_jwt: Option<String>,
}

# boundless-debug

Debug tool for Boundless proof requests - execute guest programs locally in the RISC Zero zkVM.

## Features

- **Execute requests locally**: Fetch a proof request from chain and run the guest program in execute-only mode
- **Request info**: View request details from both the Explorer API and chain
- **Dual output format**: Human-readable by default, JSON with `--json` flag

## Usage

```bash
# Enter the development shell
nix-shell

# Execute a request locally
boundless-debug exec <request_id>

# With verbose output
boundless-debug exec <request_id> --verbose

# JSON output for scripting
boundless-debug exec <request_id> --json

# Show request info
boundless-debug info <request_id>
```

## Environment Variables

- `RPC_URL` - Base mainnet RPC endpoint (default: `https://mainnet.base.org`)

## Building

```bash
nix-shell
cargo build --release
```

## Requirements

- NixOS or nix-shell
- RISC Zero toolchain (install with `rzup install` after entering nix-shell)

## Architecture

The tool:
1. Fetches the `ProofRequest` from the BoundlessMarket contract on Base
2. Downloads the guest program ELF from the `imageUrl` (supports IPFS)
3. Executes the program in the RISC Zero zkVM (execute-only, no proving)
4. Reports cycles, journal output, and any errors

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clients for the Boundless Explorer/Indexer API:
- **Python client** (`explorer_client.py`) - CLI testing
- **Web app** (`web/`) - Svelte 5 + TypeScript UI for exploring API endpoints

## Commands

```bash
# Enter dev shell (auto-starts web app)
nix-shell

# Python client
python explorer_client.py

# Web app (manual)
cd web && bun run dev      # Dev server at http://localhost:5173
cd web && bun run test     # Run tests
cd web && bun run build    # Production build
```

## API Reference

- **Base URL**: `https://d2mdvlnmyov1e1.cloudfront.net`
- **Swagger UI**: `https://d2mdvlnmyov1e1.cloudfront.net/docs/`
- **OpenAPI Spec**: `https://d2mdvlnmyov1e1.cloudfront.net/openapi.json`

## Architecture

### Python Client
Single-file client (`explorer_client.py`) with `BoundlessExplorerClient` class.

### Web App (`web/`)
Svelte 5 + Bun + TypeScript SPA:
- `src/lib/types.ts` - API response types
- `src/lib/api/client.ts` - Fetch wrapper with error handling
- `src/lib/api/endpoints.ts` - All 26 endpoint functions
- `src/lib/config.ts` - Data-driven endpoint definitions for UI
- `src/App.svelte` - Entire UI in one component

Chain: Base (chain_id: 8453).

## Working API Endpoints (26)

### Health
- `GET /health`

### Market (10) - Most active, has real data
- `GET /v1/market` - Current indexing status
- `GET /v1/market/aggregates` - Time-series stats (hourly/daily/weekly/monthly)
- `GET /v1/market/cumulatives` - All-time statistics
- `GET /v1/market/requests` - List proof requests
- `GET /v1/market/requests/{id}` - Single request
- `GET /v1/market/provers/{addr}/requests` - Prover's fulfilled requests
- `GET /v1/market/requestors/{addr}/requests` - Requestor's submissions
- `GET /v1/market/requestors/{addr}/aggregates` - Requestor time-series
- `GET /v1/market/requestors/{addr}/cumulatives` - Requestor all-time stats

### Staking (4) - Endpoints work but return empty data
- `GET /v1/staking/addresses`
- `GET /v1/staking/addresses/{addr}`
- `GET /v1/staking/epochs`
- `GET /v1/staking/epochs/{epoch}/addresses`

### PoVW (4) - Endpoints work but return empty data
- `GET /v1/povw/addresses`
- `GET /v1/povw/addresses/{addr}`
- `GET /v1/povw/epochs`
- `GET /v1/povw/epochs/{epoch}/addresses`

### Delegations (8) - Endpoints work but return empty data
- `GET /v1/delegations/rewards/addresses`
- `GET /v1/delegations/rewards/addresses/{addr}`
- `GET /v1/delegations/rewards/epochs/{epoch}/addresses`
- `GET /v1/delegations/rewards/epochs/{epoch}/addresses/{addr}`
- `GET /v1/delegations/votes/addresses`
- `GET /v1/delegations/votes/addresses/{addr}`
- `GET /v1/delegations/votes/epochs/{epoch}/addresses`
- `GET /v1/delegations/votes/epochs/{epoch}/addresses/{addr}`

## Broken Endpoints (4)

- `GET /v1/staking` - 500 error
- `GET /v1/staking/epochs/{epoch}` - 500 error
- `GET /v1/povw` - 404 error
- `GET /v1/povw/epochs/{epoch}` - 404 error

## Key Patterns

- All methods return parsed JSON dicts
- Pagination via `limit`/`offset` params (default 50, max 100)
- Time filtering via `before`/`after` Unix timestamps
- Aggregation periods: hourly, daily, weekly, monthly
- Ethereum addresses as path parameters for address-specific queries

## Sample Addresses (for testing)

- Prover: `0xf6071162fb00d79f2b62d98a1a3f8a10fdcd094f`
- Requestor: `0xe198c6944cae382902a375b0b8673084270a7f8e`

## External Resources

- Boundless docs MCP tool available for documentation queries
- Main docs: https://docs.boundless.network/

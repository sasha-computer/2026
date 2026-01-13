# Boundless Explorer API

Clients for the [Boundless Indexer API](https://d2mdvlnmyov1e1.cloudfront.net/docs/) on Base (chain ID: 8453).

## Clients

### Web App (`web/`)

Svelte 5 + TypeScript SPA for exploring API endpoints interactively.

```bash
cd web && bun install && bun run dev
```

Open http://localhost:5173

### Python Client (`explorer_client.py`)

CLI client for testing and scripting.

```bash
pip install -r requirements.txt
python explorer_client.py
```

```python
from explorer_client import BoundlessExplorerClient

client = BoundlessExplorerClient()
status = client.get_market_status()
requests = client.get_prover_requests("0x...")
```

## API Endpoints

**Base URL:** `https://d2mdvlnmyov1e1.cloudfront.net`

### Working Endpoints (11)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service health check |
| `GET /v1/market` | Current indexing status |
| `GET /v1/market/aggregates` | Time-series stats (hourly/daily/weekly/monthly) |
| `GET /v1/market/cumulatives` | All-time market statistics |
| `GET /v1/market/requests` | Paginated list of proof requests |
| `GET /v1/market/requests/{id}` | Single request by ID |
| `GET /v1/market/provers/{addr}/requests` | Prover's fulfilled requests |
| `GET /v1/market/requestors/{addr}/requests` | Requestor's submissions |
| `GET /v1/market/requestors/{addr}/aggregates` | Requestor time-series |
| `GET /v1/market/requestors/{addr}/cumulatives` | Requestor all-time stats |

### Empty Data Endpoints (16)

These endpoints work but return empty results (not yet enabled):

- **Staking** (4): `/v1/staking/addresses`, `/v1/staking/addresses/{addr}`, `/v1/staking/epochs`, `/v1/staking/epochs/{epoch}/addresses`
- **PoVW** (4): `/v1/povw/addresses`, `/v1/povw/addresses/{addr}`, `/v1/povw/epochs`, `/v1/povw/epochs/{epoch}/addresses`
- **Delegations Rewards** (4): `/v1/delegations/rewards/...`
- **Delegations Votes** (4): `/v1/delegations/votes/...`

### Broken Endpoints (4)

| Endpoint | Error |
|----------|-------|
| `GET /v1/staking` | 500 |
| `GET /v1/staking/epochs/{epoch}` | 500 |
| `GET /v1/povw` | 404 |
| `GET /v1/povw/epochs/{epoch}` | 404 |

## Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 50 | Results per page (max: 100) |
| `offset` | 0 | Results to skip |
| `sort` | desc | Order: "asc" or "desc" |
| `sort_by` | created_at | Field: "created_at" or "updated_at" |
| `aggregation` | - | "hourly", "daily", "weekly", "monthly" |
| `before` | - | Unix timestamp upper bound |
| `after` | - | Unix timestamp lower bound |

## Sample Addresses

- **Prover:** `0xf6071162fb00d79f2b62d98a1a3f8a10fdcd094f`
- **Requestor:** `0xe198c6944cae382902a375b0b8673084270a7f8e`

## Resources

- [API Docs (Swagger)](https://d2mdvlnmyov1e1.cloudfront.net/docs/)
- [OpenAPI Spec](https://d2mdvlnmyov1e1.cloudfront.net/openapi.json)
- [Boundless Docs](https://docs.boundless.network/)
- [Boundless Explorer](https://explorer.beboundless.xyz/)

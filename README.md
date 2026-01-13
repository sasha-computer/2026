# Boundless Explorer API Client

Python client for the [Boundless Indexer API](https://d2mdvlnmyov1e1.cloudfront.net/docs/).

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```python
from explorer_client import BoundlessExplorerClient

client = BoundlessExplorerClient()

# Get market status
status = client.get_market_status()

# Get staking leaderboard
leaderboard = client.get_staking_addresses(limit=10)

# Get requests for a specific prover
requests = client.get_prover_requests("0x...")
```

## API Base URL

```
https://d2mdvlnmyov1e1.cloudfront.net
```

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

### Staking (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/staking` | Global staking summary statistics |
| GET | `/v1/staking/addresses` | All-time staking leaderboard |
| GET | `/v1/staking/addresses/{address}` | Staking history for specific address |
| GET | `/v1/staking/epochs` | Summary across all epochs |
| GET | `/v1/staking/epochs/{epoch}` | Single epoch summary |
| GET | `/v1/staking/epochs/{epoch}/addresses` | Epoch-specific leaderboard |

### PoVW - Proof of Verifiable Work (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/povw` | Aggregate PoVW statistics |
| GET | `/v1/povw/addresses` | All-time PoVW leaderboard |
| GET | `/v1/povw/addresses/{address}` | Address rewards history |
| GET | `/v1/povw/epochs` | Summary across all epochs |
| GET | `/v1/povw/epochs/{epoch}` | Single epoch summary |
| GET | `/v1/povw/epochs/{epoch}/addresses` | Epoch-specific leaderboard |

### Delegations - Rewards (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/delegations/rewards/addresses` | Current aggregate delegation powers |
| GET | `/v1/delegations/rewards/addresses/{address}` | Address delegation history |
| GET | `/v1/delegations/rewards/epochs/{epoch}/addresses` | Epoch delegation powers |
| GET | `/v1/delegations/rewards/epochs/{epoch}/addresses/{address}` | Specific delegation at epoch |

### Delegations - Votes (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/delegations/votes/addresses` | Current vote delegation powers |
| GET | `/v1/delegations/votes/addresses/{address}` | Address vote history |
| GET | `/v1/delegations/votes/epochs/{epoch}/addresses` | Epoch vote delegations |
| GET | `/v1/delegations/votes/epochs/{epoch}/addresses/{address}` | Specific vote delegation at epoch |

### Market (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/market` | Current indexing status (chain ID, block info) |
| GET | `/v1/market/aggregates` | Market data aggregates (hourly/daily/weekly/monthly) |
| GET | `/v1/market/cumulatives` | All-time market statistics |
| GET | `/v1/market/requests` | Paginated list of all requests |
| GET | `/v1/market/requests/{request_id}` | Requests matching specific ID |
| GET | `/v1/market/provers/{address}/requests` | Prover-fulfilled requests |
| GET | `/v1/market/requestors/{address}/requests` | Requestor-submitted requests |
| GET | `/v1/market/requestors/{address}/aggregates` | Requestor time-series data |
| GET | `/v1/market/requestors/{address}/cumulatives` | Requestor all-time stats |

---

## Common Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max: 100) |
| `offset` | integer | 0 | Results to skip |
| `cursor` | string | - | Base64-encoded pagination token |
| `sort` | string | desc | Order: "asc" or "desc" |
| `sort_by` | string | created_at | Field: "created_at" or "updated_at" |
| `aggregation` | string | - | "hourly", "daily", "weekly", "monthly" |
| `before` | integer | - | Unix timestamp upper bound |
| `after` | integer | - | Unix timestamp lower bound |

---

## Response Format

### Numeric Fields
All monetary values are provided in two formats:
- Raw string (wei/base unit)
- Formatted display version

### Timestamps
All timestamps include:
- Unix epoch (integer)
- ISO 8601 formatted string

### Staking Entry Fields
- `staker_address`: Ethereum address
- `staked_amount`: Amount staked
- `is_withdrawing`: Withdrawal status
- `rewards_generated`: Total rewards

### PoVW Entry Fields
- `work_log_id`: Work log identifier
- `work_submitted`: Amount of work
- `actual_rewards`: Rewards received
- `is_capped`: Whether rewards were capped

### Delegation Entry Fields
- `delegate_address`: Delegate's address
- `power`: Delegation power
- `delegator_count`: Number of delegators
- `delegators`: List of delegator details

### Market Entry Fields
- `chain_id`: Blockchain identifier
- `timestamp`: Block timestamp
- Fulfillment metrics
- Price percentiles (p10-p99)
- Collateral/fee totals

---

## Error Responses

| Code | Description |
|------|-------------|
| 400 | Invalid parameters or address format |
| 404 | Resource not found (epoch/data unavailable) |
| 500 | Server error |

---

## Resources

- [API Documentation (Swagger UI)](https://d2mdvlnmyov1e1.cloudfront.net/docs/)
- [Boundless Explorer](https://explorer.beboundless.xyz/)
- [Boundless Documentation](https://docs.boundless.network/)

# Boundless Explorer API Status Summary

**Date:** 2026-01-13
**Base URL:** https://d2mdvlnmyov1e1.cloudfront.net
**Chain:** Base (chain_id: 8453)

## Overview

**26 working / 4 failing endpoints**

---

## Working Endpoints (26)

| Category | Endpoint | Data Available |
|----------|----------|----------------|
| Health | `/health` | Yes |
| Market | `/v1/market` | Yes (chain_id: 8453, Base) |
| Market | `/v1/market/aggregates` | Yes (daily/hourly stats) |
| Market | `/v1/market/cumulatives` | Yes (882k+ fulfilled requests total) |
| Market | `/v1/market/requests` | Yes (live proof requests) |
| Market | `/v1/market/requests/{id}` | Yes |
| Market | `/v1/market/provers/{addr}/requests` | Yes |
| Market | `/v1/market/requestors/{addr}/requests` | Yes |
| Market | `/v1/market/requestors/{addr}/aggregates` | Yes |
| Market | `/v1/market/requestors/{addr}/cumulatives` | Yes |
| Staking | `/v1/staking/addresses` | Empty (0 entries) |
| Staking | `/v1/staking/addresses/{addr}` | Works, empty data |
| Staking | `/v1/staking/epochs` | Empty |
| Staking | `/v1/staking/epochs/{epoch}/addresses` | Works |
| PoVW | `/v1/povw/addresses` | Empty |
| PoVW | `/v1/povw/addresses/{addr}` | Works, empty data |
| PoVW | `/v1/povw/epochs` | Empty |
| PoVW | `/v1/povw/epochs/{epoch}/addresses` | Works |
| Delegations | `/v1/delegations/rewards/addresses` | Empty |
| Delegations | `/v1/delegations/rewards/addresses/{addr}` | Works |
| Delegations | `/v1/delegations/rewards/epochs/{epoch}/addresses` | Works |
| Delegations | `/v1/delegations/rewards/epochs/{epoch}/addresses/{addr}` | Works |
| Delegations | `/v1/delegations/votes/addresses` | Empty |
| Delegations | `/v1/delegations/votes/addresses/{addr}` | Works |
| Delegations | `/v1/delegations/votes/epochs/{epoch}/addresses` | Works |
| Delegations | `/v1/delegations/votes/epochs/{epoch}/addresses/{addr}` | Works |

---

## Failing Endpoints (4)

| Endpoint | Error |
|----------|-------|
| `/v1/staking` | 500 Server Error |
| `/v1/staking/epochs/{epoch}` | 500 Server Error |
| `/v1/povw` | 404 Not Found |
| `/v1/povw/epochs/{epoch}` | 404 Not Found |

---

## Market Statistics (Cumulative)

| Metric | Value |
|--------|-------|
| Total Fulfilled Requests | 882,102 |
| Unique Provers | 200 |
| Unique Requestors | 113 |
| Total Fees Locked | 61.56 ETH |
| Total Collateral Locked | 10,990,273 ZKC |
| Fulfillment Rate | 99.84% |
| Total Requests Submitted | 1,127,814 |
| Onchain Submissions | 386,041 |
| Offchain Submissions | 741,773 |

---

## Sample Addresses

**Active Prover:**
```
0xf6071162fb00d79f2b62d98a1a3f8a10fdcd094f
```

**Active Requestor:**
```
0xe198c6944cae382902a375b0b8673084270a7f8e
```

---

## Notes

- **Market endpoints** have the most active data with live proof requests
- **Staking/PoVW/Delegations** endpoints return empty data - features may not be live yet
- Request statuses observed: `submitted`, `locked`, `fulfilled`
- Price data available in both raw (wei) and formatted display versions
- Timestamps provided in both Unix epoch and ISO 8601 formats

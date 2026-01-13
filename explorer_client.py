"""
Boundless Explorer API Client

A Python client for interacting with the Boundless Indexer API.
API Documentation: https://d2mdvlnmyov1e1.cloudfront.net/docs/
"""

import requests
from typing import Optional, Literal
from dataclasses import dataclass


BASE_URL = "https://d2mdvlnmyov1e1.cloudfront.net"


@dataclass
class PaginationParams:
    """Common pagination parameters for API requests."""
    limit: int = 50
    offset: int = 0
    cursor: Optional[str] = None
    sort: Literal["asc", "desc"] = "desc"
    sort_by: Literal["created_at", "updated_at"] = "created_at"


class BoundlessExplorerClient:
    """Client for the Boundless Explorer/Indexer API."""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make a GET request to the API."""
        url = f"{self.base_url}{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    # Health
    def health(self) -> dict:
        """Check service health status."""
        return self._get("/health")

    # Staking endpoints
    def get_staking_summary(self) -> dict:
        """Get global staking summary statistics."""
        return self._get("/v1/staking")

    def get_staking_addresses(self, limit: int = 50, offset: int = 0) -> dict:
        """Get all-time staking leaderboard."""
        return self._get("/v1/staking/addresses", {"limit": limit, "offset": offset})

    def get_staking_address(self, address: str) -> dict:
        """Get staking history for a specific address."""
        return self._get(f"/v1/staking/addresses/{address}")

    def get_staking_epochs(self) -> dict:
        """Get staking summary across all epochs."""
        return self._get("/v1/staking/epochs")

    def get_staking_epoch(self, epoch: int) -> dict:
        """Get staking summary for a single epoch."""
        return self._get(f"/v1/staking/epochs/{epoch}")

    def get_staking_epoch_addresses(self, epoch: int, limit: int = 50, offset: int = 0) -> dict:
        """Get epoch-specific staking leaderboard."""
        return self._get(f"/v1/staking/epochs/{epoch}/addresses", {"limit": limit, "offset": offset})

    # PoVW (Proof of Verifiable Work) endpoints
    def get_povw_summary(self) -> dict:
        """Get aggregate PoVW statistics."""
        return self._get("/v1/povw")

    def get_povw_addresses(self, limit: int = 50, offset: int = 0) -> dict:
        """Get all-time PoVW leaderboard."""
        return self._get("/v1/povw/addresses", {"limit": limit, "offset": offset})

    def get_povw_address(self, address: str) -> dict:
        """Get PoVW rewards history for a specific address."""
        return self._get(f"/v1/povw/addresses/{address}")

    def get_povw_epochs(self) -> dict:
        """Get PoVW summary across all epochs."""
        return self._get("/v1/povw/epochs")

    def get_povw_epoch(self, epoch: int) -> dict:
        """Get PoVW summary for a single epoch."""
        return self._get(f"/v1/povw/epochs/{epoch}")

    def get_povw_epoch_addresses(self, epoch: int, limit: int = 50, offset: int = 0) -> dict:
        """Get epoch-specific PoVW leaderboard."""
        return self._get(f"/v1/povw/epochs/{epoch}/addresses", {"limit": limit, "offset": offset})

    # Delegation - Rewards
    def get_reward_delegations(self, limit: int = 50, offset: int = 0) -> dict:
        """Get current aggregate reward delegation powers."""
        return self._get("/v1/delegations/rewards/addresses", {"limit": limit, "offset": offset})

    def get_reward_delegation_address(self, address: str) -> dict:
        """Get reward delegation history for a specific address."""
        return self._get(f"/v1/delegations/rewards/addresses/{address}")

    def get_reward_delegations_epoch(self, epoch: int, limit: int = 50, offset: int = 0) -> dict:
        """Get reward delegation powers for a specific epoch."""
        return self._get(f"/v1/delegations/rewards/epochs/{epoch}/addresses", {"limit": limit, "offset": offset})

    def get_reward_delegation_epoch_address(self, epoch: int, address: str) -> dict:
        """Get specific reward delegation at epoch for an address."""
        return self._get(f"/v1/delegations/rewards/epochs/{epoch}/addresses/{address}")

    # Delegation - Votes
    def get_vote_delegations(self, limit: int = 50, offset: int = 0) -> dict:
        """Get current aggregate vote delegation powers."""
        return self._get("/v1/delegations/votes/addresses", {"limit": limit, "offset": offset})

    def get_vote_delegation_address(self, address: str) -> dict:
        """Get vote delegation history for a specific address."""
        return self._get(f"/v1/delegations/votes/addresses/{address}")

    def get_vote_delegations_epoch(self, epoch: int, limit: int = 50, offset: int = 0) -> dict:
        """Get vote delegation powers for a specific epoch."""
        return self._get(f"/v1/delegations/votes/epochs/{epoch}/addresses", {"limit": limit, "offset": offset})

    def get_vote_delegation_epoch_address(self, epoch: int, address: str) -> dict:
        """Get specific vote delegation at epoch for an address."""
        return self._get(f"/v1/delegations/votes/epochs/{epoch}/addresses/{address}")

    # Market endpoints
    def get_market_status(self) -> dict:
        """Get current indexing status (chain ID, block info)."""
        return self._get("/v1/market")

    def get_market_aggregates(
        self,
        aggregation: Literal["hourly", "daily", "weekly", "monthly"] = "daily",
        before: Optional[int] = None,
        after: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """Get market data aggregates."""
        params = {"aggregation": aggregation, "limit": limit, "offset": offset}
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        return self._get("/v1/market/aggregates", params)

    def get_market_cumulatives(self, limit: int = 50, offset: int = 0) -> dict:
        """Get all-time market statistics."""
        return self._get("/v1/market/cumulatives", {"limit": limit, "offset": offset})

    def get_market_requests(
        self,
        limit: int = 50,
        offset: int = 0,
        sort: Literal["asc", "desc"] = "desc",
        sort_by: Literal["created_at", "updated_at"] = "created_at"
    ) -> dict:
        """Get paginated list of all proof requests."""
        return self._get("/v1/market/requests", {
            "limit": limit,
            "offset": offset,
            "sort": sort,
            "sort_by": sort_by
        })

    def get_market_request(self, request_id: str) -> dict:
        """Get requests matching a specific ID."""
        return self._get(f"/v1/market/requests/{request_id}")

    def get_prover_requests(self, address: str, limit: int = 50, offset: int = 0) -> dict:
        """Get requests fulfilled by a specific prover."""
        return self._get(f"/v1/market/provers/{address}/requests", {"limit": limit, "offset": offset})

    def get_requestor_requests(self, address: str, limit: int = 50, offset: int = 0) -> dict:
        """Get requests submitted by a specific requestor."""
        return self._get(f"/v1/market/requestors/{address}/requests", {"limit": limit, "offset": offset})

    def get_requestor_aggregates(
        self,
        address: str,
        aggregation: Literal["hourly", "daily", "weekly", "monthly"] = "daily",
        before: Optional[int] = None,
        after: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """Get requestor time-series aggregated data."""
        params = {"aggregation": aggregation, "limit": limit, "offset": offset}
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        return self._get(f"/v1/market/requestors/{address}/aggregates", params)

    def get_requestor_cumulatives(self, address: str, limit: int = 50, offset: int = 0) -> dict:
        """Get requestor all-time statistics."""
        return self._get(f"/v1/market/requestors/{address}/cumulatives", {"limit": limit, "offset": offset})


if __name__ == "__main__":
    # Example usage
    client = BoundlessExplorerClient()

    print("Testing Boundless Explorer API...")
    print("-" * 50)

    # Health check
    try:
        health = client.health()
        print(f"✓ Health check: {health}")
    except Exception as e:
        print(f"✗ Health check failed: {e}")

    # Market status
    try:
        market = client.get_market_status()
        print(f"✓ Market status: chain_id={market.get('chain_id')}")
    except Exception as e:
        print(f"✗ Market status failed: {e}")

    # Staking summary
    try:
        staking = client.get_staking_summary()
        print(f"✓ Staking summary retrieved")
    except Exception as e:
        print(f"✗ Staking summary failed: {e}")

    # PoVW summary
    try:
        povw = client.get_povw_summary()
        print(f"✓ PoVW summary retrieved")
    except Exception as e:
        print(f"✗ PoVW summary failed: {e}")

    print("-" * 50)
    print("API client ready for use!")

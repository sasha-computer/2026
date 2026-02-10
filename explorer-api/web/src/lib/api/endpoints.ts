import { fetchApi } from './client';
import type {
  HealthResponse,
  MarketStatus,
  MarketAggregatesResponse,
  MarketCumulativesResponse,
  MarketRequestsResponse,
  MarketRequest,
  RequestorAggregatesResponse,
  RequestorCumulativesResponse,
  StakingAddressResponse,
  PoVWAddressResponse,
  DelegationResponse,
  PaginatedResponse,
  PaginationParams,
  TimeRangeParams,
  AggregationPeriod,
  StakingEpoch,
  PoVWEpoch,
  DelegationEntry,
} from '../../types/types';

// Health
export const health = {
  check: () => fetchApi<HealthResponse>('/health'),
};

// Market (10 endpoints)
export const market = {
  status: () => fetchApi<MarketStatus>('/v1/market'),

  aggregates: (
    params?: { aggregation?: AggregationPeriod } & PaginationParams & TimeRangeParams
  ) => fetchApi<MarketAggregatesResponse>('/v1/market/aggregates', params),

  cumulatives: (params?: PaginationParams) =>
    fetchApi<MarketCumulativesResponse>('/v1/market/cumulatives', params),

  requests: (params?: PaginationParams) =>
    fetchApi<MarketRequestsResponse>('/v1/market/requests', params),

  request: (requestId: string) =>
    fetchApi<MarketRequest[]>(`/v1/market/requests/${requestId}`),

  proverRequests: (address: string, params?: PaginationParams) =>
    fetchApi<MarketRequestsResponse>(`/v1/market/provers/${address}/requests`, params),

  requestorRequests: (address: string, params?: PaginationParams) =>
    fetchApi<MarketRequestsResponse>(`/v1/market/requestors/${address}/requests`, params),

  requestorAggregates: (
    address: string,
    params?: { aggregation?: AggregationPeriod } & PaginationParams & TimeRangeParams
  ) => fetchApi<RequestorAggregatesResponse>(`/v1/market/requestors/${address}/aggregates`, params),

  requestorCumulatives: (address: string, params?: PaginationParams) =>
    fetchApi<RequestorCumulativesResponse>(`/v1/market/requestors/${address}/cumulatives`, params),
};

// Staking (4 endpoints)
export const staking = {
  addresses: (params?: PaginationParams) =>
    fetchApi<StakingAddressResponse>('/v1/staking/addresses', params),

  address: (address: string) =>
    fetchApi<StakingAddressResponse>(`/v1/staking/addresses/${address}`),

  epochs: () => fetchApi<PaginatedResponse<StakingEpoch>>('/v1/staking/epochs'),

  epochAddresses: (epoch: number, params?: PaginationParams) =>
    fetchApi<StakingAddressResponse>(`/v1/staking/epochs/${epoch}/addresses`, params),
};

// PoVW (4 endpoints)
export const povw = {
  addresses: (params?: PaginationParams) =>
    fetchApi<PoVWAddressResponse>('/v1/povw/addresses', params),

  address: (address: string) =>
    fetchApi<PoVWAddressResponse>(`/v1/povw/addresses/${address}`),

  epochs: () => fetchApi<PaginatedResponse<PoVWEpoch>>('/v1/povw/epochs'),

  epochAddresses: (epoch: number, params?: PaginationParams) =>
    fetchApi<PoVWAddressResponse>(`/v1/povw/epochs/${epoch}/addresses`, params),
};

// Delegations (8 endpoints)
export const delegations = {
  rewards: {
    addresses: (params?: PaginationParams) =>
      fetchApi<DelegationResponse>('/v1/delegations/rewards/addresses', params),

    address: (address: string) =>
      fetchApi<DelegationResponse>(`/v1/delegations/rewards/addresses/${address}`),

    epochAddresses: (epoch: number, params?: PaginationParams) =>
      fetchApi<DelegationResponse>(`/v1/delegations/rewards/epochs/${epoch}/addresses`, params),

    epochAddress: (epoch: number, address: string) =>
      fetchApi<DelegationEntry | null>(
        `/v1/delegations/rewards/epochs/${epoch}/addresses/${address}`
      ),
  },
  votes: {
    addresses: (params?: PaginationParams) =>
      fetchApi<DelegationResponse>('/v1/delegations/votes/addresses', params),

    address: (address: string) =>
      fetchApi<DelegationResponse>(`/v1/delegations/votes/addresses/${address}`),

    epochAddresses: (epoch: number, params?: PaginationParams) =>
      fetchApi<DelegationResponse>(`/v1/delegations/votes/epochs/${epoch}/addresses`, params),

    epochAddress: (epoch: number, address: string) =>
      fetchApi<DelegationEntry | null>(
        `/v1/delegations/votes/epochs/${epoch}/addresses/${address}`
      ),
  },
};

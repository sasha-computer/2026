// Common types
export type SortDirection = 'asc' | 'desc';
export type SortField = 'created_at' | 'updated_at';
export type AggregationPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort?: SortDirection;
  sort_by?: SortField;
}

export interface TimeRangeParams {
  before?: number;
  after?: number;
}

// Generic paginated response wrapper
export interface PaginatedResponse<T> {
  entries?: T[];
  data?: T[];
  pagination?: {
    count: number;
    offset: number;
    limit: number;
  };
  has_more?: boolean;
  next_cursor?: string | null;
  chain_id?: number;
}

// Health
export interface HealthResponse {
  service: string;
  status: string;
}

// Market types
export interface MarketStatus {
  chain_id: number;
  last_indexed_block: number;
  last_indexed_block_timestamp: number;
  last_indexed_block_timestamp_iso: string;
}

export interface MarketAggregate {
  chain_id: number;
  timestamp: number;
  timestamp_iso: string;
  total_fulfilled: number;
  unique_provers_locking_requests: number;
  unique_requesters_submitting_requests: number;
  total_fees_locked: string;
  total_fees_locked_formatted: string;
  total_collateral_locked: string;
  total_collateral_locked_formatted: string;
  total_requests_submitted: number;
  total_requests_locked: number;
  locked_orders_fulfillment_rate: number;
}

export interface MarketAggregatesResponse {
  chain_id: number;
  aggregation: AggregationPeriod;
  data: MarketAggregate[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface MarketCumulative {
  chain_id: number;
  timestamp: number;
  timestamp_iso: string;
  total_fulfilled: number;
  unique_provers_locking_requests: number;
  unique_requesters_submitting_requests: number;
  total_fees_locked: string;
  total_fees_locked_formatted: string;
  total_requests_submitted: number;
}

export interface MarketCumulativesResponse {
  chain_id: number;
  data: MarketCumulative[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface MarketRequest {
  chain_id: number;
  request_digest: string;
  request_id: string;
  request_status: 'submitted' | 'locked' | 'fulfilled' | 'slashed' | 'expired';
  source: 'onchain' | 'offchain';
  client_address: string;
  lock_prover_address: string | null;
  fulfill_prover_address: string | null;
  // Timestamps
  created_at: number;
  created_at_iso: string;
  updated_at?: number;
  updated_at_iso?: string;
  locked_at?: number | null;
  locked_at_iso?: string | null;
  fulfilled_at?: number | null;
  fulfilled_at_iso?: string | null;
  expires_at?: number | null;
  expires_at_iso?: string | null;
  lock_end?: number | null;
  lock_end_iso?: string | null;
  // Pricing
  min_price: string;
  min_price_formatted: string;
  max_price: string;
  max_price_formatted: string;
  lock_price?: string | null;
  lock_price_formatted?: string | null;
  lock_collateral: string;
  lock_collateral_formatted: string;
  // Cycles
  total_cycles?: number | null;
  program_cycles?: number | null;
}

export interface MarketRequestsResponse {
  chain_id: number;
  data: MarketRequest[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface RequestorAggregatesResponse {
  chain_id: number;
  requestor_address: string;
  aggregation: AggregationPeriod;
  data: MarketAggregate[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface RequestorCumulativesResponse {
  chain_id: number;
  requestor_address: string;
  data: MarketCumulative[];
  next_cursor: string | null;
  has_more: boolean;
}

// Staking types
export interface StakingEntry {
  staker_address: string;
  staked_amount: string;
  staked_amount_display: string;
  is_withdrawing: boolean;
  rewards_generated: string;
  rewards_generated_display: string;
}

export interface StakingAddressResponse {
  entries: StakingEntry[];
  pagination: {
    count: number;
    offset: number;
    limit: number;
  };
  summary?: {
    total_staked: string;
    total_rewards: string;
  };
}

export interface StakingEpoch {
  epoch: number;
  total_staked: string;
  total_staked_display: string;
  total_rewards: string;
  total_rewards_display: string;
  unique_stakers: number;
}

// PoVW types
export interface PoVWEntry {
  rewards_address: string;
  work_log_id: string;
  work_submitted: string;
  work_submitted_display: string;
  actual_rewards: string;
  actual_rewards_display: string;
  is_capped: boolean;
}

export interface PoVWAddressResponse {
  entries: PoVWEntry[];
  pagination: {
    count: number;
    offset: number;
    limit: number;
  };
  summary?: {
    total_work: string;
    total_rewards: string;
  };
}

export interface PoVWEpoch {
  epoch: number;
  total_work: string;
  total_work_display: string;
  total_rewards: string;
  total_rewards_display: string;
}

// Delegation types
export interface DelegationEntry {
  delegate_address: string;
  power: string;
  power_display: string;
  delegator_count: number;
  delegators: string[];
}

export interface DelegationResponse {
  entries: DelegationEntry[];
  pagination: {
    count: number;
    offset: number;
    limit: number;
  };
}

// API Error
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

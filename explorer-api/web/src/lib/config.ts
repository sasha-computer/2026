// Endpoint configuration for UI dropdown

export type ParamType = 'text' | 'number' | 'select' | 'datetime' | 'address';

export interface ParamOption {
  value: string;
  label: string;
}

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  required?: boolean;
  default?: string | number;
  placeholder?: string;
  options?: ParamOption[];
  min?: number;
  max?: number;
}

export interface EndpointConfig {
  id: string;
  label: string;
  path: string;
  category: string;
  pathParams?: ParamDef[];
  queryParams?: ParamDef[];
  /** Endpoint works but returns empty data (not yet enabled) */
  disabled?: boolean;
}

// Reusable param definitions
const PAGINATION: ParamDef[] = [
  { key: 'limit', label: 'Limit', type: 'number', default: 50, min: 1, max: 100 },
  { key: 'offset', label: 'Offset', type: 'number', default: 0, min: 0 },
];

const SORT_PARAMS: ParamDef[] = [
  {
    key: 'sort',
    label: 'Sort',
    type: 'select',
    default: 'desc',
    options: [
      { value: 'asc', label: 'Ascending' },
      { value: 'desc', label: 'Descending' },
    ],
  },
  {
    key: 'sort_by',
    label: 'Sort By',
    type: 'select',
    default: 'created_at',
    options: [
      { value: 'created_at', label: 'Created At' },
      { value: 'updated_at', label: 'Updated At' },
    ],
  },
];

const AGGREGATION: ParamDef = {
  key: 'aggregation',
  label: 'Period',
  type: 'select',
  default: 'daily',
  options: [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ],
};

const TIME_RANGE: ParamDef[] = [
  { key: 'after', label: 'After', type: 'datetime', placeholder: 'Start time' },
  { key: 'before', label: 'Before', type: 'datetime', placeholder: 'End time' },
];

const ADDRESS_PARAM: ParamDef = {
  key: 'address',
  label: 'Address',
  type: 'address',
  required: true,
  placeholder: '0x...',
};

const EPOCH_PARAM: ParamDef = {
  key: 'epoch',
  label: 'Epoch',
  type: 'number',
  required: true,
  min: 0,
};

const REQUEST_ID_PARAM: ParamDef = {
  key: 'request_id',
  label: 'Request ID',
  type: 'text',
  required: true,
  placeholder: '0x...',
};

// All 26 endpoints
export const ENDPOINTS: EndpointConfig[] = [
  // Health (1)
  {
    id: 'health',
    label: 'Health Check',
    path: '/health',
    category: 'Health',
  },

  // Market (10)
  {
    id: 'market.status',
    label: 'Market Status',
    path: '/v1/market',
    category: 'Market',
  },
  {
    id: 'market.aggregates',
    label: 'Market Aggregates',
    path: '/v1/market/aggregates',
    category: 'Market',
    queryParams: [AGGREGATION, ...TIME_RANGE, ...PAGINATION],
  },
  {
    id: 'market.cumulatives',
    label: 'Market Cumulatives',
    path: '/v1/market/cumulatives',
    category: 'Market',
    queryParams: PAGINATION,
  },
  {
    id: 'market.requests',
    label: 'All Requests',
    path: '/v1/market/requests',
    category: 'Market',
    queryParams: [...PAGINATION, ...SORT_PARAMS],
  },
  {
    id: 'market.request',
    label: 'Request by ID',
    path: '/v1/market/requests/{request_id}',
    category: 'Market',
    pathParams: [REQUEST_ID_PARAM],
  },
  {
    id: 'market.proverRequests',
    label: 'Prover Requests',
    path: '/v1/market/provers/{address}/requests',
    category: 'Market',
    pathParams: [ADDRESS_PARAM],
    queryParams: PAGINATION,
  },
  {
    id: 'market.requestorRequests',
    label: 'Requestor Requests',
    path: '/v1/market/requestors/{address}/requests',
    category: 'Market',
    pathParams: [ADDRESS_PARAM],
    queryParams: PAGINATION,
  },
  {
    id: 'market.requestorAggregates',
    label: 'Requestor Aggregates',
    path: '/v1/market/requestors/{address}/aggregates',
    category: 'Market',
    pathParams: [ADDRESS_PARAM],
    queryParams: [AGGREGATION, ...TIME_RANGE, ...PAGINATION],
  },
  {
    id: 'market.requestorCumulatives',
    label: 'Requestor Cumulatives',
    path: '/v1/market/requestors/{address}/cumulatives',
    category: 'Market',
    pathParams: [ADDRESS_PARAM],
    queryParams: PAGINATION,
  },

  // Staking (4) - endpoints work but return empty data
  {
    id: 'staking.addresses',
    label: 'Staking Leaderboard',
    path: '/v1/staking/addresses',
    category: 'Staking',
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'staking.address',
    label: 'Staker History',
    path: '/v1/staking/addresses/{address}',
    category: 'Staking',
    pathParams: [ADDRESS_PARAM],
    disabled: true,
  },
  {
    id: 'staking.epochs',
    label: 'Staking Epochs',
    path: '/v1/staking/epochs',
    category: 'Staking',
    disabled: true,
  },
  {
    id: 'staking.epochAddresses',
    label: 'Epoch Staking Leaderboard',
    path: '/v1/staking/epochs/{epoch}/addresses',
    category: 'Staking',
    pathParams: [EPOCH_PARAM],
    queryParams: PAGINATION,
    disabled: true,
  },

  // PoVW (4) - endpoints work but return empty data
  {
    id: 'povw.addresses',
    label: 'PoVW Leaderboard',
    path: '/v1/povw/addresses',
    category: 'PoVW',
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'povw.address',
    label: 'Worker History',
    path: '/v1/povw/addresses/{address}',
    category: 'PoVW',
    pathParams: [ADDRESS_PARAM],
    disabled: true,
  },
  {
    id: 'povw.epochs',
    label: 'PoVW Epochs',
    path: '/v1/povw/epochs',
    category: 'PoVW',
    disabled: true,
  },
  {
    id: 'povw.epochAddresses',
    label: 'Epoch PoVW Leaderboard',
    path: '/v1/povw/epochs/{epoch}/addresses',
    category: 'PoVW',
    pathParams: [EPOCH_PARAM],
    queryParams: PAGINATION,
    disabled: true,
  },

  // Delegations - Rewards (4) - endpoints work but return empty data
  {
    id: 'delegations.rewards.addresses',
    label: 'Reward Delegations',
    path: '/v1/delegations/rewards/addresses',
    category: 'Delegations (Rewards)',
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'delegations.rewards.address',
    label: 'Delegate Rewards History',
    path: '/v1/delegations/rewards/addresses/{address}',
    category: 'Delegations (Rewards)',
    pathParams: [ADDRESS_PARAM],
    disabled: true,
  },
  {
    id: 'delegations.rewards.epochAddresses',
    label: 'Epoch Reward Delegations',
    path: '/v1/delegations/rewards/epochs/{epoch}/addresses',
    category: 'Delegations (Rewards)',
    pathParams: [EPOCH_PARAM],
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'delegations.rewards.epochAddress',
    label: 'Epoch Delegate Rewards',
    path: '/v1/delegations/rewards/epochs/{epoch}/addresses/{address}',
    category: 'Delegations (Rewards)',
    pathParams: [EPOCH_PARAM, ADDRESS_PARAM],
    disabled: true,
  },

  // Delegations - Votes (4) - endpoints work but return empty data
  {
    id: 'delegations.votes.addresses',
    label: 'Vote Delegations',
    path: '/v1/delegations/votes/addresses',
    category: 'Delegations (Votes)',
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'delegations.votes.address',
    label: 'Delegate Votes History',
    path: '/v1/delegations/votes/addresses/{address}',
    category: 'Delegations (Votes)',
    pathParams: [ADDRESS_PARAM],
    disabled: true,
  },
  {
    id: 'delegations.votes.epochAddresses',
    label: 'Epoch Vote Delegations',
    path: '/v1/delegations/votes/epochs/{epoch}/addresses',
    category: 'Delegations (Votes)',
    pathParams: [EPOCH_PARAM],
    queryParams: PAGINATION,
    disabled: true,
  },
  {
    id: 'delegations.votes.epochAddress',
    label: 'Epoch Delegate Votes',
    path: '/v1/delegations/votes/epochs/{epoch}/addresses/{address}',
    category: 'Delegations (Votes)',
    pathParams: [EPOCH_PARAM, ADDRESS_PARAM],
    disabled: true,
  },
];

// Helper to get unique categories
export function getCategories(): string[] {
  return [...new Set(ENDPOINTS.map((e) => e.category))];
}

// Helper to find endpoint by ID
export function getEndpoint(id: string): EndpointConfig | undefined {
  return ENDPOINTS.find((e) => e.id === id);
}

// Helper to build URL from config and param values
export function buildUrl(
  config: EndpointConfig,
  params: Record<string, string | number | undefined>
): string {
  let path = config.path;

  // Replace path parameters
  config.pathParams?.forEach((param) => {
    const value = params[param.key];
    if (value !== undefined) {
      path = path.replace(`{${param.key}}`, String(value));
    }
  });

  // Build query string
  const queryParams = new URLSearchParams();
  config.queryParams?.forEach((param) => {
    const value = params[param.key];
    if (value !== undefined && value !== '' && value !== param.default) {
      queryParams.set(param.key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

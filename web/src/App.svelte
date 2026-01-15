<script lang="ts">
  import {
    ENDPOINTS,
    getCategories,
    buildUrl,
    type EndpointConfig,
    type ParamDef,
  } from './lib/config';
  import { BASE_URL } from './lib/api/client';
  import type { MarketRequest } from './lib/types';

  // Tab state
  type Tab = 'browser' | 'debugger';
  let activeTab = $state<Tab>('browser');

  // Endpoint Browser state
  let selected = $state<EndpointConfig>(ENDPOINTS[0]);
  let params = $state<Record<string, string | number>>({});
  let result = $state<string>('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Request Debugger state
  let requestId = $state('');
  let debuggerLoading = $state(false);
  let debuggerError = $state<string | null>(null);
  let requestData = $state<MarketRequest | null>(null);

  // Derived
  const categories = getCategories();
  let fullUrl = $derived(BASE_URL + buildUrl(selected, params));

  // Initialize default params when endpoint changes
  function selectEndpoint(endpointId: string) {
    const endpoint = ENDPOINTS.find((e) => e.id === endpointId);
    if (!endpoint) return;

    selected = endpoint;
    params = {};
    result = '';
    error = null;

    // Set defaults
    [...(endpoint.pathParams ?? []), ...(endpoint.queryParams ?? [])].forEach(
      (param) => {
        if (param.default !== undefined) {
          params[param.key] = param.default;
        }
      }
    );
  }

  // Convert datetime-local input to Unix timestamp
  function datetimeToTimestamp(value: string): number {
    return Math.floor(new Date(value).getTime() / 1000);
  }

  // Execute API call
  async function execute() {
    loading = true;
    error = null;

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      result = JSON.stringify(data, null, 2);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      result = '';
    } finally {
      loading = false;
    }
  }

  // Check if all required params are filled
  function canExecute(): boolean {
    const allParams = [
      ...(selected.pathParams ?? []),
      ...(selected.queryParams ?? []),
    ];
    return allParams
      .filter((p) => p.required)
      .every((p) => params[p.key] !== undefined && params[p.key] !== '');
  }

  // Render input based on param type
  function renderInput(param: ParamDef): string {
    switch (param.type) {
      case 'number':
        return 'number';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  // Request Debugger functions
  async function fetchRequest() {
    if (!requestId.trim()) return;

    debuggerLoading = true;
    debuggerError = null;
    requestData = null;

    try {
      const response = await fetch(`${BASE_URL}/v1/market/requests/${requestId.trim()}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request not found');
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // API returns array, take first element
      if (Array.isArray(data) && data.length > 0) {
        requestData = data[0];
      } else if (data && !Array.isArray(data)) {
        requestData = data;
      } else {
        throw new Error('Request not found');
      }
    } catch (e) {
      debuggerError = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      debuggerLoading = false;
    }
  }

  function formatTimestamp(unix: number, iso: string): string {
    return `${iso} (${unix})`;
  }

  function getStatusColor(status: MarketRequest['request_status']): string {
    switch (status) {
      case 'fulfilled': return '#4caf50';
      case 'locked': return '#ff9800';
      case 'submitted': return '#2196f3';
      case 'slashed': return '#f44336';
      case 'expired': return '#9e9e9e';
      default: return '#666';
    }
  }

  function shortenAddress(addr: string | null): string {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<header>
  <h1>Boundless Explorer</h1>
  <nav class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'browser'}
      onclick={() => activeTab = 'browser'}
    >
      Endpoint Browser
    </button>
    <button
      class="tab"
      class:active={activeTab === 'debugger'}
      onclick={() => activeTab = 'debugger'}
    >
      Request Debugger
    </button>
  </nav>
  <a href="https://d2mdvlnmyov1e1.cloudfront.net/docs/" target="_blank" rel="noopener">
    API Docs
  </a>
</header>

<main>
  {#if activeTab === 'browser'}
  <section class="controls">
    <div class="field">
      <label for="endpoint">Endpoint</label>
      <select
        id="endpoint"
        onchange={(e) => selectEndpoint(e.currentTarget.value)}
      >
        {#each categories as category}
          <optgroup label={category}>
            {#each ENDPOINTS.filter((e) => e.category === category) as endpoint}
              <option
                value={endpoint.id}
                selected={endpoint.id === selected.id}
                disabled={endpoint.disabled}
                class:disabled={endpoint.disabled}
              >
                {endpoint.label}{endpoint.disabled ? ' (no data)' : ''}
              </option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>

    {#if selected.pathParams?.length}
      <div class="param-group">
        <h3>Path Parameters</h3>
        {#each selected.pathParams as param}
          <div class="field">
            <label for={param.key}>
              {param.label}
              {#if param.required}<span class="required">*</span>{/if}
            </label>
            {#if param.type === 'select' && param.options}
              <select
                id={param.key}
                bind:value={params[param.key]}
              >
                {#each param.options as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            {:else}
              <input
                type={renderInput(param)}
                id={param.key}
                placeholder={param.placeholder}
                min={param.min}
                max={param.max}
                value={params[param.key] ?? ''}
                oninput={(e) => {
                  const val = e.currentTarget.value;
                  if (param.type === 'number') {
                    params[param.key] = val ? parseInt(val) : '';
                  } else if (param.type === 'datetime') {
                    params[param.key] = val ? datetimeToTimestamp(val) : '';
                  } else {
                    params[param.key] = val;
                  }
                }}
              />
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if selected.queryParams?.length}
      <div class="param-group">
        <h3>Query Parameters</h3>
        {#each selected.queryParams as param}
          <div class="field">
            <label for={param.key}>{param.label}</label>
            {#if param.type === 'select' && param.options}
              <select
                id={param.key}
                bind:value={params[param.key]}
              >
                {#each param.options as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            {:else}
              <input
                type={renderInput(param)}
                id={param.key}
                placeholder={param.placeholder}
                min={param.min}
                max={param.max}
                value={params[param.key] ?? ''}
                oninput={(e) => {
                  const val = e.currentTarget.value;
                  if (param.type === 'number') {
                    params[param.key] = val ? parseInt(val) : '';
                  } else if (param.type === 'datetime') {
                    params[param.key] = val ? datetimeToTimestamp(val) : '';
                  } else {
                    params[param.key] = val;
                  }
                }}
              />
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <button onclick={execute} disabled={loading || !canExecute()}>
      {loading ? 'Loading...' : 'Fetch'}
    </button>
  </section>

  <section class="url-preview">
    <code>{fullUrl}</code>
  </section>

  <section class="results">
    {#if error}
      <div class="error">{error}</div>
    {/if}
    {#if result}
      <pre>{result}</pre>
    {:else if !error}
      <p class="placeholder">Select an endpoint and click Fetch to see results</p>
    {/if}
  </section>
  {:else if activeTab === 'debugger'}
  <section class="debugger">
    <div class="debugger-input">
      <label for="request-id">Request Order ID</label>
      <div class="input-row">
        <input
          type="text"
          id="request-id"
          placeholder="Enter request ID (e.g., 0x123...)"
          bind:value={requestId}
          onkeydown={(e) => e.key === 'Enter' && fetchRequest()}
        />
        <button onclick={fetchRequest} disabled={debuggerLoading || !requestId.trim()}>
          {debuggerLoading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
    </div>

    {#if debuggerError}
      <div class="debugger-error">{debuggerError}</div>
    {/if}

    {#if requestData}
      <div class="request-card">
        <div class="request-header">
          <div class="request-status" style="--status-color: {getStatusColor(requestData.request_status)}">
            {requestData.request_status.toUpperCase()}
          </div>
          <div class="request-source">{requestData.source}</div>
        </div>

        <div class="request-section">
          <h3>Identifiers</h3>
          <div class="request-field">
            <span class="field-label">Request ID</span>
            <code class="field-value mono">{requestData.request_id}</code>
          </div>
          <div class="request-field">
            <span class="field-label">Request Digest</span>
            <code class="field-value mono">{requestData.request_digest}</code>
          </div>
          <div class="request-field">
            <span class="field-label">Chain ID</span>
            <span class="field-value">{requestData.chain_id}</span>
          </div>
        </div>

        <div class="request-section">
          <h3>Addresses</h3>
          <div class="request-field">
            <span class="field-label">Client</span>
            <code class="field-value mono" title={requestData.client_address}>{requestData.client_address}</code>
          </div>
          <div class="request-field">
            <span class="field-label">Lock Prover</span>
            <code class="field-value mono" title={requestData.lock_prover_address ?? ''}>
              {requestData.lock_prover_address ?? '—'}
            </code>
          </div>
          <div class="request-field">
            <span class="field-label">Fulfill Prover</span>
            <code class="field-value mono" title={requestData.fulfill_prover_address ?? ''}>
              {requestData.fulfill_prover_address ?? '—'}
            </code>
          </div>
        </div>

        <div class="request-section">
          <h3>Pricing</h3>
          <div class="request-field">
            <span class="field-label">Min Price</span>
            <span class="field-value">{requestData.min_price_formatted}</span>
          </div>
          <div class="request-field">
            <span class="field-label">Max Price</span>
            <span class="field-value">{requestData.max_price_formatted}</span>
          </div>
          <div class="request-field">
            <span class="field-label">Lock Collateral</span>
            <span class="field-value">{requestData.lock_collateral_formatted}</span>
          </div>
        </div>

        <div class="request-section">
          <h3>Timing</h3>
          <div class="request-field">
            <span class="field-label">Created At</span>
            <span class="field-value">{requestData.created_at_iso}</span>
          </div>
          <div class="request-field">
            <span class="field-label">Unix Timestamp</span>
            <span class="field-value mono">{requestData.created_at}</span>
          </div>
        </div>

        <details class="raw-json">
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(requestData, null, 2)}</pre>
        </details>
      </div>
    {:else if !debuggerError}
      <p class="debugger-placeholder">Enter a Request Order ID to view its details</p>
    {/if}
  </section>
  {/if}
</main>

<footer>
  <span>Chain: Base (8453)</span>
  <span>26 endpoints</span>
  <a href="https://docs.boundless.network/" target="_blank" rel="noopener">
    Boundless Docs
  </a>
</footer>

<style>
  header {
    background: #1a1a2e;
    color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  header a {
    color: #88f;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
  }

  .tab {
    padding: 0.5rem 1rem;
    background: transparent;
    color: #888;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .tab:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .tab.active {
    background: rgba(136, 136, 255, 0.2);
    color: #88f;
  }

  main {
    padding: 1.5rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .required {
    color: #f66;
  }

  .param-group {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
  }

  .param-group h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .param-group .field {
    margin-bottom: 0.75rem;
  }

  .param-group .field:last-child {
    margin-bottom: 0;
  }

  select,
  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }

  option:disabled {
    color: #999;
    font-style: italic;
  }

  select:focus,
  input:focus {
    outline: none;
    border-color: #88f;
    box-shadow: 0 0 0 2px rgba(136, 136, 255, 0.2);
  }

  button {
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    align-self: flex-start;
  }

  button:hover:not(:disabled) {
    background: #2a2a4e;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .url-preview {
    background: #f0f0f0;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }

  .url-preview code {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.875rem;
    word-break: break-all;
  }

  .results {
    background: #1a1a2e;
    border-radius: 8px;
    min-height: 200px;
  }

  .results pre {
    margin: 0;
    padding: 1rem;
    color: #0f0;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.875rem;
    overflow: auto;
    max-height: 60vh;
  }

  .results .error {
    color: #f66;
    padding: 1rem;
  }

  .results .placeholder {
    color: #888;
    padding: 1rem;
    text-align: center;
  }

  footer {
    background: #1a1a2e;
    color: #888;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    margin-top: auto;
  }

  footer a {
    color: #88f;
  }

  /* Request Debugger styles */
  .debugger {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .debugger-input {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .debugger-input label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
  }

  .input-row input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .input-row input:focus {
    outline: none;
    border-color: #88f;
    box-shadow: 0 0 0 2px rgba(136, 136, 255, 0.2);
  }

  .input-row button {
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  .input-row button:hover:not(:disabled) {
    background: #2a2a4e;
  }

  .input-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .debugger-error {
    background: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }

  .debugger-placeholder {
    color: #888;
    text-align: center;
    padding: 3rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .request-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
  }

  .request-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .request-status {
    padding: 0.25rem 0.75rem;
    background: var(--status-color);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .request-source {
    padding: 0.25rem 0.75rem;
    background: #e0e0e0;
    color: #666;
    border-radius: 4px;
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .request-section {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .request-section:last-of-type {
    border-bottom: none;
  }

  .request-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .request-field {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.5rem 0;
    gap: 1rem;
  }

  .field-label {
    color: #666;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .field-value {
    text-align: right;
    word-break: break-all;
    font-size: 0.875rem;
  }

  .field-value.mono {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.8125rem;
  }

  .raw-json {
    border-top: 1px solid #e0e0e0;
  }

  .raw-json summary {
    padding: 1rem 1.5rem;
    cursor: pointer;
    color: #666;
    font-size: 0.875rem;
  }

  .raw-json summary:hover {
    background: #f5f5f5;
  }

  .raw-json pre {
    margin: 0;
    padding: 1rem 1.5rem;
    background: #1a1a2e;
    color: #0f0;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.75rem;
    overflow-x: auto;
    max-height: 300px;
  }
</style>

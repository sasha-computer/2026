<script lang="ts">
  import {
    ENDPOINTS,
    getCategories,
    buildUrl,
    type EndpointConfig,
    type ParamDef,
  } from './lib/config';
  import { BASE_URL } from './lib/api/client';

  // State
  let selected = $state<EndpointConfig>(ENDPOINTS[0]);
  let params = $state<Record<string, string | number>>({});
  let result = $state<string>('');
  let loading = $state(false);
  let error = $state<string | null>(null);

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
</script>

<header>
  <h1>Boundless Explorer</h1>
  <a href="https://d2mdvlnmyov1e1.cloudfront.net/docs/" target="_blank" rel="noopener">
    API Docs
  </a>
</header>

<main>
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
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  header a {
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
</style>

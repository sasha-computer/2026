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
  type Tab = 'browser' | 'debugger' | 'tracker';
  let activeTab = $state<Tab>('browser');

  // Requestor Tracker types
  interface TrackedRequest {
    id: string;
    nickname: string;
    problematic: boolean;
    note: string;
    addedAt: number;
    // Auto-fetched metadata
    createdAt?: string; // ISO format from API
    status?: string;
  }

  interface TrackedRequestor {
    address: string;
    nickname: string;
    requests: TrackedRequest[];
    addedAt: number;
  }

  interface TrackerData {
    requestors: TrackedRequestor[];
  }

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

  // Requestor Tracker state
  const TRACKER_STORAGE_KEY = 'boundless-requestor-tracker';
  let trackerData = $state<TrackerData>(loadTrackerData());
  let selectedRequestorIndex = $state<number | null>(null);
  let newRequestorAddress = $state('');
  let newRequestorNickname = $state('');
  let newRequestId = $state('');
  let editingRequestIndex = $state<number | null>(null);
  let editNote = $state('');
  let trackerViewRequestId = $state<string | null>(null);
  let trackerViewLoading = $state(false);
  let trackerViewError = $state<string | null>(null);
  let trackerViewData = $state<MarketRequest | null>(null);

  // Remove confirmation modal state
  interface RemoveConfirmation {
    type: 'requestor' | 'request';
    index: number;
    name: string;
  }
  let removeConfirmation = $state<RemoveConfirmation | null>(null);

  // Duplicate order modal state
  let showDuplicateModal = $state(false);

  // Auto-populate modal state
  let showAutoPopulateModal = $state(false);
  let autoPopulateLoading = $state(false);

  // New orders notification badge
  let newOrderCount = $state(0);
  let checkingNewOrders = $state(false);

  function loadTrackerData(): TrackerData {
    if (typeof localStorage === 'undefined') return { requestors: [] };
    const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!stored) return { requestors: [] };
    try {
      return JSON.parse(stored);
    } catch {
      return { requestors: [] };
    }
  }

  function saveTrackerData() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(trackerData));
  }

  async function addRequestor() {
    if (!newRequestorAddress.trim()) return;
    const addr = newRequestorAddress.trim().toLowerCase();
    if (trackerData.requestors.some(r => r.address === addr)) return;
    trackerData.requestors = [...trackerData.requestors, {
      address: addr,
      nickname: newRequestorNickname.trim() || addr.slice(0, 10),
      requests: [],
      addedAt: Date.now()
    }];
    saveTrackerData();
    newRequestorAddress = '';
    newRequestorNickname = '';
    selectedRequestorIndex = trackerData.requestors.length - 1;
    // Auto-fetch 10 most recent orders for newly added requestor
    await autoPopulateOrders(10);
  }

  function confirmRemoveRequestor(index: number) {
    const requestor = trackerData.requestors[index];
    removeConfirmation = {
      type: 'requestor',
      index,
      name: requestor.nickname
    };
  }

  function removeRequestor(index: number) {
    trackerData.requestors = trackerData.requestors.filter((_, i) => i !== index);
    saveTrackerData();
    if (selectedRequestorIndex === index) {
      selectedRequestorIndex = null;
    } else if (selectedRequestorIndex !== null && selectedRequestorIndex > index) {
      selectedRequestorIndex--;
    }
  }

  async function addTrackedRequest() {
    if (selectedRequestorIndex === null || !newRequestId.trim()) return;
    const reqId = newRequestId.trim();
    const requestor = trackerData.requestors[selectedRequestorIndex];
    if (requestor.requests.some(r => r.id === reqId)) {
      showDuplicateModal = true;
      return;
    }

    // Get short suffix for display
    const shortId = getShortOrderId(reqId, requestor.address);

    // Create the request entry with placeholder
    const newRequest: TrackedRequest = {
      id: reqId,
      nickname: shortId,
      problematic: false,
      note: '',
      addedAt: Date.now()
    };

    requestor.requests = [...requestor.requests, newRequest];
    trackerData.requestors = [...trackerData.requestors];
    saveTrackerData();
    newRequestId = '';

    // Auto-fetch API data and auto-open view panel
    const reqIndex = requestor.requests.length - 1;

    try {
      const response = await fetch(`${BASE_URL}/v1/market/requests/${reqId}`);
      if (response.ok) {
        const data = await response.json();
        const requestData = Array.isArray(data) && data.length > 0 ? data[0] : data;
        if (requestData) {
          // Update metadata
          requestor.requests[reqIndex].createdAt = requestData.created_at_iso;
          requestor.requests[reqIndex].status = requestData.request_status;
          // Auto-flag expired orders as problematic
          if (requestData.request_status === 'expired') {
            requestor.requests[reqIndex].problematic = true;
          }
          trackerData.requestors = [...trackerData.requestors];
          saveTrackerData();

          // Auto-open the view panel with this data
          trackerViewRequestId = reqId;
          trackerViewData = requestData;
          trackerViewError = null;
          trackerViewLoading = false;
        }
      }
    } catch {
      // Silently fail - metadata is optional enhancement
    }
  }

  function confirmRemoveRequest(reqIndex: number) {
    if (selectedRequestorIndex === null) return;
    const request = trackerData.requestors[selectedRequestorIndex].requests[reqIndex];
    removeConfirmation = {
      type: 'request',
      index: reqIndex,
      name: request.nickname
    };
  }

  function removeTrackedRequest(reqIndex: number) {
    if (selectedRequestorIndex === null) return;
    const requestor = trackerData.requestors[selectedRequestorIndex];
    requestor.requests = requestor.requests.filter((_, i) => i !== reqIndex);
    trackerData.requestors = [...trackerData.requestors];
    saveTrackerData();
    if (editingRequestIndex === reqIndex) {
      editingRequestIndex = null;
    }
  }

  function executeRemove() {
    if (!removeConfirmation) return;
    if (removeConfirmation.type === 'requestor') {
      removeRequestor(removeConfirmation.index);
    } else {
      removeTrackedRequest(removeConfirmation.index);
    }
    removeConfirmation = null;
  }

  function cancelRemove() {
    removeConfirmation = null;
  }

  function toggleProblematic(reqIndex: number) {
    if (selectedRequestorIndex === null) return;
    const requestor = trackerData.requestors[selectedRequestorIndex];
    requestor.requests[reqIndex].problematic = !requestor.requests[reqIndex].problematic;
    trackerData.requestors = [...trackerData.requestors];
    saveTrackerData();
  }

  function startEditingNote(reqIndex: number) {
    if (selectedRequestorIndex === null) return;
    editingRequestIndex = reqIndex;
    editNote = trackerData.requestors[selectedRequestorIndex].requests[reqIndex].note;
  }

  function saveNote() {
    if (selectedRequestorIndex === null || editingRequestIndex === null) return;
    trackerData.requestors[selectedRequestorIndex].requests[editingRequestIndex].note = editNote;
    trackerData.requestors = [...trackerData.requestors];
    saveTrackerData();
    editingRequestIndex = null;
    editNote = '';
  }

  function cancelEditNote() {
    editingRequestIndex = null;
    editNote = '';
  }

  function viewInDebugger(reqId: string) {
    requestId = reqId;
    activeTab = 'debugger';
    fetchRequest();
  }

  // Check for new orders that aren't in localStorage
  async function checkForNewOrders() {
    if (selectedRequestorIndex === null || checkingNewOrders) return;
    const requestor = trackerData.requestors[selectedRequestorIndex];
    checkingNewOrders = true;

    try {
      // Fetch a reasonable number to check against (10 is enough to detect new ones)
      const response = await fetch(`${BASE_URL}/v1/market/requestors/${requestor.address}/requests?limit=10`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const requests = Array.isArray(data) ? data : data.data || [];

      // Count how many are not in localStorage
      let count = 0;
      for (const req of requests) {
        const reqId = req.request_id;
        if (reqId && !requestor.requests.some(r => r.id === reqId)) {
          count++;
        }
      }
      newOrderCount = count;
    } catch (e) {
      console.error('Failed to check for new orders:', e);
      newOrderCount = 0;
    } finally {
      checkingNewOrders = false;
    }
  }

  // Handle Fetch Recent Orders button click
  async function handleFetchRecentOrders() {
    if (newOrderCount > 0) {
      // Auto-fetch the new orders without showing modal
      await autoPopulateOrders(newOrderCount);
      newOrderCount = 0;
    } else {
      // Show the modal to choose count
      showAutoPopulateModal = true;
    }
  }

  async function autoPopulateOrders(count: number) {
    if (selectedRequestorIndex === null) return;
    const requestor = trackerData.requestors[selectedRequestorIndex];
    showAutoPopulateModal = false;
    autoPopulateLoading = true;

    try {
      const response = await fetch(`${BASE_URL}/v1/market/requestors/${requestor.address}/requests?limit=${count}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const requests = Array.isArray(data) ? data : data.data || [];

      let addedCount = 0;
      for (const req of requests) {
        const reqId = req.request_id;
        if (!reqId || requestor.requests.some(r => r.id === reqId)) {
          continue; // Skip if no ID or already tracked
        }

        const shortId = getShortOrderId(reqId, requestor.address);
        const newRequest: TrackedRequest = {
          id: reqId,
          nickname: shortId,
          problematic: req.request_status === 'expired',
          note: '',
          addedAt: Date.now(),
          createdAt: req.created_at_iso,
          status: req.request_status
        };

        requestor.requests = [...requestor.requests, newRequest];
        addedCount++;
      }

      if (addedCount > 0) {
        trackerData.requestors = [...trackerData.requestors];
        saveTrackerData();

        // Auto-select the first added order in view panel
        const firstNewReq = requestor.requests[requestor.requests.length - addedCount];
        if (firstNewReq) {
          trackerViewRequestId = firstNewReq.id;
          // Set view data from already fetched info
          trackerViewData = requests.find((r: { request_id: string }) => r.request_id === firstNewReq.id) || null;
          trackerViewError = null;
          trackerViewLoading = false;
        }
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      autoPopulateLoading = false;
    }
  }

  async function viewRequestInTracker(reqId: string) {
    trackerViewRequestId = reqId;
    trackerViewLoading = true;
    trackerViewError = null;
    trackerViewData = null;

    try {
      const response = await fetch(`${BASE_URL}/v1/market/requests/${reqId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request not found');
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        trackerViewData = data[0];
      } else if (data && !Array.isArray(data)) {
        trackerViewData = data;
      } else {
        throw new Error('Request not found');
      }
    } catch (e) {
      trackerViewError = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      trackerViewLoading = false;
    }
  }

  // Check for new orders when requestor changes
  $effect(() => {
    if (selectedRequestorIndex !== null) {
      // Reset count when switching requestors
      newOrderCount = 0;
      // Check for new orders
      checkForNewOrders();
    }
  });

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

  // Extract short order ID suffix (like git short hash)
  // Request ID format: 0x + requestor_address (40 chars) + unique_suffix (8+ chars)
  // e.g., 0x382bba7d7bc9ae86c5de3e16c4ca96bcc0a3478e83572afa
  //       |------ requestor (42 chars with 0x) ------||suffix|
  function getOrderSuffix(requestId: string, requestorAddress: string): string {
    // Normalize addresses
    const reqId = requestId.toLowerCase();
    const reqAddr = requestorAddress.toLowerCase();

    // If the request ID starts with the requestor address, extract suffix
    if (reqId.startsWith(reqAddr)) {
      return reqId.slice(reqAddr.length);
    }
    // Fallback: just return last 8 chars
    return reqId.slice(-8);
  }

  // Get short display format for order (like git short commit hash)
  function getShortOrderId(requestId: string, requestorAddress: string): string {
    const suffix = getOrderSuffix(requestId, requestorAddress);
    // Show first 8 chars of suffix (like git's 7-8 char short hash)
    return suffix.slice(0, 8);
  }

  // Format ISO timestamp to concise display
  function formatOrderTime(isoString: string): string {
    // Input: "2026-01-15T14:20:01Z" or "2026-01-15T14:20:01+00:00"
    // Output: "2026-01-15 14:20:01 UTC"
    return isoString
      .replace('T', ' ')
      .replace('Z', ' UTC')
      .replace('+00:00', ' UTC');
  }

  // Copy to clipboard
  let copySuccess = $state(false);
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = true;
      setTimeout(() => copySuccess = false, 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copySuccess = true;
      setTimeout(() => copySuccess = false, 1500);
    }
  }

  // Format cycles with M/B suffix
  function formatCycles(cycles: number | null | undefined): string {
    if (cycles == null) return '—';
    if (cycles >= 1e9) {
      return `${(cycles / 1e9).toPrecision(3)}B`;
    }
    if (cycles >= 1e6) {
      return `${(cycles / 1e6).toPrecision(3)}M`;
    }
    return cycles.toLocaleString();
  }

  // Format price to 3 significant figures
  function formatPrice3sf(formattedPrice: string): string {
    // Input like "0.001234 ETH" -> "0.00123 ETH"
    const match = formattedPrice.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return formattedPrice;
    const num = parseFloat(match[1]);
    const unit = match[2];
    if (isNaN(num)) return formattedPrice;
    return `${num.toPrecision(3)} ${unit}`.trim();
  }

  // Calculate proof latency (time between creation and fulfillment)
  function calculateProofLatency(createdAt: number, fulfilledAt: number | null | undefined): string | null {
    if (fulfilledAt == null) return null;
    const diffSeconds = fulfilledAt - createdAt;
    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    }
    if (diffSeconds < 3600) {
      const mins = Math.floor(diffSeconds / 60);
      const secs = diffSeconds % 60;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${mins}m`;
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
    <button
      class="tab"
      class:active={activeTab === 'tracker'}
      onclick={() => activeTab = 'tracker'}
    >
      Requestor Tracker
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
            <span class="field-value">{formatOrderTime(requestData.created_at_iso)}</span>
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
  {:else if activeTab === 'tracker'}
  <section class="tracker">
    <div class="tracker-layout has-detail">
      <div class="tracker-sidebar">
        <h3>Tracked Requestors</h3>
        <div class="add-requestor">
          <input
            type="text"
            placeholder="Requestor address (0x...)"
            bind:value={newRequestorAddress}
            onkeydown={(e) => e.key === 'Enter' && addRequestor()}
          />
          <input
            type="text"
            placeholder="Nickname (optional)"
            bind:value={newRequestorNickname}
            onkeydown={(e) => e.key === 'Enter' && addRequestor()}
          />
          <button onclick={addRequestor} disabled={!newRequestorAddress.trim()}>
            Add
          </button>
        </div>
        <ul class="requestor-list">
          {#each trackerData.requestors as requestor, i}
            <li class="requestor-item" class:selected={selectedRequestorIndex === i}>
              <button
                class="requestor-select-btn"
                onclick={() => selectedRequestorIndex = i}
              >
                <span class="requestor-nickname">{requestor.nickname}</span>
                <code class="requestor-address" title={requestor.address}>
                  {shortenAddress(requestor.address)}
                </code>
              </button>
              <button
                class="remove-btn"
                onclick={() => confirmRemoveRequestor(i)}
                title="Remove requestor"
              >
                x
              </button>
            </li>
          {:else}
            <li class="empty-message">No requestors tracked yet</li>
          {/each}
        </ul>
      </div>

      <div class="tracker-main">
        {#if selectedRequestorIndex !== null && trackerData.requestors[selectedRequestorIndex]}
          {@const requestor = trackerData.requestors[selectedRequestorIndex]}
          <div class="requestor-header">
            <h3>{requestor.nickname}</h3>
            <div class="address-row">
              <a
                href="https://explorer.boundless.network/requestors/{requestor.address}?from=requestors"
                target="_blank"
                rel="noopener noreferrer"
                class="explorer-link"
              >
                <code class="full-address">{requestor.address}</code>
                <span class="link-icon">↗</span>
              </a>
              <button
                class="copy-btn"
                class:copied={copySuccess}
                onclick={() => copyToClipboard(requestor.address)}
                title="Copy address"
              >
                {#if copySuccess}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {/if}
              </button>
            </div>
            <button
              class="auto-populate-btn"
              onclick={handleFetchRecentOrders}
              disabled={autoPopulateLoading || checkingNewOrders}
            >
              {autoPopulateLoading ? 'Loading...' : 'Fetch Recent Orders'}
              {#if newOrderCount > 0}
                <span class="notification-badge">{newOrderCount}</span>
              {/if}
            </button>
          </div>

          <h4 class="orders-heading">Orders</h4>
          <div class="add-request">
            <input
              type="text"
              placeholder="Request Order ID"
              bind:value={newRequestId}
              onkeydown={(e) => e.key === 'Enter' && addTrackedRequest()}
            />
            <button onclick={addTrackedRequest} disabled={!newRequestId.trim()}>
              Add
            </button>
          </div>

          <ul class="tracked-requests">
            {#each requestor.requests as req, ri}
              <li
                class="tracked-request"
                class:problematic={req.problematic}
                class:selected={trackerViewRequestId === req.id}
              >
                <button class="request-row" onclick={() => viewRequestInTracker(req.id)}>
                  <div class="request-main">
                    <div class="request-header-line">
                      <code class="short-order-id" title={req.id}>{getShortOrderId(req.id, requestor.address)}</code>
                      {#if req.status}
                        <span class="order-status" style="--status-color: {getStatusColor(req.status as MarketRequest['request_status'])}">{req.status}</span>
                      {/if}
                    </div>
                    {#if req.createdAt}
                      <span class="order-time">{formatOrderTime(req.createdAt)}</span>
                    {:else}
                      <code class="request-id-fallback" title={req.id}>...{getOrderSuffix(req.id, requestor.address)}</code>
                    {/if}
                  </div>
                </button>
                <div class="request-actions">
                  <button
                    class="action-btn copy-id-btn"
                    onclick={(e) => { e.stopPropagation(); copyToClipboard(req.id); }}
                    title="Copy request ID"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button
                    class="action-btn problematic-btn"
                    class:active={req.problematic}
                    onclick={(e) => { e.stopPropagation(); toggleProblematic(ri); }}
                    title={req.problematic ? 'Mark as OK' : 'Mark as problematic'}
                  >
                    !
                  </button>
                  <button
                    class="action-btn note-btn"
                    class:has-note={req.note}
                    onclick={(e) => { e.stopPropagation(); startEditingNote(ri); }}
                    title={req.note ? 'Edit note' : 'Add note'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                  </button>
                  <button
                    class="action-btn remove-btn"
                    onclick={(e) => { e.stopPropagation(); confirmRemoveRequest(ri); }}
                    title="Remove"
                  >
                    x
                  </button>
                </div>
                {#if req.note}
                  <div class="request-note">
                    <span class="note-label">Note:</span> {req.note}
                  </div>
                {/if}
                {#if editingRequestIndex === ri}
                  <div class="note-editor">
                    <textarea
                      bind:value={editNote}
                      placeholder="Add a note..."
                      rows="2"
                    ></textarea>
                    <div class="note-actions">
                      <button onclick={saveNote}>Save</button>
                      <button onclick={cancelEditNote} class="cancel-btn">Cancel</button>
                    </div>
                  </div>
                {/if}
              </li>
            {:else}
              <li class="empty-message">No requests tracked for this requestor</li>
            {/each}
          </ul>
        {:else}
          <div class="tracker-placeholder">
            <p>Select a requestor from the sidebar or add a new one to start tracking requests.</p>
          </div>
        {/if}
      </div>

      <div class="tracker-detail">
        <div class="detail-header">
          <h3>Request Details</h3>
        </div>

        {#if trackerViewLoading}
          <div class="detail-loading">Loading...</div>
        {:else if trackerViewError}
          <div class="detail-error">{trackerViewError}</div>
        {:else if trackerViewData}
          <div class="request-card tracker-request-card">
            <div class="request-header">
              <div class="request-status" style="--status-color: {getStatusColor(trackerViewData.request_status)}">
                {trackerViewData.request_status.toUpperCase()}
              </div>
              <div class="request-source">{trackerViewData.source}</div>
            </div>

            <div class="request-section">
              <h3>Request ID</h3>
              <div class="request-field id-field">
                <code class="field-value mono" title={trackerViewData.request_id}>{trackerViewData.request_id}</code>
                <button
                  class="copy-btn small"
                  class:copied={copySuccess}
                  onclick={() => copyToClipboard(trackerViewData.request_id)}
                  title="Copy request ID"
                >
                  {#if copySuccess}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {/if}
                </button>
              </div>
            </div>

            <div class="request-section">
              <h3>Prover</h3>
              {#if trackerViewData.lock_prover_address}
                <div class="request-field">
                  <a
                    href="https://explorer.boundless.network/provers/{trackerViewData.lock_prover_address}?from=provers"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="explorer-link prover-link"
                    title="View prover on explorer"
                  >
                    <code class="field-value mono">{trackerViewData.lock_prover_address}</code>
                    <span class="link-icon">↗</span>
                  </a>
                </div>
              {:else}
                <div class="request-field">
                  <span class="field-value muted">No prover assigned</span>
                </div>
              {/if}
            </div>

            <div class="request-section">
              <h3>Timing</h3>
              <div class="request-field">
                <span class="field-label">Created</span>
                <span class="field-value">{formatOrderTime(trackerViewData.created_at_iso)}</span>
              </div>
              {#if trackerViewData.locked_at_iso}
                <div class="request-field">
                  <span class="field-label">Locked</span>
                  <span class="field-value">{formatOrderTime(trackerViewData.locked_at_iso)}</span>
                </div>
              {/if}
              {#if trackerViewData.expires_at_iso}
                <div class="request-field">
                  <span class="field-label">Expires</span>
                  <span class="field-value">{formatOrderTime(trackerViewData.expires_at_iso)}</span>
                </div>
              {/if}
              {#if trackerViewData.fulfilled_at_iso}
                <div class="request-field">
                  <span class="field-label">Fulfilled</span>
                  <span class="field-value">{formatOrderTime(trackerViewData.fulfilled_at_iso)}</span>
                </div>
                {#if calculateProofLatency(trackerViewData.created_at, trackerViewData.fulfilled_at)}
                  <div class="request-field highlight">
                    <span class="field-label">Proof Latency</span>
                    <span class="field-value">{calculateProofLatency(trackerViewData.created_at, trackerViewData.fulfilled_at)}</span>
                  </div>
                {/if}
              {/if}
            </div>

            <div class="request-section">
              <h3>Pricing</h3>
              <div class="request-field">
                <span class="field-label">Min Price</span>
                <span class="field-value">{formatPrice3sf(trackerViewData.min_price_formatted)}</span>
              </div>
              <div class="request-field">
                <span class="field-label">Max Price</span>
                <span class="field-value">{formatPrice3sf(trackerViewData.max_price_formatted)}</span>
              </div>
              <div class="request-field">
                <span class="field-label">Lock Collateral</span>
                <span class="field-value">{formatPrice3sf(trackerViewData.lock_collateral_formatted)}</span>
              </div>
              {#if trackerViewData.lock_price_formatted}
                <div class="request-field">
                  <span class="field-label">Lock Price</span>
                  <span class="field-value">{formatPrice3sf(trackerViewData.lock_price_formatted)}</span>
                </div>
              {/if}
            </div>

            {#if trackerViewData.total_cycles != null}
              <div class="request-section">
                <h3>Cycles</h3>
                <div class="request-field">
                  <span class="field-label">Total Cycles</span>
                  <span class="field-value">{formatCycles(trackerViewData.total_cycles)}</span>
                </div>
              </div>
            {/if}

            <details class="raw-json">
              <summary>Raw JSON</summary>
              <pre>{JSON.stringify(trackerViewData, null, 2)}</pre>
            </details>
          </div>
        {:else}
          <div class="detail-placeholder">
            <p>Select an order to view its details</p>
          </div>
        {/if}
      </div>
    </div>

    {#if removeConfirmation}
      <div
        class="modal-overlay"
        role="button"
        tabindex="-1"
        onclick={cancelRemove}
        onkeydown={(e) => e.key === 'Escape' && cancelRemove()}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <h3>Confirm Removal</h3>
          <p>
            Remove {removeConfirmation.type === 'requestor' ? 'requestor' : 'request'} <strong>{removeConfirmation.name}</strong>?
          </p>
          <div class="modal-actions">
            <button class="modal-btn cancel" onclick={cancelRemove}>Cancel</button>
            <button class="modal-btn confirm" onclick={executeRemove}>Remove</button>
          </div>
        </div>
      </div>
    {/if}

    {#if showDuplicateModal}
      <div
        class="modal-overlay"
        role="button"
        tabindex="-1"
        onclick={() => showDuplicateModal = false}
        onkeydown={(e) => e.key === 'Escape' && (showDuplicateModal = false)}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <h3>Order already added</h3>
          <p>This order is already being tracked for this requestor.</p>
          <div class="modal-actions">
            <button class="modal-btn cancel" onclick={() => showDuplicateModal = false}>OK</button>
          </div>
        </div>
      </div>
    {/if}

    {#if showAutoPopulateModal}
      <div
        class="modal-overlay"
        role="button"
        tabindex="-1"
        onclick={() => showAutoPopulateModal = false}
        onkeydown={(e) => e.key === 'Escape' && (showAutoPopulateModal = false)}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <h3>Fetch Recent Orders</h3>
          <p>How many recent orders would you like to add?</p>
          <div class="modal-actions auto-populate-options">
            <button class="modal-btn option" onclick={() => autoPopulateOrders(3)}>3</button>
            <button class="modal-btn option" onclick={() => autoPopulateOrders(5)}>5</button>
            <button class="modal-btn option" onclick={() => autoPopulateOrders(10)}>10</button>
            <button class="modal-btn cancel" onclick={() => showAutoPopulateModal = false}>Cancel</button>
          </div>
        </div>
      </div>
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

  .field-value.muted {
    color: #999;
    font-style: italic;
  }

  .request-field.id-field {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .request-field.id-field .field-value {
    flex: 1;
    text-align: left;
    font-size: 0.75rem;
  }

  .request-field.highlight {
    background: #e3f2fd;
    margin: 0 -1.5rem;
    padding: 0.5rem 1.5rem;
  }

  .prover-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: inherit;
  }

  .prover-link:hover {
    color: #2196f3;
  }

  .prover-link .field-value {
    text-align: left;
    font-size: 0.75rem;
  }

  .copy-btn.small {
    padding: 0.25rem;
    min-width: auto;
  }

  .copy-id-btn {
    color: #666;
  }

  .copy-id-btn:hover {
    color: #2196f3;
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

  /* Requestor Tracker styles */
  .tracker {
    height: calc(100vh - 200px);
  }

  .tracker-layout {
    display: grid;
    grid-template-columns: 250px 1fr 400px;
    gap: 1.5rem;
    height: 100%;
  }

  .tracker-sidebar {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tracker-sidebar h3 {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .add-requestor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
  }

  .add-requestor input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .add-requestor button {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .requestor-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  .requestor-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 0.25rem;
    background: white;
    border: 1px solid #e0e0e0;
  }

  .requestor-item:hover {
    background: #eee;
  }

  .requestor-item.selected {
    background: #1a1a2e;
    color: white;
    border-color: #1a1a2e;
  }

  .requestor-item.selected .requestor-address {
    color: #aaa;
  }

  .requestor-select-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    overflow: hidden;
    flex: 1;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
  }

  .requestor-nickname {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .requestor-address {
    font-size: 0.75rem;
    color: #888;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .remove-btn {
    padding: 0.25rem 0.5rem;
    background: transparent;
    color: #999;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .remove-btn:hover {
    background: #f44336;
    color: white;
  }

  .tracker-main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .requestor-header {
    margin-bottom: 1rem;
  }

  .requestor-header h3 {
    margin: 0 0 0.25rem 0;
  }

  .full-address {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.8125rem;
    color: #666;
    word-break: break-all;
  }

  .explorer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    text-decoration: none;
    color: inherit;
  }

  .explorer-link:hover .full-address {
    color: #4a9eff;
  }

  .explorer-link .link-icon {
    font-size: 0.75rem;
    color: #666;
    transition: color 0.15s;
  }

  .explorer-link:hover .link-icon {
    color: #4a9eff;
  }

  .address-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem;
    background: #f0f0f0;
    color: #666;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    background: #e0e0e0;
    color: #333;
  }

  .copy-btn.copied {
    background: #4caf50;
    color: white;
  }

  .auto-populate-btn {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: #2a2a4e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.8125rem;
    cursor: pointer;
    position: relative;
  }

  .auto-populate-btn:hover:not(:disabled) {
    background: #3a3a6e;
  }

  .auto-populate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .notification-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #f44336;
    color: white;
    font-size: 0.6875rem;
    font-weight: 600;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .orders-heading {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .add-request {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .add-request input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .add-request button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .tracked-requests {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  .tracked-request {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
  }

  .tracked-request.problematic {
    border-color: #f44336;
    background: #fff8f7;
  }

  .tracked-request.selected {
    border-color: #88f;
    background: #f5f5ff;
  }

  .tracked-request.selected.problematic {
    border-color: #f44336;
    background: linear-gradient(135deg, #fff8f7 0%, #f5f5ff 100%);
  }

  .tracked-request {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .request-row {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 1rem;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font-family: inherit;
  }

  .request-row:hover {
    opacity: 0.8;
  }

  .request-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow: hidden;
  }

  .request-header-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .short-order-id {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1a1a2e;
    background: #e8e8f0;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
  }

  .order-status {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    background: var(--status-color);
    color: white;
  }

  .order-time {
    font-size: 0.75rem;
    color: #666;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .request-id-fallback {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.75rem;
    color: #888;
  }

  .request-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 0.25rem 0.5rem;
    background: #f0f0f0;
    color: #666;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .action-btn:hover {
    background: #e0e0e0;
  }

  .action-btn.active {
    background: #f44336;
    color: white;
  }

  .action-btn.problematic-btn {
    opacity: 0.3;
  }

  .action-btn.problematic-btn:hover {
    opacity: 1;
    background: #ff9800;
    color: white;
  }

  .action-btn.problematic-btn.active {
    opacity: 1;
    background: #f44336;
    color: white;
  }

  .action-btn.note-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
  }

  .action-btn.note-btn.has-note {
    background: #88f;
    color: white;
  }

  .action-btn.note-btn:hover {
    background: #88f;
    color: white;
  }

  .action-btn.remove-btn:hover {
    background: #f44336;
    color: white;
  }

  .request-note {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
    font-size: 0.875rem;
    color: #666;
  }

  .note-label {
    font-weight: 500;
    color: #888;
  }

  .note-editor {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
  }

  .note-editor textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.875rem;
    resize: vertical;
  }

  .note-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .note-actions button {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }

  .note-actions .cancel-btn {
    background: #f0f0f0;
    color: #666;
  }

  .note-actions .cancel-btn:hover {
    background: #e0e0e0;
  }

  .tracker-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .empty-message {
    color: #888;
    font-style: italic;
    padding: 1rem;
    text-align: center;
  }

  .tracker-detail {
    background: #f5f5f5;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  }

  .detail-header h3 {
    margin: 0;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    padding: 2rem;
  }

  .detail-error {
    margin: 1rem;
    padding: 1rem;
    background: #ffebee;
    color: #c62828;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }

  .tracker-request-card {
    margin: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .detail-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    padding: 2rem;
    text-align: center;
  }

  /* Remove confirmation modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .modal h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
  }

  .modal p {
    margin: 0 0 1.5rem 0;
    color: #666;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .modal-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .modal-btn.cancel {
    background: #f0f0f0;
    color: #666;
  }

  .modal-btn.cancel:hover {
    background: #e0e0e0;
  }

  .modal-btn.confirm {
    background: #f44336;
    color: white;
  }

  .modal-btn.confirm:hover {
    background: #d32f2f;
  }

  .auto-populate-options {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .modal-btn.option {
    background: #1a1a2e;
    color: white;
    min-width: 60px;
  }

  .modal-btn.option:hover {
    background: #2a2a4e;
  }
</style>

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface TrackedRequest {
  id: string;
  nickname: string;
  problematic: boolean;
  note: string;
  addedAt: number;
  createdAt?: string; // ISO format from API
  status?: string;
}

export interface TrackedRequestor {
  address: string;
  nickname: string;
  requests: TrackedRequest[];
  addedAt: number;
}

export interface TrackerData {
  requestors: TrackedRequestor[];
  updatedAt?: number;
}

const TRACKER_STORAGE_KEY = 'boundless-requestor-tracker';
const TRACKER_ID_KEY = 'boundless-requestor-tracker-id';
const TRACKER_MIGRATED_KEY = 'boundless-requestor-tracker-migrated';
const TRACKER_CLIENTS_TABLE = 'tracker_clients';
const REQUESTORS_TABLE = 'requestors';
const REQUESTS_TABLE = 'requests';

interface TrackerClientRow {
  updated_at: number | string | null;
}

interface RequestorRow {
  id: string;
  address: string;
  nickname: string | null;
  added_at: number | string | null;
}

interface RequestRow {
  requestor_id: string;
  request_id: string;
  nickname: string | null;
  problematic: boolean | null;
  note: string | null;
  added_at: number | string | null;
  status: string | null;
  created_at: string | null;
}

const SUPABASE_URL =
  import.meta.env.SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL ??
  '';
const SUPABASE_API_KEY =
  import.meta.env.SUPABASE_API_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_API_KEY ??
  '';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_API_KEY);
  }
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_API_KEY);
}

function isTrackerData(value: unknown): value is TrackerData {
  if (!value || typeof value !== 'object') return false;
  const data = value as TrackerData;
  return Array.isArray(data.requestors);
}

function getTrackerUpdatedAt(data: TrackerData | null | undefined): number | null {
  return typeof data?.updatedAt === 'number' ? data.updatedAt : null;
}

function hasTrackerData(data: TrackerData | null | undefined): boolean {
  return Array.isArray(data?.requestors) && data.requestors.length > 0;
}

function getLocalTrackerData(): TrackerData {
  if (typeof localStorage === 'undefined') return { requestors: [] };
  const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
  if (!stored) return { requestors: [] };
  try {
    const parsed = JSON.parse(stored);
    return isTrackerData(parsed) ? parsed : { requestors: [] };
  } catch {
    return { requestors: [] };
  }
}

function setLocalTrackerData(data: TrackerData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(data));
}

function generateTrackerId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `tracker-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getTrackerClientId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  let id = localStorage.getItem(TRACKER_ID_KEY);
  if (!id) {
    id = generateTrackerId();
    localStorage.setItem(TRACKER_ID_KEY, id);
  }
  return id;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildTrackerDataFromRows(
  requestors: RequestorRow[],
  requests: RequestRow[],
  updatedAt: number | null
): TrackerData {
  const fallbackAddedAt = Date.now();
  const requestsByRequestor = new Map<string, TrackedRequest[]>();

  for (const row of requests) {
    const addedAt = parseNumber(row.added_at) ?? fallbackAddedAt;
    const entry: TrackedRequest = {
      id: row.request_id,
      nickname: row.nickname ?? row.request_id,
      problematic: row.problematic ?? false,
      note: row.note ?? '',
      addedAt,
      createdAt: row.created_at ?? undefined,
      status: row.status ?? undefined
    };
    const list = requestsByRequestor.get(row.requestor_id) ?? [];
    list.push(entry);
    requestsByRequestor.set(row.requestor_id, list);
  }

  const normalizedRequestors = requestors.map((row) => {
    const addedAt = parseNumber(row.added_at) ?? fallbackAddedAt;
    const requestList = requestsByRequestor.get(row.id) ?? [];
    requestList.sort((a, b) => a.addedAt - b.addedAt);
    return {
      address: row.address,
      nickname: row.nickname ?? row.address,
      requests: requestList,
      addedAt
    };
  });

  normalizedRequestors.sort((a, b) => a.addedAt - b.addedAt);

  return {
    requestors: normalizedRequestors,
    ...(updatedAt !== null ? { updatedAt } : {})
  };
}

async function fetchRemoteTrackerData(
  client: SupabaseClient,
  clientId: string
): Promise<{ data: TrackerData; updatedAt: number | null }> {
  const { data: clientRow, error: clientError } = await client
    .from(TRACKER_CLIENTS_TABLE)
    .select('updated_at')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError) {
    throw clientError;
  }

  const updatedAt = parseNumber((clientRow as TrackerClientRow | null)?.updated_at);

  const { data: requestorRows, error: requestorError } = await client
    .from(REQUESTORS_TABLE)
    .select('id, address, nickname, added_at')
    .eq('client_id', clientId);

  if (requestorError) {
    throw requestorError;
  }

  const requestors = Array.isArray(requestorRows) ? (requestorRows as RequestorRow[]) : [];
  let requests: RequestRow[] = [];

  if (requestors.length > 0) {
    const requestorIds = requestors.map((row) => row.id);
    const { data: requestRows, error: requestError } = await client
      .from(REQUESTS_TABLE)
      .select('requestor_id, request_id, nickname, problematic, note, added_at, status, created_at')
      .in('requestor_id', requestorIds);

    if (requestError) {
      throw requestError;
    }
    requests = Array.isArray(requestRows) ? (requestRows as RequestRow[]) : [];
  }

  const data = buildTrackerDataFromRows(requestors, requests, updatedAt);
  return { data, updatedAt };
}

async function ensureTrackerClient(
  client: SupabaseClient,
  clientId: string
): Promise<void> {
  const { error } = await client
    .from(TRACKER_CLIENTS_TABLE)
    .upsert({ id: clientId }, { onConflict: 'id' });
  if (error) {
    throw error;
  }
}

async function updateTrackerClientTimestamp(
  client: SupabaseClient,
  clientId: string,
  updatedAt: number
): Promise<void> {
  const { error } = await client
    .from(TRACKER_CLIENTS_TABLE)
    .update({ updated_at: updatedAt })
    .eq('id', clientId);
  if (error) {
    throw error;
  }
}

async function hasRemoteTrackerData(
  client: SupabaseClient,
  clientId: string
): Promise<boolean> {
  const { data, error } = await client
    .from(REQUESTORS_TABLE)
    .select('id')
    .eq('client_id', clientId);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function loadTrackerData(): Promise<TrackerData> {
  const localData = getLocalTrackerData();
  const localUpdatedAt = getTrackerUpdatedAt(localData);
  const localHasData = hasTrackerData(localData);
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId) return localData;

  try {
    const { data: remoteData, updatedAt: remoteUpdatedAt } = await fetchRemoteTrackerData(
      client,
      clientId
    );
    const remoteHasData = hasTrackerData(remoteData);

    if (!localHasData && remoteHasData) {
      setLocalTrackerData(remoteData);
      return remoteData;
    }

    if (remoteUpdatedAt !== null && localUpdatedAt !== null) {
      if (remoteUpdatedAt >= localUpdatedAt) {
        setLocalTrackerData(remoteData);
        return remoteData;
      }
      void saveTrackerDataAsync(localData);
      return localData;
    }

    if (remoteUpdatedAt !== null && localUpdatedAt === null) {
      if (!localHasData) {
        setLocalTrackerData(remoteData);
        return remoteData;
      }
      void saveTrackerDataAsync(localData);
      return localData;
    }

    if (remoteUpdatedAt === null && localUpdatedAt !== null) {
      if (!localHasData && remoteHasData) {
        setLocalTrackerData(remoteData);
        return remoteData;
      }
      void saveTrackerDataAsync(localData);
      return localData;
    }

    if (!localHasData && remoteHasData) {
      setLocalTrackerData(remoteData);
      return remoteData;
    }
  } catch (error) {
    console.warn('Supabase load failed, falling back to localStorage.', error);
  }

  return localData;
}

export async function saveTrackerDataAsync(data: TrackerData): Promise<void> {
  const dataWithTimestamp: TrackerData = { ...data, updatedAt: Date.now() };
  setLocalTrackerData(dataWithTimestamp);
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId) return;

  try {
    await ensureTrackerClient(client, clientId);

    const requestorPayload = dataWithTimestamp.requestors.map((requestor) => ({
      client_id: clientId,
      address: requestor.address,
      nickname: requestor.nickname,
      added_at: requestor.addedAt
    }));

    if (requestorPayload.length > 0) {
      const { error: upsertRequestorError } = await client
        .from(REQUESTORS_TABLE)
        .upsert(requestorPayload, { onConflict: 'client_id,address' });
      if (upsertRequestorError) {
        throw upsertRequestorError;
      }
    }

    const { data: requestorRows, error: fetchRequestorsError } = await client
      .from(REQUESTORS_TABLE)
      .select('id, address')
      .eq('client_id', clientId);
    if (fetchRequestorsError) {
      throw fetchRequestorsError;
    }

    const remoteRequestors = Array.isArray(requestorRows)
      ? (requestorRows as Array<{ id: string; address: string }>)
      : [];
    const localAddressSet = new Set(dataWithTimestamp.requestors.map((r) => r.address));
    const removedRequestorIds = remoteRequestors
      .filter((row) => !localAddressSet.has(row.address))
      .map((row) => row.id);

    if (removedRequestorIds.length > 0) {
      const { error: deleteRequestorsError } = await client
        .from(REQUESTORS_TABLE)
        .delete()
        .in('id', removedRequestorIds);
      if (deleteRequestorsError) {
        throw deleteRequestorsError;
      }
    }

    const activeRequestors = remoteRequestors.filter((row) =>
      localAddressSet.has(row.address)
    );
    const requestorIdByAddress = new Map(
      activeRequestors.map((row) => [row.address, row.id])
    );
    const activeRequestorIds = activeRequestors.map((row) => row.id);

    if (activeRequestorIds.length > 0) {
      const { error: deleteRequestsError } = await client
        .from(REQUESTS_TABLE)
        .delete()
        .in('requestor_id', activeRequestorIds);
      if (deleteRequestsError) {
        throw deleteRequestsError;
      }
    }

    const requestPayload = dataWithTimestamp.requestors.flatMap((requestor) => {
      const requestorId = requestorIdByAddress.get(requestor.address);
      if (!requestorId) return [];
      return requestor.requests.map((request) => ({
        requestor_id: requestorId,
        request_id: request.id,
        nickname: request.nickname,
        problematic: request.problematic,
        note: request.note,
        added_at: request.addedAt,
        status: request.status ?? null,
        created_at: request.createdAt ?? null
      }));
    });

    if (requestPayload.length > 0) {
      const { error: insertRequestsError } = await client
        .from(REQUESTS_TABLE)
        .insert(requestPayload);
      if (insertRequestsError) {
        throw insertRequestsError;
      }
    }

    await updateTrackerClientTimestamp(client, clientId, dataWithTimestamp.updatedAt ?? Date.now());
  } catch (error) {
    console.warn('Supabase save failed, data kept in localStorage.', error);
  }
}

export async function migrateLocalStorageToSupabase(): Promise<void> {
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId || typeof localStorage === 'undefined') return;
  if (localStorage.getItem(TRACKER_MIGRATED_KEY) === 'true') return;

  try {
    const remoteHasData = await hasRemoteTrackerData(client, clientId);
    const latestLocalData = getLocalTrackerData();
    const latestLocalHasData = latestLocalData.requestors.length > 0;

    if (!remoteHasData && latestLocalHasData) {
      const freshRemoteHasData = await hasRemoteTrackerData(client, clientId);
      if (!freshRemoteHasData) {
        await saveTrackerDataAsync(latestLocalData);
      }
    } else if (latestLocalHasData) {
      const dataWithTimestamp: TrackerData = {
        ...latestLocalData,
        updatedAt: Date.now()
      };
      setLocalTrackerData(dataWithTimestamp);
    }
    localStorage.setItem(TRACKER_MIGRATED_KEY, 'true');
  } catch (error) {
    console.warn('Supabase migration failed.', error);
  }
}

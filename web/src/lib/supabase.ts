import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface TrackedRequest {
  id: string;
  nickname: string;
  problematic: boolean;
  note: string;
  addedAt: number;
  // Auto-fetched metadata
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
}

const TRACKER_STORAGE_KEY = 'boundless-requestor-tracker';
const TRACKER_ID_KEY = 'boundless-requestor-tracker-id';
const TRACKER_MIGRATED_KEY = 'boundless-requestor-tracker-migrated';
const TRACKER_TABLE = 'requestor_tracker';

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

function isTrackerData(value: unknown): value is TrackerData {
  if (!value || typeof value !== 'object') return false;
  const data = value as TrackerData;
  return Array.isArray(data.requestors);
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

function getTrackerClientId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  let id = localStorage.getItem(TRACKER_ID_KEY);
  if (!id) {
    const generated =
      globalThis.crypto?.randomUUID?.() ??
      `tracker-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    id = generated;
    localStorage.setItem(TRACKER_ID_KEY, id);
  }
  return id;
}

export async function loadTrackerData(): Promise<TrackerData> {
  const localData = getLocalTrackerData();
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId) return localData;

  try {
    const { data, error } = await client
      .from(TRACKER_TABLE)
      .select('data')
      .eq('id', clientId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (isTrackerData(data?.data)) {
      setLocalTrackerData(data.data);
      return data.data;
    }
  } catch (error) {
    console.warn('Supabase load failed, falling back to localStorage.', error);
  }

  return localData;
}

export async function saveTrackerDataAsync(data: TrackerData): Promise<void> {
  setLocalTrackerData(data);
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId) return;

  try {
    const { error } = await client
      .from(TRACKER_TABLE)
      .upsert({ id: clientId, data }, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Supabase save failed, data kept in localStorage.', error);
  }
}

export async function migrateLocalStorageToSupabase(): Promise<void> {
  const client = getSupabaseClient();
  const clientId = getTrackerClientId();
  if (!client || !clientId || typeof localStorage === 'undefined') return;
  if (localStorage.getItem(TRACKER_MIGRATED_KEY) === 'true') return;

  const localData = getLocalTrackerData();

  try {
    const { data, error } = await client
      .from(TRACKER_TABLE)
      .select('data')
      .eq('id', clientId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const remoteHasData = isTrackerData(data?.data) && data.data.requestors.length > 0;
    if (!remoteHasData && localData.requestors.length > 0) {
      const { error: upsertError } = await client
        .from(TRACKER_TABLE)
        .upsert({ id: clientId, data: localData }, { onConflict: 'id' });
      if (upsertError) {
        throw upsertError;
      }
    }

    localStorage.setItem(TRACKER_MIGRATED_KEY, 'true');
  } catch (error) {
    console.warn('Supabase migration failed.', error);
  }
}

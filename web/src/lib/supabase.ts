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
  updatedAt?: number;
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
  const localUpdatedAt = getTrackerUpdatedAt(localData);
  const localHasData = hasTrackerData(localData);
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
      const remoteData = data.data;
      const remoteUpdatedAt = getTrackerUpdatedAt(remoteData);
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
    const { error } = await client
      .from(TRACKER_TABLE)
      .upsert({ id: clientId, data: dataWithTimestamp }, { onConflict: 'id' });
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
    const latestLocalData = getLocalTrackerData();
    const latestLocalHasData = latestLocalData.requestors.length > 0;

    if (!remoteHasData && latestLocalHasData) {
      const { data: freshData, error: freshError } = await client
        .from(TRACKER_TABLE)
        .select('data')
        .eq('id', clientId)
        .maybeSingle();
      if (freshError) {
        throw freshError;
      }

      const freshRemoteHasData =
        isTrackerData(freshData?.data) && freshData.data.requestors.length > 0;
      if (!freshRemoteHasData) {
        const dataWithTimestamp: TrackerData = {
          ...latestLocalData,
          updatedAt: Date.now()
        };
        const { error: upsertError } = await client
          .from(TRACKER_TABLE)
          .upsert({ id: clientId, data: dataWithTimestamp }, { onConflict: 'id' });
        if (upsertError) {
          throw upsertError;
        }
        setLocalTrackerData(dataWithTimestamp);
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

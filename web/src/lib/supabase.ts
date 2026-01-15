import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - uses environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// localStorage fallback key (same as existing)
const TRACKER_STORAGE_KEY = 'boundless-requestor-tracker';

// Types matching existing App.svelte definitions
export interface TrackedRequest {
  id: string;
  nickname: string;
  problematic: boolean;
  note: string;
  addedAt: number;
  createdAt?: string;
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

// Supabase client singleton
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Load from localStorage (existing behavior)
function loadFromLocalStorage(): TrackerData {
  if (typeof localStorage === 'undefined') return { requestors: [] };
  const stored = localStorage.getItem(TRACKER_STORAGE_KEY);
  if (!stored) return { requestors: [] };
  try {
    return JSON.parse(stored);
  } catch {
    return { requestors: [] };
  }
}

// Save to localStorage
function saveToLocalStorage(data: TrackerData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(data));
}

// Load tracker data: Supabase-first with localStorage fallback
export async function loadTrackerData(): Promise<TrackerData> {
  const client = getSupabaseClient();

  // If Supabase not configured, use localStorage
  if (!client) {
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await client
      .from('tracker_data')
      .select('data')
      .eq('id', 'default')
      .single();

    if (error) {
      // If no record exists or other error, fall back to localStorage
      console.warn('Supabase load failed, using localStorage:', error.message);
      return loadFromLocalStorage();
    }

    return data?.data as TrackerData || { requestors: [] };
  } catch (e) {
    console.warn('Supabase load error, using localStorage:', e);
    return loadFromLocalStorage();
  }
}

// Save tracker data: saves to both Supabase and localStorage
export async function saveTrackerData(trackerData: TrackerData): Promise<void> {
  // Always save to localStorage for offline support
  saveToLocalStorage(trackerData);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('tracker_data')
      .upsert({
        id: 'default',
        data: trackerData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Supabase save failed:', error.message);
    }
  } catch (e) {
    console.warn('Supabase save error:', e);
  }
}

// One-time migration from localStorage to Supabase
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const localData = loadFromLocalStorage();

  // Nothing to migrate if localStorage is empty
  if (localData.requestors.length === 0) {
    return false;
  }

  try {
    // Check if Supabase already has data
    const { data: existing } = await client
      .from('tracker_data')
      .select('data')
      .eq('id', 'default')
      .single();

    const existingData = existing?.data as TrackerData | null;

    // If Supabase already has data with requestors, skip migration
    if (existingData && existingData.requestors && existingData.requestors.length > 0) {
      return false;
    }

    // Migrate localStorage data to Supabase
    const { error } = await client
      .from('tracker_data')
      .upsert({
        id: 'default',
        data: localData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Migration failed:', error.message);
      return false;
    }

    console.log('Successfully migrated localStorage data to Supabase');
    return true;
  } catch (e) {
    console.warn('Migration error:', e);
    return false;
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client before importing the module
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert
}));

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}));

describe('supabase module', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { storage = {}; })
    });

    vi.stubGlobal('crypto', { randomUUID: () => 'test-id' });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isSupabaseConfigured', () => {
    it('returns false when env vars are not set', async () => {
      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { isSupabaseConfigured } = await import('./supabase');
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('loadTrackerData', () => {
    it('returns empty requestors when localStorage is empty and Supabase not configured', async () => {
      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual({ requestors: [] });
    });

    it('loads from localStorage when no Supabase config', async () => {
      const testData = {
        requestors: [{
          address: '0x123',
          nickname: 'Test',
          requests: [],
          addedAt: Date.now()
        }]
      };
      storage['boundless-requestor-tracker'] = JSON.stringify(testData);

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(testData);
    });

    it('handles malformed localStorage JSON gracefully', async () => {
      storage['boundless-requestor-tracker'] = 'not valid json {{{';

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual({ requestors: [] });
    });

    it('loads from Supabase when configured and has data', async () => {
      const supabaseData = {
        requestors: [{
          address: '0xabc',
          nickname: 'Supabase',
          requests: [],
          addedAt: Date.now()
        }]
      };

      mockMaybeSingle.mockResolvedValueOnce({
        data: { data: supabaseData },
        error: null
      });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(supabaseData);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'boundless-requestor-tracker',
        JSON.stringify(supabaseData)
      );
    });

    it('falls back to localStorage when Supabase returns error', async () => {
      const localData = {
        requestors: [{
          address: '0xlocal',
          nickname: 'Local',
          requests: [],
          addedAt: Date.now()
        }]
      };
      storage['boundless-requestor-tracker'] = JSON.stringify(localData);

      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(localData);
    });
  });

  describe('saveTrackerDataAsync', () => {
    it('saves to localStorage only when Supabase not configured', async () => {
      const testData = {
        requestors: [{
          address: '0x456',
          nickname: 'Save Test',
          requests: [],
          addedAt: Date.now()
        }]
      };

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { saveTrackerDataAsync } = await import('./supabase');
      await saveTrackerDataAsync(testData);

      const savedValue = storage['boundless-requestor-tracker'];
      const parsed = savedValue ? JSON.parse(savedValue) : null;
      expect(parsed?.requestors).toEqual(testData.requestors);
      expect(typeof parsed?.updatedAt).toBe('number');
    });

    it('saves to both localStorage and Supabase when configured', async () => {
      const testData = {
        requestors: [{
          address: '0x789',
          nickname: 'Dual Save',
          requests: [],
          addedAt: Date.now()
        }]
      };

      mockUpsert.mockResolvedValueOnce({ error: null });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { saveTrackerDataAsync } = await import('./supabase');
      await saveTrackerDataAsync(testData);

      expect(mockFrom).toHaveBeenCalledWith('requestor_tracker');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          data: expect.objectContaining({
            requestors: testData.requestors,
            updatedAt: expect.any(Number)
          })
        }),
        { onConflict: 'id' }
      );
    });

    it('continues saving to localStorage even when Supabase fails', async () => {
      const testData = { requestors: [] };

      mockUpsert.mockResolvedValueOnce({ error: { message: 'Network error' } });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { saveTrackerDataAsync } = await import('./supabase');
      await expect(saveTrackerDataAsync(testData)).resolves.not.toThrow();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('migrateLocalStorageToSupabase', () => {
    it('no-ops when Supabase not configured', async () => {
      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_API_KEY', '');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('marks migrated when localStorage is empty', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { data: { requestors: [] } },
        error: null
      });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(storage['boundless-requestor-tracker-migrated']).toBe('true');
    });

    it('migrates localStorage data when Supabase is empty', async () => {
      const localData = {
        requestors: [{ address: '0x333', nickname: 'Migrate Me', requests: [], addedAt: 3 }]
      };
      storage['boundless-requestor-tracker'] = JSON.stringify(localData);

      mockMaybeSingle
        .mockResolvedValueOnce({ data: { data: { requestors: [] } }, error: null })
        .mockResolvedValueOnce({ data: { data: { requestors: [] } }, error: null });
      mockUpsert.mockResolvedValueOnce({ error: null });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          data: expect.objectContaining({
            requestors: localData.requestors,
            updatedAt: expect.any(Number)
          })
        }),
        { onConflict: 'id' }
      );
      expect(storage['boundless-requestor-tracker-migrated']).toBe('true');
    });

    it('skips migration when Supabase already has data', async () => {
      storage['boundless-requestor-tracker'] = JSON.stringify({
        requestors: [{ address: '0x111', nickname: 'Local', requests: [], addedAt: 1 }]
      });

      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          data: { requestors: [{ address: '0x222', nickname: 'Remote', requests: [], addedAt: 2 }] }
        },
        error: null
      });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(mockUpsert).not.toHaveBeenCalled();
      expect(storage['boundless-requestor-tracker-migrated']).toBe('true');
    });
  });

  describe('TrackerData types', () => {
    it('exports correct type shapes', async () => {
      vi.resetModules();
      const { isSupabaseConfigured } = await import('./supabase');

      expect(typeof isSupabaseConfigured).toBe('function');
    });
  });
});

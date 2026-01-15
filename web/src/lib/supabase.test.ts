import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client before importing the module
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert
}));

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}));

// Mock import.meta.env
const originalEnv = import.meta.env;

describe('supabase module', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    storage = {};

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { storage = {}; })
    });

    // Reset chain returns
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isSupabaseConfigured', () => {
    it('returns false when env vars are not set', async () => {
      // Re-import with fresh env state
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { isSupabaseConfigured } = await import('./supabase');
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('loadTrackerData', () => {
    it('returns empty requestors when localStorage is empty and Supabase not configured', async () => {
      vi.resetModules();
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
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(testData);
    });

    it('handles malformed localStorage JSON gracefully', async () => {
      storage['boundless-requestor-tracker'] = 'not valid json {{{';

      vi.resetModules();
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

      mockSingle.mockResolvedValueOnce({
        data: { data: supabaseData },
        error: null
      });

      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(supabaseData);
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

      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { loadTrackerData } = await import('./supabase');
      const result = await loadTrackerData();

      expect(result).toEqual(localData);
    });
  });

  describe('saveTrackerData', () => {
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
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { saveTrackerData } = await import('./supabase');
      await saveTrackerData(testData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'boundless-requestor-tracker',
        JSON.stringify(testData)
      );
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
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { saveTrackerData } = await import('./supabase');
      await saveTrackerData(testData);

      // localStorage save
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'boundless-requestor-tracker',
        JSON.stringify(testData)
      );

      // Supabase save
      expect(mockFrom).toHaveBeenCalledWith('tracker_data');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          data: testData
        })
      );
    });

    it('continues saving to localStorage even when Supabase fails', async () => {
      const testData = { requestors: [] };

      mockUpsert.mockResolvedValueOnce({ error: { message: 'Network error' } });

      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { saveTrackerData } = await import('./supabase');

      // Should not throw
      await expect(saveTrackerData(testData)).resolves.not.toThrow();

      // localStorage should still be called
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('migrateLocalStorageToSupabase', () => {
    it('returns false when Supabase not configured', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      const result = await migrateLocalStorageToSupabase();

      expect(result).toBe(false);
    });

    it('returns false when localStorage is empty', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      const result = await migrateLocalStorageToSupabase();

      expect(result).toBe(false);
    });

    it('returns false when Supabase already has data', async () => {
      storage['boundless-requestor-tracker'] = JSON.stringify({
        requestors: [{ address: '0x111', nickname: 'Local', requests: [], addedAt: 1 }]
      });

      mockSingle.mockResolvedValueOnce({
        data: {
          data: { requestors: [{ address: '0x222', nickname: 'Remote', requests: [], addedAt: 2 }] }
        },
        error: null
      });

      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      const result = await migrateLocalStorageToSupabase();

      expect(result).toBe(false);
    });

    it('migrates localStorage data when Supabase is empty', async () => {
      const localData = {
        requestors: [{ address: '0x333', nickname: 'Migrate Me', requests: [], addedAt: 3 }]
      };
      storage['boundless-requestor-tracker'] = JSON.stringify(localData);

      // First call: check existing data
      mockSingle.mockResolvedValueOnce({
        data: { data: { requestors: [] } },
        error: null
      });

      // Upsert succeeds
      mockUpsert.mockResolvedValueOnce({ error: null });

      vi.resetModules();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      const result = await migrateLocalStorageToSupabase();

      expect(result).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          data: localData
        })
      );
    });
  });

  describe('TrackerData types', () => {
    it('exports correct type shapes', async () => {
      vi.resetModules();
      const { isSupabaseConfigured } = await import('./supabase');

      // Type checking is compile-time, but we can verify the module exports work
      expect(typeof isSupabaseConfigured).toBe('function');
    });
  });
});

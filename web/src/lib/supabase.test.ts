import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client before importing the module
const mockTrackerClientsSelect = vi.fn();
const mockTrackerClientsEq = vi.fn();
const mockTrackerClientsMaybeSingle = vi.fn();
const mockTrackerClientsUpsert = vi.fn();
const mockTrackerClientsUpdate = vi.fn();
const mockTrackerClientsUpdateEq = vi.fn();

const mockRequestorsSelect = vi.fn();
const mockRequestorsEq = vi.fn();
const mockRequestorsUpsert = vi.fn();
const mockRequestorsDelete = vi.fn();
const mockRequestorsDeleteIn = vi.fn();

const mockRequestsSelect = vi.fn();
const mockRequestsIn = vi.fn();
const mockRequestsDelete = vi.fn();
const mockRequestsDeleteIn = vi.fn();
const mockRequestsInsert = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'tracker_clients') {
    return {
      select: mockTrackerClientsSelect,
      upsert: mockTrackerClientsUpsert,
      update: mockTrackerClientsUpdate
    };
  }
  if (table === 'requestors') {
    return {
      select: mockRequestorsSelect,
      upsert: mockRequestorsUpsert,
      delete: mockRequestorsDelete
    };
  }
  if (table === 'requests') {
    return {
      select: mockRequestsSelect,
      delete: mockRequestsDelete,
      insert: mockRequestsInsert
    };
  }
  return {
    select: mockTrackerClientsSelect,
    upsert: mockTrackerClientsUpsert
  };
});

mockTrackerClientsSelect.mockReturnValue({ eq: mockTrackerClientsEq });
mockTrackerClientsEq.mockReturnValue({ maybeSingle: mockTrackerClientsMaybeSingle });
mockTrackerClientsUpdate.mockReturnValue({ eq: mockTrackerClientsUpdateEq });

mockRequestorsSelect.mockReturnValue({ eq: mockRequestorsEq });
mockRequestorsDelete.mockReturnValue({ in: mockRequestorsDeleteIn });

mockRequestsSelect.mockReturnValue({ in: mockRequestsIn });
mockRequestsDelete.mockReturnValue({ in: mockRequestsDeleteIn });

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

    mockTrackerClientsSelect.mockReturnValue({ eq: mockTrackerClientsEq });
    mockTrackerClientsEq.mockReturnValue({ maybeSingle: mockTrackerClientsMaybeSingle });
    mockTrackerClientsUpdate.mockReturnValue({ eq: mockTrackerClientsUpdateEq });

    mockRequestorsSelect.mockReturnValue({ eq: mockRequestorsEq });
    mockRequestorsDelete.mockReturnValue({ in: mockRequestorsDeleteIn });

    mockRequestsSelect.mockReturnValue({ in: mockRequestsIn });
    mockRequestsDelete.mockReturnValue({ in: mockRequestsDeleteIn });
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
          requests: [{
            id: '0xreq',
            nickname: 'Req',
            problematic: true,
            note: 'note',
            addedAt: 1100,
            createdAt: '2026-01-01T00:00:00Z',
            status: 'submitted'
          }],
          addedAt: 1000
        }],
        updatedAt: 123
      };

      mockTrackerClientsMaybeSingle.mockResolvedValueOnce({
        data: { updated_at: 123 },
        error: null
      });
      mockRequestorsEq.mockResolvedValueOnce({
        data: [{ id: 'req-1', address: '0xabc', nickname: 'Supabase', added_at: 1000 }],
        error: null
      });
      mockRequestsIn.mockResolvedValueOnce({
        data: [{
          requestor_id: 'req-1',
          request_id: '0xreq',
          nickname: 'Req',
          problematic: true,
          note: 'note',
          added_at: 1100,
          status: 'submitted',
          created_at: '2026-01-01T00:00:00Z'
        }],
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

      mockTrackerClientsMaybeSingle.mockResolvedValueOnce({
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
          requests: [{
            id: '0xreq',
            nickname: 'Req',
            problematic: false,
            note: '',
            addedAt: 2000,
            createdAt: '2026-01-02T00:00:00Z',
            status: 'submitted'
          }],
          addedAt: Date.now()
        }]
      };

      mockTrackerClientsUpsert.mockResolvedValueOnce({ error: null });
      mockRequestorsUpsert.mockResolvedValueOnce({ error: null });
      mockRequestorsEq.mockResolvedValueOnce({
        data: [{ id: 'req-1', address: '0x789' }],
        error: null
      });
      mockRequestsDeleteIn.mockResolvedValueOnce({ error: null });
      mockRequestsInsert.mockResolvedValueOnce({ error: null });
      mockTrackerClientsUpdateEq.mockResolvedValueOnce({ error: null });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { saveTrackerDataAsync } = await import('./supabase');
      await saveTrackerDataAsync(testData);

      expect(mockFrom).toHaveBeenCalledWith('tracker_clients');
      expect(mockFrom).toHaveBeenCalledWith('requestors');
      expect(mockFrom).toHaveBeenCalledWith('requests');
      expect(mockTrackerClientsUpsert).toHaveBeenCalledWith(
        { id: 'test-id' },
        { onConflict: 'id' }
      );
      expect(mockRequestorsUpsert).toHaveBeenCalledWith(
        [{
          client_id: 'test-id',
          address: '0x789',
          nickname: 'Dual Save',
          added_at: testData.requestors[0].addedAt
        }],
        { onConflict: 'client_id,address' }
      );
      expect(mockRequestsDeleteIn).toHaveBeenCalledWith(
        'requestor_id',
        ['req-1']
      );
      expect(mockRequestsInsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          requestor_id: 'req-1',
          request_id: '0xreq',
          nickname: 'Req',
          problematic: false,
          note: '',
          added_at: 2000,
          status: 'submitted',
          created_at: '2026-01-02T00:00:00Z'
        })]
      );
      expect(mockTrackerClientsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ updated_at: expect.any(Number) })
      );
      expect(mockTrackerClientsUpdateEq).toHaveBeenCalledWith('id', 'test-id');
    });

    it('continues saving to localStorage even when Supabase fails', async () => {
      const testData = { requestors: [] };

      mockTrackerClientsUpsert.mockResolvedValueOnce({ error: { message: 'Network error' } });

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
      mockRequestorsEq.mockResolvedValueOnce({
        data: [],
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

      mockRequestorsEq
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [{ id: 'req-1', address: '0x333' }],
          error: null
        });
      mockTrackerClientsUpsert.mockResolvedValueOnce({ error: null });
      mockRequestorsUpsert.mockResolvedValueOnce({ error: null });
      mockRequestsDeleteIn.mockResolvedValueOnce({ error: null });
      mockTrackerClientsUpdateEq.mockResolvedValueOnce({ error: null });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(mockTrackerClientsUpsert).toHaveBeenCalledWith(
        { id: 'test-id' },
        { onConflict: 'id' }
      );
      expect(mockRequestorsUpsert).toHaveBeenCalled();
      expect(storage['boundless-requestor-tracker-migrated']).toBe('true');
    });

    it('skips migration when Supabase already has data', async () => {
      storage['boundless-requestor-tracker'] = JSON.stringify({
        requestors: [{ address: '0x111', nickname: 'Local', requests: [], addedAt: 1 }]
      });

      mockRequestorsEq.mockResolvedValueOnce({
        data: [{ id: 'req-2', address: '0x222' }],
        error: null
      });

      vi.resetModules();
      vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('SUPABASE_API_KEY', 'test-key');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { migrateLocalStorageToSupabase } = await import('./supabase');
      await migrateLocalStorageToSupabase();

      expect(mockTrackerClientsUpsert).not.toHaveBeenCalled();
      expect(mockRequestorsUpsert).not.toHaveBeenCalled();
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

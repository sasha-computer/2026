import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApi, BASE_URL } from '../src/lib/api/client';
import { ApiError } from '../src/types/types';

describe('fetchApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs URL with base URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as Response);

    await fetchApi('/health');

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/health`);
  });

  it('appends query params to URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchApi('/v1/market/requests', { limit: 10, offset: 5 });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('offset=5');
  });

  it('filters out undefined params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchApi('/test', { defined: 'yes', undef: undefined });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('defined=yes');
    expect(calledUrl).not.toContain('undef');
  });

  it('filters out empty string params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await fetchApi('/test', { filled: 'value', empty: '' });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('filled=value');
    expect(calledUrl).not.toContain('empty');
  });

  it('throws ApiError on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    try {
      await fetchApi('/missing');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e).toMatchObject({
        status: 404,
        statusText: 'Not Found',
      });
    }
  });

  it('returns parsed JSON on success', async () => {
    const mockData = { chain_id: 8453, status: 'healthy' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchApi('/health');
    expect(result).toEqual(mockData);
  });
});

describe('BASE_URL', () => {
  it('points to correct API', () => {
    expect(BASE_URL).toBe('https://d2mdvlnmyov1e1.cloudfront.net');
  });
});

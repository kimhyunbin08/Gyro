import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

function mockResponse(
  status: number,
  options: { location?: string; url?: string; body?: { cancel: () => Promise<void> } | null } = {},
): Response {
  const headers = new Headers();
  if (options.location) headers.set('location', options.location);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    url: options.url ?? '',
    body: options.body ?? null,
  } as unknown as Response;
}

describe('checkServiceHealth', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.resetModules();
    const dns = await import('node:dns/promises');
    vi.mocked(dns.lookup).mockReset();
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalEnv;
  });

  it('short-circuits to healthy under NODE_ENV=test without calling fetch', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    const result = await checkServiceHealth('https://example.com');
    expect(result.status).toBe('healthy');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('marks a service unhealthy when the live request fails, bypassing the test short-circuit', async () => {
    process.env.NODE_ENV = 'production';
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    const result = await checkServiceHealth('https://dead-exhibit.example');
    expect(result.status).toBe('unhealthy');
  });

  it('marks a service healthy on a 2xx response and falls back from HEAD to GET on 405', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(405))
      .mockResolvedValueOnce(mockResponse(200));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    const result = await checkServiceHealth('https://head-not-allowed.example');
    expect(result.status).toBe('healthy');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rechecks expired entries before exposing a dead service and recovers on the next check', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200));
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const { checkServiceHealth, clearHealthCheckCacheForTests } = await import(
        '../src/services/health-check.service.js'
      );
      clearHealthCheckCacheForTests();

      const first = await checkServiceHealth('https://stale-after-ttl.example');
      expect(first.status).toBe('healthy');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Advance past the 10-minute TTL so the cache entry is expired.
      vi.advanceTimersByTime(11 * 60 * 1000);
      fetchMock.mockResolvedValue(mockResponse(503));

      const second = await checkServiceHealth('https://stale-after-ttl.example');
      expect(second.status).toBe('unhealthy');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const third = await checkServiceHealth('https://stale-after-ttl.example');
      expect(third.status).toBe('unhealthy');
      vi.advanceTimersByTime(10 * 60 * 1000);
      fetchMock.mockResolvedValue(mockResponse(200));
      expect((await checkServiceHealth('https://stale-after-ttl.example')).status).toBe('healthy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('records a successful redirect, shares concurrent checks and keeps checking the original URL', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(302, { location: 'https://new.example/app' }))
      .mockResolvedValueOnce(mockResponse(200))
      .mockResolvedValueOnce(mockResponse(404));
    globalThis.fetch = fetchMock;
    const { checkServiceHealth, resolveServiceUrl } = await import('../src/services/health-check.service.js');
    const [first, concurrent] = await Promise.all([
      checkServiceHealth('https://old.example'),
      checkServiceHealth('https://old.example'),
    ]);
    expect(first).toEqual(concurrent);
    expect(first).toMatchObject({ sourceUrl: 'https://old.example', resolvedUrl: 'https://new.example/app', urlChanged: true, httpStatus: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resolveServiceUrl('https://old.example')).toBe('https://new.example/app');
    expect((await checkServiceHealth('https://old.example', true)).resolvedUrl).toBe('https://old.example');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('https://old.example/');
    expect(resolveServiceUrl('https://old.example')).toBe('https://old.example');
  });

  it('reports a timeout as unhealthy and cancels GET bodies after a HEAD 501 fallback', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    const cancel = vi.fn().mockResolvedValue(undefined);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(501, { body: { cancel } }))
      .mockResolvedValueOnce(mockResponse(200));
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    expect((await checkServiceHealth('https://fallback.example')).status).toBe('healthy');
    expect(cancel).toHaveBeenCalledOnce();
    globalThis.fetch = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = checkServiceHealth('https://timeout.example');
    await vi.advanceTimersByTimeAsync(4000);
    expect(await pending).toMatchObject({ status: 'unhealthy', error: 'aborted' });
  });

  it('checks all unique URLs at startup and every ten minutes without visitor requests, then stops', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(200));
    globalThis.fetch = fetchMock;
    const { startCatalogHealthMonitor, checkServiceHealth, HEALTH_CHECK_INTERVAL_MS } = await import('../src/services/health-check.service.js');
    const stop = startCatalogHealthMonitor(['https://a.example', 'https://a.example', 'https://b.example']);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValue(mockResponse(503));
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((await checkServiceHealth('https://a.example')).status).toBe('unhealthy');
    expect(console.info).toHaveBeenCalled();
    stop();
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects private DNS destinations and redirects before making the request', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(302, { location: 'https://internal.example/admin' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const dns = await import('node:dns/promises');
    vi.mocked(dns.lookup)
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValueOnce([{ address: '10.0.0.7', family: 4 }]);
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    const result = await checkServiceHealth('https://public.example');
    expect(result.status).toBe('unhealthy');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://public.example/',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('limits sweep concurrency to five and does not overlap a slow sweep', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    const complete: Array<(value: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => complete.push(resolve)));
    globalThis.fetch = fetchMock;
    const { startCatalogHealthMonitor, HEALTH_CHECK_INTERVAL_MS } = await import('../src/services/health-check.service.js');
    const stop = startCatalogHealthMonitor(Array.from({ length: 8 }, (_, index) => `https://example.com/${index}`));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    stop();
    for (const resolve of complete) resolve(new Response(null, { status: 200 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

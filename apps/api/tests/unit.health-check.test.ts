import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('checkServiceHealth', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
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
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    const result = await checkServiceHealth('https://head-not-allowed.example');
    expect(result.status).toBe('healthy');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects private literal destinations and redirects before issuing another request', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: new Headers({ location: 'http://127.0.0.1/admin' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { checkServiceHealth, isPublicHealthCheckAddress } = await import('../src/services/health-check.service.js');

    expect(isPublicHealthCheckAddress('8.8.8.8')).toBe(true);
    expect(isPublicHealthCheckAddress('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicHealthCheckAddress('fd00::1')).toBe(false);
    expect((await checkServiceHealth('http://127.0.0.1')).status).toBe('unhealthy');
    expect((await checkServiceHealth('https://public-redirect.example')).status).toBe('unhealthy');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects HTTPS redirects that downgrade to HTTP', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 301,
      headers: new Headers({ location: 'http://public-target.example/' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { checkServiceHealth } = await import('../src/services/health-check.service.js');
    expect((await checkServiceHealth('https://secure-source.example')).status).toBe('unhealthy');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rechecks expired entries before exposing a dead service and recovers on the next check', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
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
      fetchMock.mockResolvedValue({ ok: false, status: 503 });

      const second = await checkServiceHealth('https://stale-after-ttl.example');
      expect(second.status).toBe('unhealthy');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const third = await checkServiceHealth('https://stale-after-ttl.example');
      expect(third.status).toBe('unhealthy');
      vi.advanceTimersByTime(10 * 60 * 1000);
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      expect((await checkServiceHealth('https://stale-after-ttl.example')).status).toBe('healthy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('records manually followed redirects, shares concurrent checks and keeps checking the original URL', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 302, headers: new Headers({ location: 'https://new.example/app' }) })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
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
    expect(fetchMock.mock.calls[2][0]).toBe('https://old.example/');
    expect(resolveServiceUrl('https://old.example')).toBe('https://old.example');
  });

  it('reports a timeout as unhealthy and cancels GET bodies after a HEAD 501 fallback', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    const cancel = vi.fn().mockResolvedValue(undefined);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 501 })
      .mockResolvedValueOnce({ ok: true, status: 200, body: { cancel } });
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;
    const { startCatalogHealthMonitor, checkServiceHealth, HEALTH_CHECK_INTERVAL_MS } = await import('../src/services/health-check.service.js');
    const stop = startCatalogHealthMonitor(['https://a.example', 'https://a.example', 'https://b.example']);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((await checkServiceHealth('https://a.example')).status).toBe('unhealthy');
    expect(console.info).toHaveBeenCalled();
    stop();
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('limits sweep concurrency to five and does not overlap a slow sweep', async () => {
    process.env.NODE_ENV = 'production';
    vi.useFakeTimers();
    const complete: Array<(value: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => complete.push(resolve)));
    globalThis.fetch = fetchMock;
    const { startCatalogHealthMonitor, HEALTH_CHECK_INTERVAL_MS } = await import('../src/services/health-check.service.js');
    const stop = startCatalogHealthMonitor(Array.from({ length: 8 }, (_, index) => `https://example.com/${index}`));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    stop();
    for (const resolve of complete) resolve(new Response(null, { status: 200 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

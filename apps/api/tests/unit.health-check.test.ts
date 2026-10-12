import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('checkServiceHealth', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
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

  it('serves a stale cache entry immediately past the TTL instead of blocking on a new live check', async () => {
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
      // The expired-but-stale value is returned synchronously (no new network
      // call has resolved yet), proving the call didn't block on a live check.
      expect(second.status).toBe('healthy');

      // Let the background refresh (kicked off as a microtask) settle.
      await vi.runAllTimersAsync();
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const third = await checkServiceHealth('https://stale-after-ttl.example');
      expect(third.status).toBe('unhealthy');
    } finally {
      vi.useRealTimers();
    }
  });
});

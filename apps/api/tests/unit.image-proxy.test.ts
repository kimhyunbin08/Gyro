import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { rm } from 'node:fs/promises';

// Isolated cache dir per test run so this suite never touches (or is
// affected by) a real developer machine's temp directory contents.
const TEST_CACHE_DIR = path.join(os.tmpdir(), `gyro-image-cache-test-${Date.now()}`);

describe('getServiceImage', () => {
  const originalFetch = globalThis.fetch;
  const originalCacheDirEnv = process.env.IMAGE_CACHE_DIR;

  beforeEach(() => {
    vi.resetModules();
    process.env.IMAGE_CACHE_DIR = TEST_CACHE_DIR;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    if (originalCacheDirEnv === undefined) delete process.env.IMAGE_CACHE_DIR;
    else process.env.IMAGE_CACHE_DIR = originalCacheDirEnv;
    await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  });

  it('fetches a real screenshot via the microlink API and returns it as PNG', async () => {
    const pngBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => pngBytes.buffer });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { getServiceImage } = await import('../src/image-proxy.js');

    const result = await getServiceImage('https://example.com', 'Example Service');

    expect(result.contentType).toBe('image/png');
    expect(Buffer.from(result.data as Buffer).equals(Buffer.from(pngBytes))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.microlink.io');
  });

  it('caches a fetched screenshot on disk so a second call for the same URL skips the network', async () => {
    const pngBytes = new Uint8Array([9, 9, 9]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => pngBytes.buffer });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { getServiceImage } = await import('../src/image-proxy.js');

    await getServiceImage('https://cached.example', 'Cached Service');
    await getServiceImage('https://cached.example', 'Cached Service');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generated SVG placeholder when the screenshot API fails, instead of surfacing an error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const { getServiceImage } = await import('../src/image-proxy.js');

    const result = await getServiceImage('https://down.example', 'Down Service');

    expect(result.contentType).toBe('image/svg+xml');
    expect(String(result.data)).toContain('<svg');
    expect(String(result.data)).toContain('D'); // initial letter of "Down Service"
  });

  it('falls back to a generated SVG placeholder when the screenshot API responds with a non-2xx status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }) as unknown as typeof fetch;
    const { getServiceImage } = await import('../src/image-proxy.js');

    const result = await getServiceImage('https://blocked.example', 'Blocked Service');

    expect(result.contentType).toBe('image/svg+xml');
  });
});

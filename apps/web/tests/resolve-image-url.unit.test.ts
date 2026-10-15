// @vitest-environment jsdom
// Regression coverage for the "W 로고만 나옴" fix: /api/services now returns
// imageUrl as a relative /api/service-image/:id path (see
// apps/api/src/image-proxy.ts), so the frontend must prefix the resolved API
// base onto it before use as an <img src>/background image. Absolute URLs
// (used by other tests' fixtures) must pass through unchanged.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
    if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: [] })));
    return Promise.resolve(new Response('{}'));
  }));
  return import('../src/app.ts');
}

describe('web unit: resolveImageUrl', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
  });

  it('prefixes the resolved API base onto a relative image-proxy path', async () => {
    const { resolveImageUrl } = await loadAppModule();
    expect(resolveImageUrl('/api/service-image/svc-1')).toBe('http://localhost:3001/api/service-image/svc-1');
  });

  it('leaves an already-absolute image URL untouched', async () => {
    const { resolveImageUrl } = await loadAppModule();
    expect(resolveImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});

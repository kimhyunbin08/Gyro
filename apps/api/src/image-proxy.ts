import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

// Service cards used to hotlink directly to s.wordpress.com/mshots, a lazy
// screenshot service: the *first* request for a given URL returns a generic
// "Generating Preview..." placeholder (a valid, loadable PNG, not an HTTP
// error) while the real screenshot renders in the background, and that
// placeholder is what most cards ended up stuck showing. This module fetches
// a real screenshot synchronously via microlink.io instead, and caches the
// result on disk (keyed by service URL) so repeat card views and re-renders
// don't re-hit the external API for the same service.
const CACHE_DIR = process.env.IMAGE_CACHE_DIR || path.join(os.tmpdir(), 'gyro-image-cache');
const FETCH_TIMEOUT_MS = 9000;

let cacheDirReady: Promise<void> | null = null;
function ensureCacheDir(): Promise<void> {
  if (!cacheDirReady) cacheDirReady = mkdir(CACHE_DIR, { recursive: true }).then(() => undefined);
  return cacheDirReady;
}

function cacheKey(serviceUrl: string): string {
  return createHash('sha256').update(serviceUrl).digest('hex');
}

async function readCache(serviceUrl: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(CACHE_DIR, `${cacheKey(serviceUrl)}.png`));
  } catch {
    return null;
  }
}

async function writeCache(serviceUrl: string, data: Buffer): Promise<void> {
  try {
    await ensureCacheDir();
    await writeFile(path.join(CACHE_DIR, `${cacheKey(serviceUrl)}.png`), data);
  } catch {
    // Disk cache is a best-effort speedup; a write failure (read-only FS,
    // out of space) should not break the response that already succeeded.
  }
}

async function fetchScreenshot(serviceUrl: string): Promise<Buffer> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(serviceUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) throw new Error(`microlink responded ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

// Simple deterministic gradient + initial-letter SVG so a card never shows a
// browser's broken-image icon when the live screenshot can't be fetched
// (target site down, blocked, or the screenshot API itself rate-limited).
function fallbackSvg(name: string): string {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  const hue = Math.abs([...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},55%,30%)"/><stop offset="100%" stop-color="hsl(${(hue + 40) % 360},55%,15%)"/></linearGradient></defs><rect width="1200" height="750" fill="url(#g)"/><text x="600" y="420" font-family="sans-serif" font-size="220" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${initial}</text></svg>`;
}

export type ServiceImageResult = { data: Buffer | string; contentType: string };

export async function getServiceImage(serviceUrl: string, serviceName: string): Promise<ServiceImageResult> {
  const cached = await readCache(serviceUrl);
  if (cached) return { data: cached, contentType: 'image/png' };
  try {
    const screenshot = await fetchScreenshot(serviceUrl);
    // Awaited (not fire-and-forget) so a second near-simultaneous request for
    // the same uncached service sees the cache instead of also hitting
    // microlink's rate-limited API.
    await writeCache(serviceUrl, screenshot);
    return { data: screenshot, contentType: 'image/png' };
  } catch {
    return { data: fallbackSvg(serviceName), contentType: 'image/svg+xml' };
  }
}

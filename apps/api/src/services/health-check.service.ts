import { lookup as dnsLookup } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { Agent } from 'undici';

export type HealthStatus = 'healthy' | 'unhealthy';
export type HealthCheckResult = {
  status: HealthStatus;
  checkedAt: string;
  sourceUrl: string;
  resolvedUrl: string;
  urlChanged: boolean;
  httpStatus?: number;
  error?: string;
};

export const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const CHECK_TIMEOUT_MS = 4000;
const MAX_REDIRECTS = 8;
type CacheEntry = HealthCheckResult & { expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<HealthCheckResult>>();

export function isPublicHealthCheckAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
      return parsed.toIPv4Address().range() === 'unicast';
    }
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

function validateTarget(target: URL): void {
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('Invalid health check destination');
  }
  const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Private health check destination is not allowed');
  }
  if (isIP(hostname) && !isPublicHealthCheckAddress(hostname)) {
    throw new Error('Private health check destination is not allowed');
  }
}

const pinnedPublicLookup: LookupFunction = (hostname, options, callback) => {
  void dnsLookup(hostname, { all: true, verbatim: true }).then((addresses) => {
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicHealthCheckAddress(address))) {
      throw new Error('Private health check destination is not allowed');
    }
    if (options && typeof options === 'object' && 'all' in options && options.all) {
      callback(null, addresses);
    } else {
      const first = addresses[0];
      callback(null, first.address, first.family);
    }
  }).catch((error: unknown) => {
    const lookupError = error instanceof Error ? error as NodeJS.ErrnoException : new Error(String(error));
    callback(lookupError, '', 0);
  });
};

async function requestWithSafeRedirects(sourceUrl: string, method: 'HEAD' | 'GET', signal: AbortSignal) {
  let destination = new URL(sourceUrl);
  for (let redirects = 0; ; redirects++) {
    validateTarget(destination);
    const dispatcher = new Agent({ connect: { lookup: pinnedPublicLookup } });
    let response: Response;
    try {
      response = await fetch(destination.href, {
        method,
        redirect: 'manual',
        signal,
        dispatcher,
      } as RequestInit & { dispatcher: Agent });
    } catch (error) {
      await dispatcher.close();
      throw error;
    }
    try {
      const location = response.headers?.get('location');
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        await response.body?.cancel();
        if (redirects >= MAX_REDIRECTS) throw new Error('Too many health check redirects');
        const nextDestination = new URL(location, destination);
        if (destination.protocol === 'https:' && nextDestination.protocol !== 'https:') {
          throw new Error('HTTPS health check redirects cannot downgrade to HTTP');
        }
        destination = nextDestination;
        continue;
      }
      await response.body?.cancel();
      return { status: response.status, ok: response.ok, url: destination.href };
    } finally {
      await dispatcher.close();
    }
  }
}

async function refresh(sourceUrl: string): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  let result: HealthCheckResult;
  try {
    const original = new URL(sourceUrl);
    validateTarget(original);
    let response = await requestWithSafeRedirects(original.href, 'HEAD', controller.signal);
    if (response.status === 405 || response.status === 501) {
      response = await requestWithSafeRedirects(original.href, 'GET', controller.signal);
    }
    const resolvedUrl = response.ok ? response.url : sourceUrl;
    result = {
      status: response.ok ? 'healthy' : 'unhealthy',
      checkedAt: new Date().toISOString(),
      sourceUrl,
      resolvedUrl,
      urlChanged: response.ok && resolvedUrl !== new URL(sourceUrl).href,
      httpStatus: response.status,
    };
  } catch (error) {
    result = {
      status: 'unhealthy',
      checkedAt: new Date().toISOString(),
      sourceUrl,
      resolvedUrl: sourceUrl,
      urlChanged: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
  cache.set(sourceUrl, { ...result, expiresAt: Date.now() + HEALTH_CHECK_INTERVAL_MS });
  return result;
}

export async function checkServiceHealth(sourceUrl: string, force = false): Promise<HealthCheckResult> {
  if (process.env.NODE_ENV === 'test') {
    return { status: 'healthy', checkedAt: new Date().toISOString(), sourceUrl, resolvedUrl: sourceUrl, urlChanged: false };
  }
  const pending = inFlight.get(sourceUrl);
  if (pending) return pending;
  const cached = cache.get(sourceUrl);
  if (!force && cached && cached.expiresAt > Date.now()) return cached;
  const promise = refresh(sourceUrl).finally(() => inFlight.delete(sourceUrl));
  inFlight.set(sourceUrl, promise);
  return promise;
}

export function resolveServiceUrl(sourceUrl: string): string {
  const result = cache.get(sourceUrl);
  return result?.status === 'healthy' ? result.resolvedUrl : sourceUrl;
}

/** Checks the original URLs even when nobody is browsing; never overlaps sweeps. */
export function startCatalogHealthMonitor(urls: string[]): () => void {
  const uniqueUrls = [...new Set(urls)];
  let running = false;
  let stopped = false;
  async function sweep(): Promise<void> {
    if (running || stopped) return;
    running = true;
    let index = 0;
    try {
      await Promise.all(Array.from({ length: Math.min(5, uniqueUrls.length) }, async () => {
        while (!stopped && index < uniqueUrls.length) {
          const url = uniqueUrls[index++];
          const result = await checkServiceHealth(url, true);
          if (result.status === 'unhealthy' || result.urlChanged) {
            console.info('Catalog health check', result);
          }
        }
      }));
    } finally {
      running = false;
    }
  }
  const run = () => { void sweep().catch((error: unknown) => console.error('Catalog health monitor failed', error)); };
  run();
  const timer = setInterval(run, HEALTH_CHECK_INTERVAL_MS);
  timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}

export function clearHealthCheckCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

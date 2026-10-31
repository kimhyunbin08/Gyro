import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';
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
const MAX_REDIRECTS = 5;
type CacheEntry = HealthCheckResult & { expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<HealthCheckResult>>();

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();
for (const [subnet, prefix, type] of [
  ['0.0.0.0', 8, 'ipv4'], ['10.0.0.0', 8, 'ipv4'], ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'], ['169.254.0.0', 16, 'ipv4'], ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'], ['192.0.2.0', 24, 'ipv4'], ['192.88.99.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'], ['198.18.0.0', 15, 'ipv4'], ['198.51.100.0', 24, 'ipv4'],
  ['203.0.113.0', 24, 'ipv4'], ['224.0.0.0', 4, 'ipv4'], ['240.0.0.0', 4, 'ipv4'],
  ['::', 128, 'ipv6'], ['::1', 128, 'ipv6'], ['::ffff:0:0', 96, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'], ['100::', 64, 'ipv6'], ['2001::', 23, 'ipv6'],
  ['2001:db8::', 32, 'ipv6'], ['2002::', 16, 'ipv6'], ['fc00::', 7, 'ipv6'],
  ['fe80::', 10, 'ipv6'], ['ff00::', 8, 'ipv6'],
] as const) {
  if (type === 'ipv4') blockedIpv4Addresses.addSubnet(subnet, prefix, type);
  else blockedIpv6Addresses.addSubnet(subnet, prefix, type);
}
const globalIpv6Addresses = new BlockList();
globalIpv6Addresses.addSubnet('2000::', 3, 'ipv6');

function isPublicAddress(address: string, family: number): boolean {
  if (isIP(address) !== family) return false;
  if (family === 6) {
    return globalIpv6Addresses.check(address, 'ipv6') && !blockedIpv6Addresses.check(address, 'ipv6');
  }
  return family === 4 && !blockedIpv4Addresses.check(address, 'ipv4');
}

function lookupWithSignal(hostname: string, signal: AbortSignal) {
  return new Promise<LookupAddress[]>((resolve, reject) => {
    const rejectOnAbort = () => reject(new Error('Health check timed out'));
    if (signal.aborted) {
      rejectOnAbort();
      return;
    }
    signal.addEventListener('abort', rejectOnAbort, { once: true });
    void lookup(hostname, { all: true, verbatim: true })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', rejectOnAbort));
  });
}

async function resolvePublicDestination(url: URL, signal: AbortSignal): Promise<LookupAddress[]> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid service URL');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Service URL must not target a local hostname');
  }
  const addressFamily = isIP(hostname);
  const addresses = addressFamily
    ? [{ address: hostname, family: addressFamily }]
    : await lookupWithSignal(hostname, signal);
  if (addresses.length === 0 || addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
    throw new Error('Service URL must resolve only to public IP addresses');
  }
  return addresses;
}

function pinnedLookup(addresses: LookupAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    const candidates = options.family === 4 || options.family === 6
      ? addresses.filter(({ family }) => family === options.family)
      : addresses;
    if (candidates.length === 0) {
      const error = Object.assign(new Error('No validated address for requested IP family'), { code: 'ENOTFOUND' });
      callback(error, '', 0);
    } else if (options.all) {
      callback(null, candidates);
    } else {
      callback(null, candidates[0].address, candidates[0].family);
    }
  };
}

async function fetchWithPublicRedirects(
  sourceUrl: string,
  method: 'HEAD' | 'GET',
  signal: AbortSignal,
): Promise<{ response: Response; resolvedUrl: string; dispatcher: Agent }> {
  let current = new URL(sourceUrl);
  const initialProtocol = current.protocol;
  for (let redirects = 0; ; redirects++) {
    const addresses = await resolvePublicDestination(current, signal);
    const dispatcher = new Agent({ connect: { lookup: pinnedLookup(addresses) } });
    const requestInit: RequestInit & { dispatcher: Agent } = {
      method,
      redirect: 'manual',
      signal,
      dispatcher,
    };
    let response: Response;
    try {
      response = await fetch(current.href, requestInit);
    } catch (error) {
      await dispatcher.close();
      throw error;
    }
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, resolvedUrl: current.href, dispatcher };
    }
    try {
      await response.body?.cancel();
    } finally {
      await dispatcher.close();
    }
    if (redirects >= MAX_REDIRECTS) throw new Error('Too many service URL redirects');
    current = new URL(location, current);
    if (initialProtocol === 'https:' && current.protocol !== 'https:') {
      throw new Error('Service URL redirect cannot downgrade HTTPS');
    }
  }
}

async function closeResponse(result: { response: Response; dispatcher: Agent }): Promise<void> {
  try {
    await result.response.body?.cancel();
  } finally {
    await result.dispatcher.close();
  }
}

async function refresh(sourceUrl: string): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  let result: HealthCheckResult;
  try {
    let checked = await fetchWithPublicRedirects(sourceUrl, 'HEAD', controller.signal);
    let { response, resolvedUrl } = checked;
    if (response.status === 405 || response.status === 501) {
      await closeResponse(checked);
      checked = await fetchWithPublicRedirects(sourceUrl, 'GET', controller.signal);
      ({ response, resolvedUrl } = checked);
    }
    await closeResponse(checked);
    result = {
      status: response.ok ? 'healthy' : 'unhealthy',
      checkedAt: new Date().toISOString(),
      sourceUrl,
      resolvedUrl: response.ok ? resolvedUrl : sourceUrl,
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
export function startCatalogHealthMonitor(urlSource: string[] | (() => Promise<string[]>)): () => void {
  let running = false;
  let stopped = false;
  async function sweep(): Promise<void> {
    if (running || stopped) return;
    running = true;
    let index = 0;
    try {
      const urls = typeof urlSource === 'function' ? await urlSource() : urlSource;
      const uniqueUrls = [...new Set(urls)];
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

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
type CacheEntry = HealthCheckResult & { expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<HealthCheckResult>>();

async function refresh(sourceUrl: string): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  let result: HealthCheckResult;
  try {
    let response = await fetch(sourceUrl, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (response.status === 405 || response.status === 501) {
      await response.body?.cancel();
      response = await fetch(sourceUrl, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    await response.body?.cancel();
    const destination = new URL(response.url || sourceUrl);
    if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password) {
      throw new Error('Invalid redirect destination');
    }
    const resolvedUrl = response.ok ? destination.href : sourceUrl;
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

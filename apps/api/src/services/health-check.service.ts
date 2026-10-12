// Live reachability check for Vibe Venture showcase services.
//
// prd.md §26.4.5 requires each service's Azure health check state to be
// verified server-side, and §26.6.3 requires that only services which pass
// a recent health check are exposed to the swipe deck. Previously this was
// a static `{ status: 'healthy' }` stub regardless of whether the exhibited
// site actually responded, so a dead/decommissioned student project would
// still show up as a swipeable card with a dead link.
//
// Results are cached per URL with a TTL so a burst of requests (e.g. many
// concurrent visitors) doesn't re-check every live site on every call, and
// a stale cache entry is served immediately while a refresh happens in the
// background (stale-while-revalidate) so `/api/services` stays fast.

export type HealthStatus = 'healthy' | 'unhealthy';
export type HealthCheckResult = { status: HealthStatus; checkedAt: string };

const CACHE_TTL_MS = 10 * 60 * 1000;
const CHECK_TIMEOUT_MS = 4000;

type CacheEntry = HealthCheckResult & { expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<HealthCheckResult>>();

async function pingUrl(url: string): Promise<HealthStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    // HEAD first (cheaper); some static hosts reject HEAD, so fall back to GET.
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    return res.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  } finally {
    clearTimeout(timeout);
  }
}

async function refresh(url: string): Promise<HealthCheckResult> {
  const status = await pingUrl(url);
  const result: HealthCheckResult = { status, checkedAt: new Date().toISOString() };
  cache.set(url, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * Starts (or reuses) an in-flight live check for `url` without making the
 * caller wait for it.
 */
function refreshInBackground(url: string): void {
  if (inFlight.has(url)) return;
  const promise = refresh(url).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  promise.catch(() => {
    /* refresh() itself never rejects; this guards against unhandled rejection noise. */
  });
}

/**
 * Returns the cached health result for `url` when one exists — fresh cache
 * hits are served as-is, and an expired entry is still served immediately
 * (stale) while a refresh is kicked off in the background, so a burst of
 * visitors after the 10-minute TTL never blocks on live network checks.
 * Only a URL with no cache entry at all blocks on (and dedupes concurrent)
 * live checks. Unit/integration tests run with `NODE_ENV=test` and never hit
 * the network: every service is treated as healthy so suites stay
 * deterministic and offline-friendly.
 */
export async function checkServiceHealth(url: string): Promise<HealthCheckResult> {
  if (process.env.NODE_ENV === 'test') {
    return { status: 'healthy', checkedAt: new Date().toISOString() };
  }
  const cached = cache.get(url);
  if (cached) {
    if (cached.expiresAt <= Date.now()) refreshInBackground(url);
    return cached;
  }
  const pending = inFlight.get(url);
  if (pending) return pending;
  const promise = refresh(url).finally(() => inFlight.delete(url));
  inFlight.set(url, promise);
  return promise;
}

export function clearHealthCheckCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

export type CatalogShuffle = 'vibe-venture' | 'sns' | 'dating' | 'productivity' | 'game' | 'task';
export type CatalogTier = 'mainstream' | 'emerging';
export type CatalogKind = 'product' | 'service' | 'skill' | 'mcp';
export type CatalogService = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  serviceUrl: string;
  tags: string[];
  audiences: ('student' | 'teacher' | 'parent' | 'other')[];
  health?: { status: 'healthy'; checkedAt: string };
  tier?: CatalogTier;
  kind?: CatalogKind;
  tasks?: string[];
  connection?: {
    agents: { name: string; versionNote?: string }[];
    transport?: 'stdio' | 'http' | 'sse';
    runtime?: 'local' | 'remote';
    auth?: 'none' | 'api_key' | 'oauth' | 'unknown';
    permissions: string[];
    installSteps: string[];
    exampleUsage?: string;
    docsUrl: string;
  };
  verification?: { level: 'link' | 'docs' | 'install'; verifiedAt?: string; environment?: string; sources: string[] };
};

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { promise: Promise<CatalogService[]>; expiresAt: number | null };

export function createCatalogLoader(apiBase: string, request: typeof fetch = fetch) {
  const cache = new Map<string, CacheEntry>();

  function loadShuffle(shuffle: CatalogShuffle, filters: { task?: string; kind?: CatalogKind } = {}): Promise<CatalogService[]> {
    const query = new URLSearchParams({ shuffle });
    if (filters.task) query.set('task', filters.task);
    if (filters.kind) query.set('kind', filters.kind);
    const cacheKey = query.toString();
    const cached = cache.get(cacheKey);
    if (cached && (cached.expiresAt === null || cached.expiresAt > Date.now())) return cached.promise;

    const entry: CacheEntry = { promise: Promise.resolve([]), expiresAt: null };
    entry.promise = request(`${apiBase}/api/services?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`서비스 카탈로그 요청 실패: ${response.status}`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('services' in payload) || !Array.isArray(payload.services)) {
          throw new Error('서비스 카탈로그 응답 형식이 올바르지 않습니다.');
        }
        return payload.services as CatalogService[];
      })
      .then((services) => {
        entry.expiresAt = Date.now() + CATALOG_CACHE_TTL_MS;
        return services;
      })
      .catch((error: unknown) => {
        if (cache.get(cacheKey) === entry) cache.delete(cacheKey);
        throw error;
      });
    cache.set(cacheKey, entry);
    return entry.promise;
  }

  return {
    getServices(shuffle: CatalogShuffle, tier?: CatalogTier): Promise<CatalogService[]> {
      return loadShuffle(shuffle).then((services) => {
        if (!tier) return services;
        return services.filter((service) => (service.tier ?? 'mainstream') === tier);
      });
    },
    preloadTheme(shuffle: Exclude<CatalogShuffle, 'vibe-venture'>): Promise<void> {
      return loadShuffle(shuffle).then(() => undefined);
    },
    getTaskServices(task: string, kind?: CatalogKind): Promise<CatalogService[]> {
      return loadShuffle('task', { task, kind });
    },
  };
}

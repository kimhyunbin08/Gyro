export type CatalogShuffle = 'vibe-venture' | 'sns' | 'dating' | 'productivity' | 'game';
export type CatalogTier = 'mainstream' | 'emerging';
export type CatalogService = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  serviceUrl: string;
  tags: string[];
  audiences: ('student' | 'teacher' | 'parent' | 'other')[];
  tier?: CatalogTier;
};

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { promise: Promise<CatalogService[]>; expiresAt: number | null };

export function createCatalogLoader(apiBase: string, request: typeof fetch = fetch) {
  const cache = new Map<CatalogShuffle, CacheEntry>();

  function loadShuffle(shuffle: CatalogShuffle): Promise<CatalogService[]> {
    const cached = cache.get(shuffle);
    if (cached && (cached.expiresAt === null || cached.expiresAt > Date.now())) return cached.promise;

    const entry: CacheEntry = { promise: Promise.resolve([]), expiresAt: null };
    const query = new URLSearchParams({ shuffle });
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
        if (cache.get(shuffle) === entry) cache.delete(shuffle);
        throw error;
      });
    cache.set(shuffle, entry);
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
  };
}

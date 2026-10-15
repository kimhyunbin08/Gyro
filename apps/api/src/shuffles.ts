import { catalog as vibeVentureCatalog, type CatalogService } from './catalog.js';
import { snsCatalog } from './catalogs/sns.js';
import { datingCatalog } from './catalogs/dating.js';
import { productivityCatalog } from './catalogs/productivity.js';
import { gameCatalog } from './catalogs/game.js';

// prd.md §9-4 / ideation.md §11: "셔플" = 독립된 질문→스와이프→결과 플로우를 구성하는 서비스
// 카탈로그 묶음. 기존 유일한 셔플(대구광역시교육청 인공지능교육센터 바이브벤처 프로그램 참가
// 서비스 묶음)이 'vibe-venture' 기본값이고, 나머지는 테마별로 실제 서비스를 큐레이션한 카탈로그다.
export const SHUFFLE_IDS = ['vibe-venture', 'sns', 'dating', 'productivity', 'game'] as const;
export type ShuffleId = (typeof SHUFFLE_IDS)[number];
export const DEFAULT_SHUFFLE: ShuffleId = 'vibe-venture';

export const catalogsByShuffle: Record<ShuffleId, CatalogService[]> = {
  'vibe-venture': vibeVentureCatalog,
  sns: snsCatalog,
  dating: datingCatalog,
  productivity: productivityCatalog,
  game: gameCatalog,
};

export function isShuffleId(value: unknown): value is ShuffleId {
  return typeof value === 'string' && (SHUFFLE_IDS as readonly string[]).includes(value);
}

export function resolveShuffleCatalog(shuffle: unknown): CatalogService[] {
  return catalogsByShuffle[isShuffleId(shuffle) ? shuffle : DEFAULT_SHUFFLE];
}

export const SERVICE_TIERS = ['mainstream', 'emerging'] as const;
export type ServiceTier = (typeof SERVICE_TIERS)[number];

// prd.md §9-4 #7: theme shuffles mix already-huge "주류" services with
// smaller, growing "비주류" startups. The tier selection screen lets users
// filter to one or the other, or skip it entirely to see both (no `tier`
// query param, or an unrecognized value, means "no filtering"). Entries
// without an explicit `tier` (e.g. the vibe-venture catalog, which predates
// this concept) are treated as 'mainstream'.
export function filterByTier(services: CatalogService[], tier: unknown): CatalogService[] {
  if (tier !== 'mainstream' && tier !== 'emerging') return services;
  return services.filter((service) => (service.tier ?? 'mainstream') === tier);
}

// 랭킹/퍼널 집계는 셔플을 구분하지 않고 전체 서비스를 대상으로 한다(prd.md §9-4 #6).
export function allShuffleServices(): CatalogService[] {
  return SHUFFLE_IDS.flatMap((id) => catalogsByShuffle[id]);
}

let serviceById: Map<string, CatalogService> | null = null;
// GET /api/service-image/:id (image-proxy route) needs to resolve a service's
// real serviceUrl from only its id, regardless of which shuffle it lives in.
export function findServiceById(id: string): CatalogService | undefined {
  if (!serviceById) serviceById = new Map(allShuffleServices().map((service) => [service.id, service]));
  return serviceById.get(id);
}

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

// 랭킹/퍼널 집계는 셔플을 구분하지 않고 전체 서비스를 대상으로 한다(prd.md §9-4 #6).
export function allShuffleServices(): CatalogService[] {
  return SHUFFLE_IDS.flatMap((id) => catalogsByShuffle[id]);
}

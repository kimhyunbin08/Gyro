import type { CatalogService } from '../catalog.js';

export type CuratedService = {
  name: string;
  serviceUrl: string;
  tagline: string;
  description: string;
  tags: string[];
};

export function createCuratedServices(
  roomKey: 'sns' | 'dating' | 'productivity' | 'game',
  room: string,
  firstNumber: number,
  tier: NonNullable<CatalogService['tier']>,
  entries: CuratedService[],
): CatalogService[] {
  return entries.map((entry, index) => {
    const number = firstNumber + index;
    return {
      id: `${roomKey}-${number}`,
      name: entry.name,
      tagline: entry.tagline,
      description: entry.description,
      imageUrl: `https://s.wordpress.com/mshots/v1/${encodeURIComponent(entry.serviceUrl)}?w=1200`,
      serviceUrl: entry.serviceUrl,
      tags: entry.tags,
      audiences: ['student', 'teacher', 'parent', 'other'],
      room,
      roomKey,
      number: String(number),
      tier,
    };
  });
}

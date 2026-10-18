import type { CatalogKind, CatalogService } from './catalog-loader.js';

export type ServiceSearchKind = CatalogKind | 'all';

export function searchCatalogServices(
  services: readonly CatalogService[],
  query: string,
  kind: ServiceSearchKind = 'all',
): CatalogService[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return services.filter((service) => {
    const serviceKind = service.kind ?? 'service';
    if (kind !== 'all' && serviceKind !== kind) return false;
    if (terms.length === 0) return true;

    const searchableText = [
      service.name,
      service.tagline,
      service.description,
      ...service.tags,
      ...(service.tasks ?? []),
    ].join(' ').toLocaleLowerCase();
    return terms.every((term) => searchableText.includes(term));
  });
}

import type { CatalogService } from '../catalog.js';
import { checkServiceHealth } from './health-check.service.js';

export function dedupeCatalog<T extends { serviceUrl: string }>(services: T[]): T[] {
  const seen = new Set<string>();
  return services.filter((service) => {
    const key = service.serviceUrl.trim().toLowerCase().replace(/\/+$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function healthyCatalog(services: CatalogService[]) {
  const source = dedupeCatalog(services);
  const checked = await Promise.all(source.map(async (service) => {
    const health = await checkServiceHealth(service.serviceUrl);
    if (health.status !== 'healthy') return undefined;
    return {
      ...service,
      serviceUrl: health.resolvedUrl,
      imageUrl: service.imageUrl ? `/api/service-image/${service.id}` : '',
      ...(service.verification?.level === 'link'
        ? { verification: { ...service.verification, verifiedAt: health.checkedAt } }
        : {}),
      health,
    };
  }));
  return dedupeCatalog(checked.filter((service): service is NonNullable<typeof service> => service !== undefined));
}

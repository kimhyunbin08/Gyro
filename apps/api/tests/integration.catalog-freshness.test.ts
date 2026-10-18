import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { catalog } from '../src/catalog.js';
import * as healthChecks from '../src/services/health-check.service.js';
import * as images from '../src/image-proxy.js';

describe('catalog freshness across API surfaces', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the successful final URL for discovery, ranking and screenshots, deduping redirected cards', async () => {
    const app = createApp();
    const resolvedUrl = 'https://moved.example/app';
    vi.spyOn(healthChecks, 'checkServiceHealth').mockImplementation(async (sourceUrl) => ({
      status: 'healthy', checkedAt: new Date().toISOString(), sourceUrl, resolvedUrl, urlChanged: true,
    }));
    vi.spyOn(healthChecks, 'resolveServiceUrl').mockReturnValue(resolvedUrl);
    const screenshot = vi.spyOn(images, 'getServiceImage').mockResolvedValue({ data: '<svg/>', contentType: 'image/svg+xml' });
    const services = await request(app).get('/api/services');
    expect(services.body.services).toHaveLength(1);
    expect(services.body.services[0]).toMatchObject({
      serviceUrl: resolvedUrl, health: { sourceUrl: catalog[0].serviceUrl, resolvedUrl, urlChanged: true },
    });
    await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'freshness-session', metadata: { serviceId: catalog[0].id } });
    const ranking = await request(app).get('/api/services/ranking');
    expect(ranking.body.ranking.find((entry: { id: string }) => entry.id === catalog[0].id).serviceUrl).toBe(resolvedUrl);
    const image = await request(app).get(`/api/service-image/${catalog[0].id}`);
    expect(image.status).toBe(200);
    expect(image.headers['cache-control']).toBe('public, no-cache');
    expect(screenshot).toHaveBeenCalledWith(resolvedUrl, catalog[0].name);
  });

  it('excludes dead services and does not fetch a screenshot for a failed destination', async () => {
    vi.spyOn(healthChecks, 'checkServiceHealth').mockImplementation(async (sourceUrl) => ({
      status: 'unhealthy', checkedAt: new Date().toISOString(), sourceUrl, resolvedUrl: sourceUrl, urlChanged: false, httpStatus: 404,
    }));
    const screenshot = vi.spyOn(images, 'getServiceImage');
    const app = createApp();
    expect((await request(app).get('/api/services')).body.services).toEqual([]);
    expect((await request(app).get(`/api/service-image/${catalog[0].id}`)).status).toBe(503);
    expect(screenshot).not.toHaveBeenCalled();
  });
});

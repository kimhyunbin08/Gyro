import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { catalog } from '../src/catalog.js';
import { taskCatalog } from '../src/catalogs/task.js';

describe('Gyro discovery API', () => {
  const app = createApp();
  const uniqueServiceUrls = new Set(catalog.map((service) => service.serviceUrl.trim().toLowerCase().replace(/\/+$/, '')));

  it('returns only healthy discovery services, deduped by live URL', async () => {
    const response = await request(app).get('/api/services');
    expect(response.status).toBe(200);
    expect(response.body.services).toHaveLength(uniqueServiceUrls.size);
    expect(response.body.services.every((service: { health: { status: string } }) => service.health.status === 'healthy')).toBe(true);
    // imageUrl must point at our own image-proxy route, not the catalog's raw
    // (often placeholder-prone) screenshot source — see trd.md §5.4.
    expect(response.body.services.every((service: { id: string; imageUrl: string }) => service.imageUrl === `/api/service-image/${service.id}`)).toBe(true);
  });

  it('exposes the curated task catalog with compatible optional fields and forgiving filters', async () => {
    expect(taskCatalog.length).toBeGreaterThan(0);
    expect(new Set(taskCatalog.map((service) => service.serviceUrl)).size).toBe(taskCatalog.length);
    for (const service of taskCatalog) {
      expect(service.kind).toBeTruthy();
      expect(service.tasks?.length).toBeGreaterThan(0);
      expect(service.verification?.sources.length).toBeGreaterThan(0);
      if (service.kind === 'skill' || service.kind === 'mcp') {
        expect(service.connection?.docsUrl).toMatch(/^https?:\/\//);
        expect(Array.isArray(service.connection?.agents)).toBe(true);
        expect(Array.isArray(service.connection?.permissions)).toBe(true);
        expect(Array.isArray(service.connection?.installSteps)).toBe(true);
      }
      if (service.verification?.level === 'docs' || service.verification?.level === 'install') {
        expect(service.verification.verifiedAt).toBeTruthy();
      }
      if (service.verification?.level === 'install') expect(service.verification.environment).toBeTruthy();
    }

    const full = await request(app).get('/api/services?shuffle=task');
    expect(full.status).toBe(200);
    expect(full.body.services).toHaveLength(taskCatalog.length);
    expect(full.body.services.every((service: { kind?: string; tasks?: string[]; verification?: unknown }) => service.kind && service.tasks?.length && service.verification)).toBe(true);
    expect(full.body.services.find((service: { id: string }) => service.id === 'task-github')?.imageUrl).toBe('');

    const filtered = await request(app).get('/api/services?shuffle=task&task=code-review&kind=mcp');
    expect(filtered.status).toBe(200);
    expect(filtered.body.services.length).toBeGreaterThan(0);
    expect(filtered.body.services.every((service: { kind: string; tasks: string[] }) => service.kind === 'mcp' && service.tasks.includes('code-review'))).toBe(true);

    const ignoredUnknownFilters = await request(app).get('/api/services?shuffle=task&task=unknown&kind=unknown');
    expect(ignoredUnknownFilters.body.services).toHaveLength(full.body.services.length);
    const legacy = await request(app).get('/api/services');
    expect(legacy.body.services.every((service: { kind?: string }) => service.kind === undefined)).toBe(true);
  });

  describe('GET /api/service-image/:id', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('serves a real screenshot fetched for a known service id', async () => {
      const pngBytes = new Uint8Array([1, 2, 3]);
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => pngBytes.buffer }) as unknown as typeof fetch;
      const response = await request(app).get(`/api/service-image/${catalog[0].id}`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });

    it('404s for an unknown service id', async () => {
      const response = await request(app).get('/api/service-image/does-not-exist');
      expect(response.status).toBe(404);
    });
  });

  // prd.md §9-4 #7: theme shuffles expose a `?tier=mainstream|emerging` filter so the
  // 주류/비주류 선택 screen can narrow the catalog before cards are shown.
  it('filters theme shuffle services by ?tier=', async () => {
    const mainstreamOnly = await request(app).get('/api/services?shuffle=sns&tier=mainstream');
    expect(mainstreamOnly.status).toBe(200);
    expect(mainstreamOnly.body.services.length).toBeGreaterThan(0);
    expect(mainstreamOnly.body.services.every((service: { tier?: string }) => (service.tier ?? 'mainstream') === 'mainstream')).toBe(true);

    const emergingOnly = await request(app).get('/api/services?shuffle=sns&tier=emerging');
    expect(emergingOnly.status).toBe(200);
    expect(emergingOnly.body.services.every((service: { tier?: string }) => service.tier === 'emerging')).toBe(true);

    const unfiltered = await request(app).get('/api/services?shuffle=sns');
    expect(unfiltered.body.services.length).toBe(mainstreamOnly.body.services.length + emergingOnly.body.services.length);
  });

  it('provides an expandable set of unique services for every theme and tier', async () => {
    for (const shuffle of ['sns', 'dating', 'productivity', 'game']) {
      for (const tier of ['mainstream', 'emerging']) {
        const response = await request(app).get(`/api/services?shuffle=${shuffle}&tier=${tier}`);
        expect(response.status).toBe(200);
        expect(response.body.services.length).toBeGreaterThan(0);
        expect(new Set(response.body.services.map((service: { id: string }) => service.id)).size).toBe(response.body.services.length);
        expect(new Set(response.body.services.map((service: { serviceUrl: string }) => service.serviceUrl.trim().toLowerCase().replace(/\/+$/, ''))).size).toBe(response.body.services.length);
        expect(response.body.services.every((service: { tier?: string }) => (service.tier ?? 'mainstream') === tier)).toBe(true);
      }
    }
  });

  it('accepts anonymous funnel events and validates payloads', async () => {
    const accepted = await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'session-1234', metadata: { serviceId: 'vibe-study' } });
    expect(accepted.status).toBe(202);
    const rejected = await request(app).post('/api/events').send({ name: 'unknown', sessionId: 'short' });
    expect(rejected.status).toBe(400);
  });

  it('validates and separately aggregates anonymous connection reports and guide document clicks', async () => {
    const service = taskCatalog.find((entry) => entry.kind === 'mcp')!;
    const sessionId = 'session-connection-1';
    const success = await request(app).post('/api/events').send({
      name: 'connection_report',
      sessionId,
      metadata: { serviceId: service.id, outcome: 'success', accessToken: 'must-not-be-retained', settings: 'secret' },
    });
    expect(success.status).toBe(202);
    const failure = await request(app).post('/api/events').send({
      name: 'connection_report',
      sessionId,
      metadata: { serviceId: service.id, outcome: 'fail', reason: 'auth_issue' },
    });
    expect(failure.status).toBe(202);
    expect((await request(app).post('/api/events').send({
      name: 'connection_report', sessionId, metadata: { serviceId: service.id, outcome: 'unknown' },
    })).status).toBe(400);
    expect((await request(app).post('/api/events').send({
      name: 'connection_report', sessionId, metadata: { serviceId: service.id, outcome: 'fail', reason: 'invalid' },
    })).status).toBe(400);
    await request(app).post('/api/events').send({
      name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'guide' },
    });

    const response = await request(app).get('/api/services/funnel');
    const entry = response.body.funnel.find((row: { id: string }) => row.id === service.id);
    expect(entry.connection).toEqual({ success: 1, partial: 0, fail: 1, reasons: { auth_issue: 1 } });
    expect(entry.docClicks).toBe(1);
    expect(entry.previewClicks).toBe(0);
    expect(entry.impressions).toBe(0);
    expect(JSON.stringify(entry)).not.toContain('must-not-be-retained');
  });

  it('accepts service feedback metadata and rejects invalid ratings', async () => {
    const accepted = await request(app)
      .post('/api/events')
      .send({ name: 'service_feedback_submit', sessionId: 'session-1234', metadata: { serviceId: 'vibe-study', rating: 5, comment: '좋아요' } });
    expect(accepted.status).toBe(202);
    const rejected = await request(app)
      .post('/api/events')
      .send({ name: 'service_feedback_submit', sessionId: 'session-1234', metadata: { serviceId: 'vibe-study', rating: 9 } });
    expect(rejected.status).toBe(400);
  });

  it('stores an email once and rejects duplicates', async () => {
    const email = `test-${Date.now()}@example.com`;
    expect((await request(app).post('/api/email-leads').send({ email, updatesOptIn: false })).status).toBe(201);
    expect((await request(app).post('/api/email-leads').send({ email, updatesOptIn: true })).status).toBe(409);
  });

  it('ranks services by right-swipe (card_like) count, most-liked first', async () => {
    const [first, second] = catalog;
    await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'session-rank-1', metadata: { serviceId: first.id } });
    await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'session-rank-2', metadata: { serviceId: first.id } });
    await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'session-rank-3', metadata: { serviceId: second.id } });
    await request(app).post('/api/events').send({ name: 'card_dislike', sessionId: 'session-rank-4', metadata: { serviceId: second.id } });
    const response = await request(app).get('/api/services/ranking');
    expect(response.status).toBe(200);
    const entry = (id: string) => response.body.ranking.find((r: { id: string }) => r.id === id);
    expect(entry(first.id).likeCount).toBeGreaterThanOrEqual(2);
    const firstIndex = response.body.ranking.findIndex((r: { id: string }) => r.id === first.id);
    const secondIndex = response.body.ranking.findIndex((r: { id: string }) => r.id === second.id);
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(response.body.ranking.every((r: { likeCount: number }, i: number, arr: { likeCount: number }[]) => i === 0 || arr[i - 1].likeCount >= r.likeCount)).toBe(true);
  });

  // prd.md §14.3 / trd.md §10.1 (Phase 2 draft): dislike-reason tags and
  // preview retry-intent answers reuse existing event names with extra
  // metadata, and are aggregated without inflating the primary counts.
  it('accepts dislike-reason and preview retry-intent follow-up events without a schema change', async () => {
    const [service] = catalog;
    const reasonTag = await request(app)
      .post('/api/events')
      .send({ name: 'card_dislike', sessionId: 'session-funnel-1', metadata: { serviceId: service.id, reason: 'unclear', stage: 'reason_tag' } });
    expect(reasonTag.status).toBe(202);
    const retryIntent = await request(app)
      .post('/api/events')
      .send({ name: 'service_click', sessionId: 'session-funnel-1', metadata: { serviceId: service.id, mode: 'embed', stage: 'preview_close', retryIntent: 'yes' } });
    expect(retryIntent.status).toBe(202);
  });

  it('aggregates per-service funnel drop-off without double-counting reason/retry-intent follow-ups', async () => {
    const [, , service] = catalog;
    const sessionId = 'session-funnel-2';
    await request(app).post('/api/events').send({ name: 'card_dislike', sessionId, metadata: { serviceId: service.id } });
    await request(app).post('/api/events').send({ name: 'card_dislike', sessionId, metadata: { serviceId: service.id, reason: 'not_relevant', stage: 'reason_tag' } });
    await request(app).post('/api/events').send({ name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'embed' } });
    await request(app).post('/api/events').send({ name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'embed', stage: 'preview_close', retryIntent: 'no' } });
    const response = await request(app).get('/api/services/funnel');
    expect(response.status).toBe(200);
    const entry = response.body.funnel.find((f: { id: string }) => f.id === service.id);
    expect(entry.dislikes).toBe(1);
    expect(entry.previewClicks).toBe(1);
    expect(entry.dislikeReasons.not_relevant).toBe(1);
    expect(entry.retryIntent.no).toBe(1);
  });

  // prd.md §14.3.3 / trd.md §10.1: preview dwell time is bucketed client-side
  // and aggregated alongside retry-intent on the same preview_close event,
  // without inflating previewClicks.
  it('aggregates preview dwell-time buckets from preview_close events', async () => {
    const [, service] = catalog;
    const sessionId = 'session-funnel-dwell';
    await request(app).post('/api/events').send({ name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'embed' } });
    await request(app).post('/api/events').send({ name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'embed', stage: 'preview_close', dwellBucket: '5-15s' } });
    await request(app).post('/api/events').send({ name: 'service_click', sessionId, metadata: { serviceId: service.id, mode: 'embed', stage: 'preview_close', retryIntent: 'yes', dwellBucket: '15-30s' } });
    const response = await request(app).get('/api/services/funnel');
    expect(response.status).toBe(200);
    const entry = response.body.funnel.find((f: { id: string }) => f.id === service.id);
    expect(entry.previewClicks).toBe(1);
    expect(entry.dwellBuckets['5-15s']).toBe(1);
    expect(entry.dwellBuckets['15-30s']).toBe(1);
    expect(entry.retryIntent.yes).toBe(1);
  });
});

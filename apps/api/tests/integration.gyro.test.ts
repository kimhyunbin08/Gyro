import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server.js';
import { catalog } from '../src/catalog.js';

describe('Gyro discovery API', () => {
  const app = createApp();
  const uniqueServiceUrls = new Set(catalog.map((service) => service.serviceUrl.trim().toLowerCase().replace(/\/+$/, '')));

  it('returns only healthy discovery services, deduped by live URL', async () => {
    const response = await request(app).get('/api/services');
    expect(response.status).toBe(200);
    expect(response.body.services).toHaveLength(uniqueServiceUrls.size);
    expect(response.body.services.every((service: { health: { status: string } }) => service.health.status === 'healthy')).toBe(true);
  });

  it('accepts anonymous funnel events and validates payloads', async () => {
    const accepted = await request(app).post('/api/events').send({ name: 'card_like', sessionId: 'session-1234', metadata: { serviceId: 'vibe-study' } });
    expect(accepted.status).toBe(202);
    const rejected = await request(app).post('/api/events').send({ name: 'unknown', sessionId: 'short' });
    expect(rejected.status).toBe(400);
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

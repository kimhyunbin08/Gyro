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
});

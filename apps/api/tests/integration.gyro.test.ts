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
});

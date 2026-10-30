import { randomBytes, randomUUID, createHash } from 'node:crypto';
import request from 'supertest';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { closeBuilderDatabase, getPublishedBuilderServices } from '../src/builder-platform.js';

const databaseUrl = process.env.GYRO_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('builder platform PostgreSQL integration', () => {
  const app = createApp();
  const ownerEmail = `builder-${randomUUID()}@example.test`;
  const otherEmail = `other-${randomUUID()}@example.test`;
  const moderatorEmail = `moderator-${randomUUID()}@example.test`;
  const ownerSession = randomBytes(32).toString('base64url');
  const otherSession = randomBytes(32).toString('base64url');
  const moderatorSession = randomBytes(32).toString('base64url');
  const ownerCsrf = randomBytes(32).toString('base64url');
  const otherCsrf = randomBytes(32).toString('base64url');
  const moderatorCsrf = randomBytes(32).toString('base64url');
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  const pool = new Pool({ connectionString: databaseUrl, ssl: false });
  let ownerId = '';
  let otherId = '';
  let moderatorId = '';

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('BUILDER_PLATFORM_ENABLED', 'true');
    vi.stubEnv('LEGAL_REVIEW_APPROVED', 'true');
    vi.stubEnv('DATABASE_URL', databaseUrl!);
    vi.stubEnv('DATABASE_SSL', 'disable');
    vi.stubEnv('WEB_ORIGIN', 'https://gyro.test');
    vi.stubEnv('LEGAL_OPERATOR_NAME', 'Gyro Test');
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'privacy@example.test');
    vi.stubEnv('PRIVACY_POLICY_VERSION', 'test-1');
    vi.stubEnv('TERMS_VERSION', 'test-1');
    vi.stubEnv('AI_PROCESSOR_NOTICE', 'Test provider notice');
    vi.stubEnv('DATA_RETENTION_POLICY', 'Test retention policy');
    vi.stubEnv('GITHUB_OAUTH_CLIENT_ID', 'test-client');
    vi.stubEnv('GITHUB_OAUTH_CLIENT_SECRET', 'test-secret');
    vi.stubEnv('GITHUB_OAUTH_CALLBACK_URL', 'https://api.example.test/api/builder/auth/github/callback');
    vi.stubEnv('SMTP_HOST', 'smtp.example.test');
    vi.stubEnv('SMTP_PORT', '2525');
    vi.stubEnv('SMTP_FROM', 'Gyro <no-reply@example.test>');
    vi.stubEnv('BUILDER_MODERATOR_EMAILS', moderatorEmail);

    const insertBuilder = async (email: string) => {
      const result = await pool.query(
        `INSERT INTO builders (email, age_confirmed, terms_version, privacy_version)
         VALUES ($1, TRUE, 'test-1', 'test-1') RETURNING id`,
        [email],
      );
      return String(result.rows[0].id);
    };
    ownerId = await insertBuilder(ownerEmail);
    otherId = await insertBuilder(otherEmail);
    moderatorId = await insertBuilder(moderatorEmail);
    for (const [token, csrf, builderId] of [
      [ownerSession, ownerCsrf, ownerId],
      [otherSession, otherCsrf, otherId],
      [moderatorSession, moderatorCsrf, moderatorId],
    ]) {
      await pool.query(
        `INSERT INTO builder_sessions (token_hash, csrf_hash, builder_id, expires_at)
         VALUES ($1, $2, $3, now() + interval '1 day')`,
        [digest(token), digest(csrf), builderId],
      );
    }
  });

  afterAll(async () => {
    if (ownerId || otherId || moderatorId) {
      await pool.query('DELETE FROM builders WHERE id = ANY($1::uuid[])', [[ownerId, otherId, moderatorId].filter(Boolean)]);
    }
    await closeBuilderDatabase();
    await pool.end();
    vi.unstubAllEnvs();
  });

  const authorized = (token: string, csrf: string) => ({
    Cookie: `gyro_builder_session=${encodeURIComponent(token)}`,
    Origin: 'https://gyro.test',
    'X-CSRF-Token': csrf,
  });

  it('enforces owner isolation and only publishes moderator-approved revisions', async () => {
    const submission = {
      name: 'Test service',
      tagline: 'A reviewed test service',
      description: 'This is a test service submitted for PostgreSQL integration checks.',
      serviceUrl: 'https://builder-service.example.test/',
      docsUrl: 'https://builder-service.example.test/docs',
      operatorContactUrl: '',
      rightsNotes: 'Official project and license details were verified.',
      kind: 'service',
      tasks: ['code-review'],
      rightsConfirmed: true,
    };
    const created = await request(app)
      .post('/api/builder/services')
      .set(authorized(ownerSession, ownerCsrf))
      .send(submission);
    expect(created.status).toBe(201);
    const serviceId = String(created.body.service.id);

    const otherOwnerRead = await request(app)
      .get(`/api/builder/services/${serviceId}`)
      .set(authorized(otherSession, otherCsrf));
    expect(otherOwnerRead.status).toBe(404);

    const submitted = await request(app)
      .post(`/api/builder/services/${serviceId}/submit`)
      .set(authorized(ownerSession, ownerCsrf));
    expect(submitted.status).toBe(200);
    expect((await getPublishedBuilderServices()).some((service) => service.id === serviceId)).toBe(false);

    const approved = await request(app)
      .post(`/api/builder/moderation/submissions/${serviceId}`)
      .set(authorized(moderatorSession, moderatorCsrf))
      .send({ decision: 'approved', reason: 'Official sources verified.' });
    expect(approved.status).toBe(200);
    expect((await getPublishedBuilderServices()).some((service) => service.id === serviceId)).toBe(true);

    const changed = await request(app)
      .patch(`/api/builder/services/${serviceId}`)
      .set(authorized(ownerSession, ownerCsrf))
      .send({ ...submission, tagline: 'Changed pending approval' });
    expect(changed.status).toBe(200);
    await request(app)
      .post(`/api/builder/services/${serviceId}/submit`)
      .set(authorized(ownerSession, ownerCsrf));
    const rejected = await request(app)
      .post(`/api/builder/moderation/submissions/${serviceId}`)
      .set(authorized(moderatorSession, moderatorCsrf))
      .send({ decision: 'rejected', reason: 'The updated claims need clarification.' });
    expect(rejected.status).toBe(200);
    expect((await getPublishedBuilderServices()).some((service) => service.id === serviceId)).toBe(true);

    const suspended = await request(app)
      .post(`/api/builder/moderation/submissions/${serviceId}`)
      .set(authorized(moderatorSession, moderatorCsrf))
      .send({ decision: 'suspended', reason: 'Unresolved public listing issue.' });
    expect(suspended.status).toBe(200);
    expect((await getPublishedBuilderServices()).some((service) => service.id === serviceId)).toBe(false);
  });
});

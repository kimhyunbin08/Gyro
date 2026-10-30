import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';

describe('builder platform release gates', () => {
  const app = createApp();

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not expose authentication providers when production setup is incomplete', async () => {
    for (const [name, value] of Object.entries({
      BUILDER_PLATFORM_ENABLED: '',
      LEGAL_REVIEW_APPROVED: '',
      DATABASE_URL: '',
      WEB_ORIGIN: '',
      LEGAL_OPERATOR_NAME: '',
      LEGAL_CONTACT_EMAIL: '',
      PRIVACY_POLICY_VERSION: '',
      TERMS_VERSION: '',
      AI_PROCESSOR_NOTICE: '',
      DATA_RETENTION_POLICY: '',
      GITHUB_OAUTH_CLIENT_ID: '',
      GITHUB_OAUTH_CLIENT_SECRET: '',
      GITHUB_OAUTH_CALLBACK_URL: '',
      SMTP_HOST: '',
      SMTP_PORT: '',
      SMTP_FROM: '',
    })) {
      vi.stubEnv(name, value);
    }

    const providers = await request(app).get('/api/builder/auth/providers');
    expect(providers.status).toBe(200);
    expect(providers.body).toMatchObject({ enabled: false, github: false, email: false });
    expect(providers.body.legal.ready).toBe(false);
  });

  it('rejects builder sign-in before creating a token when the release gate is closed', async () => {
    vi.stubEnv('BUILDER_PLATFORM_ENABLED', 'false');
    vi.stubEnv('LEGAL_REVIEW_APPROVED', 'false');
    vi.stubEnv('DATABASE_URL', '');

    const response = await request(app)
      .post('/api/builder/auth/email')
      .set('Origin', 'https://gyro.example')
      .send({
        email: 'builder@example.com',
        ageConfirmed: true,
        termsVersion: '1',
        privacyVersion: '1',
      });
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/설정/);
  });

  it.each([
    ['LEGAL_REVIEW_APPROVED', 'false'],
    ['BUILDER_MODERATOR_EMAILS', ''],
    ['DATABASE_SSL', 'disable'],
    ['WEB_ORIGIN', 'https://gyro.example/path'],
    ['GITHUB_OAUTH_CALLBACK_URL', 'https://api.example/wrong'],
    ['SMTP_PORT', 'not-a-port'],
    ['SMTP_PASSWORD', ''],
  ])('keeps authentication and writes closed for invalid %s', async (field, value) => {
    for (const [name, configured] of Object.entries({
      NODE_ENV: 'production',
      BUILDER_PLATFORM_ENABLED: 'true', LEGAL_REVIEW_APPROVED: 'true',
      DATABASE_URL: 'postgresql://builder:secret@db.example/gyro', DATABASE_SSL: 'verify',
      WEB_ORIGIN: 'https://gyro.example', LEGAL_OPERATOR_NAME: 'Test operator',
      LEGAL_CONTACT_EMAIL: 'privacy@example.com', PRIVACY_POLICY_VERSION: '1', TERMS_VERSION: '1',
      AI_PROCESSOR_NOTICE: 'Test processor', DATA_RETENTION_POLICY: 'Test retention',
      GITHUB_OAUTH_CLIENT_ID: 'client', GITHUB_OAUTH_CLIENT_SECRET: 'secret',
      GITHUB_OAUTH_CALLBACK_URL: 'https://api.example/api/builder/auth/github/callback',
      SMTP_HOST: 'smtp.example', SMTP_PORT: '587', SMTP_FROM: 'login@example.com',
      SMTP_USER: 'mailer', SMTP_PASSWORD: 'secret', BUILDER_MODERATOR_EMAILS: 'moderator@example.com',
      [field]: value,
    })) vi.stubEnv(name, configured);

    const providers = await request(app).get('/api/builder/auth/providers');
    expect(providers.body).toMatchObject({ enabled: false, github: false, email: false });
    expect((await request(app).post('/api/builder/auth/email').send({})).status).toBe(503);
    expect((await request(app).get('/api/builder/auth/github')).status).toBe(503);
    expect((await request(app).post('/api/builder/services').send({})).status).toBe(503);
  });
});

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
});

import { describe, expect, it } from 'vitest';
import { builderReadiness } from '../src/builder-readiness.js';

const configured = {
  NODE_ENV: 'production',
  BUILDER_PLATFORM_ENABLED: 'true',
  LEGAL_REVIEW_APPROVED: 'true',
  DATABASE_URL: 'postgresql://builder:private-db-password@db.example.test/gyro',
  DATABASE_SSL: 'verify',
  WEB_ORIGIN: 'https://gyro.example.test',
  GITHUB_OAUTH_CLIENT_ID: 'client',
  GITHUB_OAUTH_CLIENT_SECRET: 'private-oauth-secret',
  GITHUB_OAUTH_CALLBACK_URL: 'https://api.example.test/api/builder/auth/github/callback',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer',
  SMTP_PASSWORD: 'private-smtp-password',
  SMTP_FROM: 'Gyro <login@example.test>',
  BUILDER_MODERATOR_EMAILS: 'moderator@example.test',
  LEGAL_OPERATOR_NAME: 'Test operator',
  LEGAL_CONTACT_EMAIL: 'privacy@example.test',
  PRIVACY_POLICY_VERSION: 'test-1',
  TERMS_VERSION: 'test-1',
  AI_PROCESSOR_NOTICE: 'Test processor notice',
  DATA_RETENTION_POLICY: 'Test retention policy',
};

describe('builder production readiness', () => {
  it('accepts a complete configuration without claiming that the services are connected', () => {
    expect(builderReadiness(configured)).toEqual([]);
  });

  it.each(Object.keys(configured).filter((field) => field !== 'NODE_ENV'))('blocks a missing %s', (field) => {
    expect(builderReadiness({ ...configured, [field]: '' }).some((issue) => issue.field === field)).toBe(true);
  });

  it.each([
    ['WEB_ORIGIN', 'https://gyro.example.test/path'],
    ['WEB_ORIGIN', 'https://gyro.example.test/'],
    ['WEB_ORIGIN', 'http://gyro.example.test'],
    ['WEB_ORIGIN', 'https://user:password@gyro.example.test'],
    ['GITHUB_OAUTH_CALLBACK_URL', 'https://api.example.test/wrong'],
    ['GITHUB_OAUTH_CALLBACK_URL', 'http://api.example.test/api/builder/auth/github/callback'],
    ['GITHUB_OAUTH_CALLBACK_URL', 'https://api.example.test/api/builder/auth/github/callback?extra=1'],
    ['GITHUB_OAUTH_CALLBACK_URL', 'https://api.example.test/api/builder/auth/github/callback#fragment'],
    ['DATABASE_URL', 'https://db.example.test/gyro'],
    ['DATABASE_URL', 'postgresql://db.example.test/'],
    ['DATABASE_URL', 'postgresql://db.example.test/gyro?sslmode=no-verify'],
    ['DATABASE_URL', 'postgresql://db.example.test/gyro?sslcert=unverified'],
    ['DATABASE_URL', 'not-a-url'],
    ['DATABASE_SSL', 'disable'],
    ['SMTP_HOST', 'https://smtp.example.test'],
    ['SMTP_PORT', '0'],
    ['SMTP_PORT', '65536'],
    ['SMTP_PORT', '1.5'],
    ['SMTP_PORT', 'NaN'],
    ['SMTP_FROM', 'not-an-email'],
    ['SMTP_FROM', 'Gyro <login@example.test>\r\nBcc: other@example.test'],
    ['LEGAL_CONTACT_EMAIL', 'not-an-email'],
    ['BUILDER_MODERATOR_EMAILS', 'moderator@example.test,'],
    ['BUILDER_MODERATOR_EMAILS', 'not-an-email'],
  ])('rejects invalid %s without printing its value', (field, value) => {
    expect(builderReadiness({ ...configured, [field]: value }).some((issue) => issue.field === field)).toBe(true);
  });

  it('never includes environment values in diagnostics', () => {
    const issues = JSON.stringify(builderReadiness({
      ...configured,
      DATABASE_URL: 'private-db-password',
      LEGAL_CONTACT_EMAIL: 'private-oauth-secret',
      SMTP_FROM: 'private-smtp-password',
    }));
    for (const secret of ['private-db-password', 'private-oauth-secret', 'private-smtp-password']) {
      expect(issues).not.toContain(secret);
    }
  });

  it('permits local HTTP and unauthenticated development SMTP, but not incomplete authentication', () => {
    const local = {
      ...configured, NODE_ENV: 'development', DATABASE_SSL: 'disable',
      WEB_ORIGIN: 'http://localhost:3002',
      GITHUB_OAUTH_CALLBACK_URL: 'http://localhost:3001/api/builder/auth/github/callback',
      SMTP_USER: '', SMTP_PASSWORD: '',
    };
    expect(builderReadiness(local)).toEqual([]);
    expect(builderReadiness({ ...local, SMTP_USER: 'mailer' })).toContainEqual({
      field: 'SMTP_PASSWORD', message: expect.any(String),
    });
  });
});

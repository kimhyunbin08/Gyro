import { z } from 'zod';

type Environment = Readonly<Record<string, string | undefined>>;
export type ReadinessIssue = { field: string; message: string };

function httpUrl(value: string | undefined, production: boolean): URL | undefined {
  try {
    const url = new URL(value ?? '');
    if (url.username || url.password || url.search || url.hash) return undefined;
    if (url.protocol !== 'https:' && (production || url.protocol !== 'http:')) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function builderReadiness(env: Environment): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const production = env.NODE_ENV === 'production';
  const fail = (field: string, message: string) => issues.push({ field, message });
  const required = [
    'DATABASE_URL', 'WEB_ORIGIN', 'GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET',
    'GITHUB_OAUTH_CALLBACK_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM',
    'BUILDER_MODERATOR_EMAILS', 'LEGAL_OPERATOR_NAME', 'LEGAL_CONTACT_EMAIL',
    'PRIVACY_POLICY_VERSION', 'TERMS_VERSION', 'AI_PROCESSOR_NOTICE', 'DATA_RETENTION_POLICY',
  ];
  for (const field of required) {
    if (!env[field]?.trim()) fail(field, 'Required configuration is missing.');
  }
  for (const field of ['BUILDER_PLATFORM_ENABLED', 'LEGAL_REVIEW_APPROVED']) {
    if (env[field] !== 'true') fail(field, 'Release approval is not enabled.');
  }

  if (env.LEGAL_CONTACT_EMAIL && !z.email().safeParse(env.LEGAL_CONTACT_EMAIL).success) {
    fail('LEGAL_CONTACT_EMAIL', 'A valid contact email is required.');
  }
  if (env.BUILDER_MODERATOR_EMAILS) {
    const emails = env.BUILDER_MODERATOR_EMAILS.split(',').map((email) => email.trim());
    if (!emails.every((email) => z.email().safeParse(email).success)) {
      fail('BUILDER_MODERATOR_EMAILS', 'Use a comma-separated list of valid moderator emails.');
    }
  }
  if (env.WEB_ORIGIN) {
    const origin = httpUrl(env.WEB_ORIGIN, production);
    if (!origin || origin.origin !== env.WEB_ORIGIN) {
      fail('WEB_ORIGIN', 'Use an exact web origin without a path or trailing slash; production requires HTTPS.');
    }
  }
  if (env.GITHUB_OAUTH_CALLBACK_URL) {
    const callback = httpUrl(env.GITHUB_OAUTH_CALLBACK_URL, production);
    if (!callback || callback.pathname !== '/api/builder/auth/github/callback') {
      fail('GITHUB_OAUTH_CALLBACK_URL', 'Use the API origin and /api/builder/auth/github/callback; production requires HTTPS.');
    }
  }
  if (env.DATABASE_URL) {
    try {
      const database = new URL(env.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname ||
          database.pathname.length < 2 || database.hash) {
        fail('DATABASE_URL', 'Use a PostgreSQL connection URL with a database name.');
      }
      if (production && [...database.searchParams.keys()].some((key) => key.toLowerCase().startsWith('ssl'))) {
        fail('DATABASE_URL', 'Remove URL ssl parameters so the verified TLS pool configuration cannot be overridden.');
      }
    } catch {
      fail('DATABASE_URL', 'Use a valid PostgreSQL connection URL.');
    }
  }
  if (production && env.DATABASE_SSL !== 'verify') {
    fail('DATABASE_SSL', 'Production requires verify with a trusted database certificate.');
  }
  if (env.SMTP_HOST && !/^[a-zA-Z0-9.-]+$/.test(env.SMTP_HOST)) {
    fail('SMTP_HOST', 'Use a mail server hostname, not a URL.');
  }
  if (env.SMTP_PORT && (!/^\d+$/.test(env.SMTP_PORT) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535)) {
    fail('SMTP_PORT', 'Use an integer port from 1 to 65535.');
  }
  if (env.SMTP_FROM) {
    const from = /^(?:[^<>\r\n]+<([^<>\r\n]+)>|([^<>\r\n]+))$/.exec(env.SMTP_FROM);
    if (!from || !z.email().safeParse((from[1] ?? from[2]).trim()).success) {
      fail('SMTP_FROM', 'Use a sender email or Display Name <sender email>.');
    }
  }
  if (production || env.SMTP_USER || env.SMTP_PASSWORD) {
    for (const field of ['SMTP_USER', 'SMTP_PASSWORD']) {
      if (!env[field]?.trim()) fail(field, 'Authenticated SMTP requires both username and password.');
    }
  }
  return issues;
}

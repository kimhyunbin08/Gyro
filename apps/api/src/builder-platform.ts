import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import nodemailer from 'nodemailer';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { CatalogService } from './catalog.js';
import { isTaskId } from './catalogs/task.js';
import { builderReadiness } from './builder-readiness.js';

const SESSION_COOKIE = 'gyro_builder_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAGIC_LINK_MAX_AGE_MS = 15 * 60 * 1000;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const authRateLimits = new Map<string, { count: number; resetAt: number }>();
let databasePool: Pool | undefined;

type AuthenticatedBuilder = {
  id: string;
  email: string;
  display_name: string;
  session_hash: string;
  csrf_hash: string;
};
type BuilderRequest = Request & { builder?: AuthenticatedBuilder };

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});
const submissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(5).max(180),
  description: z.string().trim().min(20).max(2000),
  serviceUrl: z.string().trim().url().max(2048),
  docsUrl: z.string().trim().url().max(2048),
  operatorContactUrl: z.string().trim().url().max(2048).or(z.literal('')),
  rightsNotes: z.string().trim().min(10).max(1000),
  kind: z.enum(['product', 'service', 'skill', 'mcp']),
  tasks: z.array(z.string()).min(1).max(8),
  rightsConfirmed: z.literal(true),
});

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function secureEqualHex(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return leftBytes.length === rightBytes.length && leftBytes.length > 0 && timingSafeEqual(leftBytes, rightBytes);
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Builder database is not configured.');
  if (!databasePool) {
    databasePool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true },
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  return databasePool;
}

export async function closeBuilderDatabase(): Promise<void> {
  if (!databasePool) return;
  const pool = databasePool;
  databasePool = undefined;
  await pool.end();
}

function legalConfiguration() {
  const fields = {
    operatorName: process.env.LEGAL_OPERATOR_NAME,
    contactEmail: process.env.LEGAL_CONTACT_EMAIL,
    privacyVersion: process.env.PRIVACY_POLICY_VERSION,
    termsVersion: process.env.TERMS_VERSION,
    processorNotice: process.env.AI_PROCESSOR_NOTICE,
    retentionPolicy: process.env.DATA_RETENTION_POLICY,
  };
  const ready = Object.values(fields).every((value) => typeof value === 'string' && value.trim().length > 0);
  return {
    ready,
    ...fields,
    ...(ready ? {} : { message: '운영자와 처리 정책 설정이 완료되기 전까지 창업가 가입을 사용할 수 없습니다.' }),
  };
}

function githubConfiguration() {
  const callback = process.env.GITHUB_OAUTH_CALLBACK_URL;
  let validCallback = false;
  if (callback) {
    try {
      const url = new URL(callback);
      validCallback = url.pathname === '/api/builder/auth/github/callback' &&
        !url.search && !url.hash &&
        (url.protocol === 'https:' || process.env.NODE_ENV !== 'production');
    } catch {
      validCallback = false;
    }
  }
  return Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET && validCallback);
}

function emailConfiguration() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM
  );
}

function platformEnabled(): boolean {
  return builderReadiness(process.env).length === 0;
}

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function validateSubmission(input: z.infer<typeof submissionSchema>) {
  const serviceUrl = normalizeHttpUrl(input.serviceUrl);
  const docsUrl = normalizeHttpUrl(input.docsUrl);
  const operatorContactUrl = input.operatorContactUrl ? normalizeHttpUrl(input.operatorContactUrl) : '';
  if (!serviceUrl || !docsUrl || (input.operatorContactUrl && !operatorContactUrl) || input.tasks.some((task) => !isTaskId(task))) return undefined;
  return { ...input, serviceUrl, docsUrl, operatorContactUrl };
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cookieOptions(maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}${secure}`;
}

function expireCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function expireOAuthCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `gyro_builder_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function trustedOrigin(request: Request): boolean {
  const configuredOrigin = process.env.WEB_ORIGIN;
  return Boolean(configuredOrigin && request.get('origin') === configuredOrigin);
}

function rateLimitBucket(bucketKey: string, limit: number): boolean {
  const now = Date.now();
  if (authRateLimits.size > 2000) {
    for (const [entryKey, entry] of authRateLimits) {
      if (entry.resetAt <= now) authRateLimits.delete(entryKey);
    }
  }
  const boundedKey = !authRateLimits.has(bucketKey) && authRateLimits.size >= 2000 ? 'overflow' : bucketKey;
  const entry = authRateLimits.get(boundedKey);
  if (!entry || entry.resetAt <= now) {
    authRateLimits.set(boundedKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

function rateLimited(request: Request, key: string, limit: number): boolean {
  const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  return rateLimitBucket(`${key}:${clientIp}`, limit);
}

function createTransport() {
  if (!emailConfiguration()) throw new Error('Builder email provider is not configured.');
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT is invalid.');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: process.env.NODE_ENV === 'production',
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });
}

function snapshotFromSubmission(row: Record<string, unknown>, id: string): CatalogService {
  const kind = row.kind === 'product' || row.kind === 'skill' || row.kind === 'mcp' ? row.kind : 'service';
  return {
    id,
    name: String(row.name),
    tagline: String(row.tagline),
    description: String(row.description),
    imageUrl: `/api/service-image/${encodeURIComponent(id)}`,
    serviceUrl: String(row.service_url ?? row.serviceUrl),
    tags: Array.isArray(row.tasks) ? row.tasks.map(String) : [],
    audiences: ['student', 'teacher', 'parent', 'other'],
    room: '창업가 제출',
    roomKey: 'builder',
    number: '1',
    tier: 'emerging',
    kind,
    tasks: Array.isArray(row.tasks) ? row.tasks.map(String) : [],
    verification: { level: 'link', sources: [String(row.docs_url ?? row.docsUrl)] },
  };
}

async function createSession(client: PoolClient, builderId: string, response: Response): Promise<string> {
  const session = randomToken();
  const csrf = randomToken();
  await client.query('DELETE FROM builder_sessions WHERE expires_at <= now()');
  await client.query(
    `INSERT INTO builder_sessions (token_hash, csrf_hash, builder_id, expires_at)
     VALUES ($1, $2, $3, now() + interval '7 days')`,
    [hash(session), hash(csrf), builderId],
  );
  response.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session)}; ${cookieOptions(SESSION_MAX_AGE_MS)}`);
  return csrf;
}

async function authenticate(request: BuilderRequest, response: Response): Promise<AuthenticatedBuilder | undefined> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) {
    response.status(401).json({ message: '로그인이 필요합니다.' });
    return undefined;
  }
  const result = await getPool().query(
    `SELECT b.id, b.email, b.display_name, s.token_hash AS session_hash, s.csrf_hash
       FROM builder_sessions s
       JOIN builders b ON b.id = s.builder_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND b.deleted_at IS NULL`,
    [hash(token)],
  );
  const builder = result.rows[0] as AuthenticatedBuilder | undefined;
  if (!builder) {
    response.setHeader('Set-Cookie', expireCookie());
    response.status(401).json({ message: '로그인이 만료되었습니다. 다시 로그인해 주세요.' });
    return undefined;
  }
  request.builder = builder;
  return builder;
}

function requireCsrf(request: BuilderRequest, response: Response): boolean {
  if (!trustedOrigin(request)) {
    response.status(403).json({ message: '요청 출처를 확인할 수 없습니다.' });
    return false;
  }
  const supplied = request.get('x-csrf-token') ?? '';
  if (!secureEqualHex(hash(supplied), request.builder?.csrf_hash ?? '')) {
    response.status(403).json({ message: '요청 보안 토큰이 유효하지 않습니다. 화면을 새로고침해 주세요.' });
    return false;
  }
  return true;
}

function validatedPolicies(body: unknown): { ageConfirmed: true; termsVersion: string; privacyVersion: string } | undefined {
  const parsed = z.object({
    ageConfirmed: z.literal(true),
    termsVersion: z.string().min(1).max(80),
    privacyVersion: z.string().min(1).max(80),
  }).safeParse(body);
  if (!parsed.success) return undefined;
  const legal = legalConfiguration();
  if (parsed.data.termsVersion !== legal.termsVersion || parsed.data.privacyVersion !== legal.privacyVersion) return undefined;
  return parsed.data;
}

async function upsertVerifiedBuilder(
  client: PoolClient,
  email: string,
  ageConfirmed: boolean,
  termsVersion: string,
  privacyVersion: string,
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await client.query(
    `INSERT INTO builders (email, age_confirmed, terms_version, privacy_version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(email)) DO UPDATE
       SET deleted_at = NULL, age_confirmed = EXCLUDED.age_confirmed,
           terms_version = EXCLUDED.terms_version, privacy_version = EXCLUDED.privacy_version
     RETURNING id`,
    [normalizedEmail, ageConfirmed, termsVersion, privacyVersion],
  );
  const builderId = String(result.rows[0].id);
  await client.query(
    `INSERT INTO builder_consent_records (builder_id, consent_type, policy_version)
     VALUES ($1, 'terms', $2), ($1, 'privacy_notice', $3), ($1, 'age_14_plus', 'self_attested')`,
    [builderId, termsVersion, privacyVersion],
  );
  return builderId;
}

export function createBuilderRouter(): Router {
  const router = Router();

  router.use((request, response, next) => {
    if (request.method === 'GET' && request.path === '/auth/providers') return next();
    if (request.method === 'POST' && request.path === '/auth/email/verify') return next();
    if (request.path.startsWith('/auth/github')) return next();
    if (!platformEnabled()) {
      return response.status(503).json({ message: '창업가 플랫폼이 아직 운영 설정을 마치지 않았어요.' });
    }
    next();
  });

  router.get('/auth/providers', (_request, response) => {
    const legal = legalConfiguration();
    response.json({
      enabled: platformEnabled(),
      github: platformEnabled() && githubConfiguration(),
      email: platformEnabled() && emailConfiguration(),
      legal: {
        ready: legal.ready,
        operatorName: legal.operatorName ?? null,
        contactEmail: legal.contactEmail ?? null,
        termsVersion: legal.termsVersion ?? null,
        privacyVersion: legal.privacyVersion ?? null,
        processorNotice: legal.processorNotice ?? null,
        retentionPolicy: legal.retentionPolicy ?? null,
      },
    });
  });

  router.post('/auth/email', async (request, response) => {
    if (!platformEnabled()) return response.status(503).json({ message: '창업가 플랫폼 설정이 완료되지 않았어요.' });
    if (!emailConfiguration()) return response.status(503).json({ message: '이메일 로그인이 아직 설정되지 않았어요.' });
    if (!trustedOrigin(request)) return response.status(403).json({ message: '요청 출처를 확인할 수 없습니다.' });
    const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(request.body);
    const policies = validatedPolicies(request.body);
    if (!parsed.success || !policies) return response.status(400).json({ message: '만 14세 이상 확인과 현재 약관 동의가 필요합니다.' });
    const email = parsed.data.email.toLowerCase();
    if (rateLimited(request, 'email-auth', 20) || rateLimitBucket(`email:${hash(email)}`, 4)) {
      response.setHeader('Retry-After', '900');
      return response.status(429).json({ message: '요청이 많아요. 잠시 후 다시 시도해 주세요.' });
    }
    const token = randomToken();
    try {
      await getPool().query('DELETE FROM builder_magic_links WHERE expires_at <= now() OR consumed_at IS NOT NULL');
      await getPool().query(
        `INSERT INTO builder_magic_links
          (token_hash, email, age_confirmed, terms_version, privacy_version, expires_at)
         VALUES ($1, $2, TRUE, $3, $4, now() + interval '15 minutes')`,
        [hash(token), email, policies.termsVersion, policies.privacyVersion],
      );
      const origin = process.env.WEB_ORIGIN!;
      const link = new URL('/builder.html', origin);
      link.hash = new URLSearchParams({ magic: token }).toString();
      await createTransport().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Gyro 창업가 로그인 링크',
        text: `15분 안에 링크를 열어 로그인하세요. 사용하지 않았다면 이 메일을 무시하세요.\n${link.toString()}`,
      });
      response.status(202).json({ sent: true, message: '등록된 주소라면 로그인 링크를 보냈어요. 메일함을 확인해 주세요.' });
    } catch (error) {
      console.error('Builder email authentication could not complete.');
      return response.status(503).json({ message: '로그인 링크를 보낼 수 없어요. 잠시 후 다시 시도해 주세요.' });
    }
  });

  router.post('/auth/email/verify', async (request, response) => {
    const parsed = z.object({ token: z.string().min(40).max(100) }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: '로그인 링크가 올바르지 않습니다.' });
    if (!trustedOrigin(request)) return response.status(403).json({ message: '요청 출처를 확인할 수 없습니다.' });
    if (!platformEnabled()) return response.status(503).json({ message: '창업가 플랫폼 설정이 완료되지 않았어요.' });
    const token = parsed.data.token;
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const tokenResult = await client.query(
        `SELECT email, age_confirmed, terms_version, privacy_version
           FROM builder_magic_links
          WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
          FOR UPDATE`,
        [hash(token)],
      );
      const magic = tokenResult.rows[0];
      if (!magic || magic.terms_version !== legalConfiguration().termsVersion || magic.privacy_version !== legalConfiguration().privacyVersion) {
        await client.query('ROLLBACK');
        return response.status(400).json({ message: '링크가 만료되었거나 약관이 변경되었습니다. 다시 로그인해 주세요.' });
      }
      await client.query('UPDATE builder_magic_links SET consumed_at = now() WHERE token_hash = $1', [hash(token)]);
      const builderId = await upsertVerifiedBuilder(client, String(magic.email), Boolean(magic.age_confirmed), String(magic.terms_version), String(magic.privacy_version));
      await createSession(client, builderId, response);
      await client.query('COMMIT');
      return response.json({ verified: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Builder magic link verification failed.');
      return response.status(503).json({ message: '로그인을 완료할 수 없어요. 링크를 다시 요청해 주세요.' });
    } finally {
      client.release();
    }
  });

  router.get('/auth/github', async (request, response) => {
    if (!platformEnabled()) return response.status(503).json({ message: '창업가 플랫폼 설정이 완료되지 않았어요.' });
    if (!githubConfiguration()) return response.status(503).json({ message: 'GitHub 로그인이 아직 설정되지 않았어요.' });
    if (rateLimited(request, 'github-oauth', 20)) return response.status(429).json({ message: '요청이 많아요. 잠시 후 다시 시도해 주세요.' });
    const policies = validatedPolicies(request.query);
    if (!policies) return response.status(400).json({ message: '만 14세 이상 확인과 현재 약관 동의가 필요합니다.' });
    const state = randomToken();
    await getPool().query('DELETE FROM builder_oauth_states WHERE expires_at <= now()');
    await getPool().query(
      `INSERT INTO builder_oauth_states (state_hash, age_confirmed, terms_version, privacy_version, expires_at)
       VALUES ($1, TRUE, $2, $3, now() + interval '10 minutes')`,
      [hash(state), policies.termsVersion, policies.privacyVersion],
    );
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.setHeader(
      'Set-Cookie',
      `gyro_builder_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(OAUTH_STATE_MAX_AGE_MS / 1000)}${secure}`,
    );
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', process.env.GITHUB_OAUTH_CLIENT_ID!);
    authorize.searchParams.set('redirect_uri', process.env.GITHUB_OAUTH_CALLBACK_URL!);
    authorize.searchParams.set('scope', 'read:user user:email');
    authorize.searchParams.set('state', state);
    response.redirect(302, authorize.toString());
  });

  router.get('/auth/github/callback', async (request, response) => {
    const state = typeof request.query.state === 'string' ? request.query.state : '';
    const browserState = cookieValue(request, 'gyro_builder_oauth_state');
    const code = typeof request.query.code === 'string' ? request.query.code : '';
    if (!state || !browserState || !secureEqualHex(hash(state), hash(browserState)) || !code || !githubConfiguration() || !platformEnabled()) {
      return response.status(400).json({ message: 'GitHub 로그인을 확인할 수 없습니다.' });
    }
    response.append('Set-Cookie', expireOAuthCookie());
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const stateResult = await client.query(
        `DELETE FROM builder_oauth_states
          WHERE state_hash = $1 AND expires_at > now()
          RETURNING age_confirmed, terms_version, privacy_version`,
        [hash(state)],
      );
      const oauthState = stateResult.rows[0];
      if (!oauthState || oauthState.terms_version !== legalConfiguration().termsVersion || oauthState.privacy_version !== legalConfiguration().privacyVersion) {
        await client.query('ROLLBACK');
        return response.status(400).json({ message: 'GitHub 로그인 요청이 만료되었습니다. 다시 시도해 주세요.' });
      }
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
          client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_OAUTH_CALLBACK_URL,
          state,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!tokenResponse.ok) throw new Error('GitHub token exchange failed.');
      const tokenBody = await tokenResponse.json() as { access_token?: string; error?: string };
      if (!tokenBody.access_token) throw new Error('GitHub did not return an access token.');
      const githubHeaders = {
        Authorization: `Bearer ${tokenBody.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Gyro-builder-login',
      };
      const [userResponse, emailsResponse] = await Promise.all([
        fetch('https://api.github.com/user', { headers: githubHeaders, signal: AbortSignal.timeout(8000) }),
        fetch('https://api.github.com/user/emails', { headers: githubHeaders, signal: AbortSignal.timeout(8000) }),
      ]);
      if (!userResponse.ok || !emailsResponse.ok) throw new Error('GitHub identity verification failed.');
      const user = await userResponse.json() as { id?: number; name?: string | null; login?: string };
      const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const email = emails.find((item) => item.primary && item.verified)?.email;
      if (!user.id || !email || !email.includes('@')) throw new Error('GitHub account has no verified primary email.');
      const identity = await client.query(
        `SELECT builder_id FROM builder_identities WHERE provider = 'github' AND provider_subject = $1`,
        [String(user.id)],
      );
      const builderId = identity.rows[0]
        ? String(identity.rows[0].builder_id)
        : await upsertVerifiedBuilder(client, email, Boolean(oauthState.age_confirmed), String(oauthState.terms_version), String(oauthState.privacy_version));
      await client.query(
        `INSERT INTO builder_identities (provider, provider_subject, builder_id)
         VALUES ('github', $1, $2)
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [String(user.id), builderId],
      );
      const linkedIdentity = await client.query(
        `SELECT builder_id FROM builder_identities WHERE provider = 'github' AND provider_subject = $1`,
        [String(user.id)],
      );
      if (String(linkedIdentity.rows[0]?.builder_id) !== builderId) throw new Error('GitHub identity is already linked to another account.');
      if (user.name || user.login) {
        await client.query(
          `UPDATE builders SET display_name = COALESCE(NULLIF(display_name, ''), $2) WHERE id = $1`,
          [builderId, String(user.name || user.login).slice(0, 80)],
        );
      }
      await createSession(client, builderId, response);
      await client.query('COMMIT');
      return response.redirect(303, new URL('/builder.html', process.env.WEB_ORIGIN).toString());
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Builder GitHub authentication failed.');
      return response.status(502).json({ message: 'GitHub 로그인을 완료할 수 없습니다. 다시 시도해 주세요.' });
    } finally {
      client.release();
    }
  });

  router.get('/me', async (request, response) => {
    if (!platformEnabled()) return response.status(503).json({ message: '창업가 플랫폼 설정이 완료되지 않았어요.' });
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder) return;
    const csrf = randomToken();
    await getPool().query('UPDATE builder_sessions SET csrf_hash = $2 WHERE token_hash = $1', [builder.session_hash, hash(csrf)]);
    const identities = await getPool().query(
      `SELECT provider FROM builder_identities WHERE builder_id = $1 ORDER BY provider`,
      [builder.id],
    );
    response.json({
      builder: { id: builder.id, email: builder.email, displayName: builder.display_name },
      providers: identities.rows.map((row) => row.provider),
      moderator: (process.env.BUILDER_MODERATOR_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).includes(builder.email.toLowerCase()),
      csrfToken: csrf,
    });
  });

  router.patch('/me', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: '표시 이름은 1~80자로 입력해 주세요.' });
    await getPool().query('UPDATE builders SET display_name = $2 WHERE id = $1', [builder.id, parsed.data.displayName]);
    response.json({ saved: true });
  });

  router.delete('/me', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    await getPool().query('DELETE FROM builders WHERE id = $1', [builder.id]);
    response.setHeader('Set-Cookie', expireCookie());
    response.status(200).json({ deleted: true });
  });

  router.post('/auth/logout', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    await getPool().query('DELETE FROM builder_sessions WHERE token_hash = $1', [builder.session_hash]);
    response.setHeader('Set-Cookie', expireCookie());
    response.status(204).end();
  });

  router.get('/services', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder) return;
    const result = await getPool().query(
      `SELECT id, status, name, tagline, description, service_url, docs_url, kind, tasks, rights_confirmed,
              updated_at, approved_snapshot,
              (SELECT reason FROM moderation_reviews r WHERE r.submission_id=service_submissions.id ORDER BY created_at DESC LIMIT 1) AS review_reason,
              (SELECT decision FROM moderation_reviews r WHERE r.submission_id=service_submissions.id ORDER BY created_at DESC LIMIT 1) AS review_decision
         FROM service_submissions
        WHERE builder_id = $1
        ORDER BY updated_at DESC`,
      [builder.id],
    );
    response.json({ services: result.rows });
  });

  router.post('/services', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const parsed = submissionSchema.safeParse(request.body);
    const submission = parsed.success ? validateSubmission(parsed.data) : undefined;
    if (!submission) return response.status(400).json({ message: '제출 정보를 확인해 주세요. 공식 HTTP(S) 주소와 작업 태그가 필요합니다.' });
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO service_submissions
          (builder_id, name, tagline, description, service_url, docs_url, operator_contact_url, rights_notes, kind, tasks, rights_confirmed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)
         RETURNING *`,
        [builder.id, submission.name, submission.tagline, submission.description, submission.serviceUrl, submission.docsUrl, submission.operatorContactUrl, submission.rightsNotes, submission.kind, submission.tasks],
      );
      const row = inserted.rows[0];
      const snapshot = snapshotFromSubmission(row, String(row.id));
      await client.query(
        `INSERT INTO submission_revisions (submission_id, revision_no, snapshot) VALUES ($1, 1, $2)`,
        [row.id, JSON.stringify(snapshot)],
      );
      await client.query('COMMIT');
      response.status(201).json({ service: row });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  router.get('/services/:id', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder) return;
    const result = await getPool().query(
      `SELECT * FROM service_submissions WHERE id = $1 AND builder_id = $2`,
      [request.params.id, builder.id],
    );
    if (!result.rows[0]) return response.status(404).json({ message: '제출을 찾을 수 없습니다.' });
    response.json({ service: result.rows[0] });
  });

  router.patch('/services/:id', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const parsed = submissionSchema.safeParse(request.body);
    const submission = parsed.success ? validateSubmission(parsed.data) : undefined;
    if (!submission) return response.status(400).json({ message: '제출 정보를 확인해 주세요. 공식 HTTP(S) 주소와 작업 태그가 필요합니다.' });
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT * FROM service_submissions WHERE id = $1 AND builder_id = $2 FOR UPDATE`,
        [request.params.id, builder.id],
      );
      const row = current.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        return response.status(404).json({ message: '제출을 찾을 수 없습니다.' });
      }
      if (!['draft', 'rejected', 'approved', 'suspended'].includes(row.status)) {
        await client.query('ROLLBACK');
        return response.status(409).json({ message: '검토 중인 제출은 수정할 수 없습니다.' });
      }
      const updated = await client.query(
        `UPDATE service_submissions
            SET name=$3, tagline=$4, description=$5, service_url=$6, docs_url=$7, operator_contact_url=$8,
                rights_notes=$9, kind=$10, tasks=$11,
                rights_confirmed=TRUE, status='draft',
                approved_snapshot=CASE WHEN status='suspended' THEN NULL ELSE approved_snapshot END,
                updated_at=now()
          WHERE id=$1 AND builder_id=$2
          RETURNING *`,
        [request.params.id, builder.id, submission.name, submission.tagline, submission.description, submission.serviceUrl, submission.docsUrl, submission.operatorContactUrl, submission.rightsNotes, submission.kind, submission.tasks],
      );
      const revision = await client.query('SELECT COALESCE(MAX(revision_no), 0) + 1 AS next FROM submission_revisions WHERE submission_id=$1', [request.params.id]);
      const snapshot = snapshotFromSubmission(updated.rows[0], String(request.params.id));
      await client.query(
        `INSERT INTO submission_revisions (submission_id, revision_no, snapshot) VALUES ($1, $2, $3)`,
        [request.params.id, Number(revision.rows[0].next), JSON.stringify(snapshot)],
      );
      await client.query('COMMIT');
      response.json({ service: updated.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  router.post('/services/:id/submit', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const result = await getPool().query(
      `UPDATE service_submissions SET status='pending_review', updated_at=now()
        WHERE id=$1 AND builder_id=$2 AND status IN ('draft','rejected')
          AND name <> '' AND rights_confirmed=TRUE
        RETURNING id, status`,
      [request.params.id, builder.id],
    );
    if (!result.rows[0]) return response.status(404).json({ message: '제출할 초안을 찾을 수 없습니다.' });
    response.json({ service: result.rows[0] });
  });

  router.delete('/services/:id', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const result = await getPool().query(
      `DELETE FROM service_submissions WHERE id=$1 AND builder_id=$2 RETURNING id`,
      [request.params.id, builder.id],
    );
    if (!result.rows[0]) return response.status(404).json({ message: '삭제할 제출을 찾을 수 없습니다.' });
    response.status(200).json({ deleted: true });
  });

  router.get('/moderation/submissions', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder) return;
    const moderators = (process.env.BUILDER_MODERATOR_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!moderators.includes(builder.email.toLowerCase())) return response.status(403).json({ message: '운영자 권한이 필요합니다.' });
    const requestedStatus = typeof request.query.status === 'string' ? request.query.status : 'pending_review';
    const allowedStatuses = ['pending_review', 'approved', 'rejected', 'suspended'];
    if (!allowedStatuses.includes(requestedStatus)) return response.status(400).json({ message: '검수 상태가 올바르지 않습니다.' });
    const result = await getPool().query(
      `SELECT s.*, b.email AS builder_email
         FROM service_submissions s
         JOIN builders b ON b.id=s.builder_id
        WHERE s.status=$1
        ORDER BY s.updated_at ASC`,
      [requestedStatus],
    );
    response.json({ submissions: result.rows });
  });

  router.post('/moderation/submissions/:id', async (request, response) => {
    const builder = await authenticate(request as BuilderRequest, response);
    if (!builder || !requireCsrf(request as BuilderRequest, response)) return;
    const moderators = (process.env.BUILDER_MODERATOR_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!moderators.includes(builder.email.toLowerCase())) return response.status(403).json({ message: '운영자 권한이 필요합니다.' });
    const parsed = z.object({
      decision: z.enum(['approved', 'rejected', 'suspended']),
      reason: z.string().trim().min(5).max(1000),
    }).safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: '결정과 5~1000자 사유를 입력해 주세요.' });
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT * FROM service_submissions
          WHERE id=$1 AND (
            status='pending_review' OR
            ($2='suspended' AND status IN ('approved','rejected')) OR
            ($2='approved' AND status='suspended')
          )
          FOR UPDATE`,
        [request.params.id, parsed.data.decision],
      );
      const row = result.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        return response.status(404).json({ message: '검토 대기 중인 제출을 찾을 수 없습니다.' });
      }
      const approvedSnapshot = parsed.data.decision === 'approved'
        ? JSON.stringify(snapshotFromSubmission(row, String(row.id)))
        : row.approved_snapshot;
      await client.query(
        `UPDATE service_submissions SET status=$2, approved_snapshot=$3, updated_at=now() WHERE id=$1`,
        [request.params.id, parsed.data.decision, approvedSnapshot],
      );
      await client.query(
        `INSERT INTO moderation_reviews (submission_id, moderator_email, decision, reason)
         VALUES ($1,$2,$3,$4)`,
        [request.params.id, builder.email, parsed.data.decision, parsed.data.reason],
      );
      await client.query('COMMIT');
      response.json({ reviewed: true, decision: parsed.data.decision });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  return router;
}

export async function getPublishedBuilderServices(): Promise<CatalogService[]> {
  if (!process.env.DATABASE_URL) return [];
  const result = await getPool().query(
    `SELECT id, approved_snapshot FROM service_submissions
      WHERE status <> 'suspended' AND approved_snapshot IS NOT NULL AND approved_snapshot->>'name' <> ''
      ORDER BY updated_at DESC`,
  );
  return result.rows.map((row) => ({
    ...(row.approved_snapshot as CatalogService),
    id: String(row.id),
  }));
}

export async function findPublishedBuilderService(id: string): Promise<CatalogService | undefined> {
  if (!process.env.DATABASE_URL) return undefined;
  const result = await getPool().query(
    `SELECT id, approved_snapshot FROM service_submissions
      WHERE id=$1 AND status <> 'suspended' AND approved_snapshot IS NOT NULL`,
    [id],
  );
  const row = result.rows[0];
  return row ? { ...(row.approved_snapshot as CatalogService), id: String(row.id) } : undefined;
}

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EmailClient } from '@azure/communication-email';
import { Pool } from 'pg';
import type { CatalogService } from './catalog.js';

export type BuilderServiceDraft = {
  name: string;
  tagline: string;
  description: string;
  serviceUrl: string;
  tags: string[];
};

export type BuilderIdentity = {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'suspended';
  programVerified: boolean;
};

export interface BuilderPortalStore {
  initialize(): Promise<void>;
  issueMagicLink(email: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeMagicLink(tokenHash: string): Promise<BuilderIdentity | null>;
  createSession(builderId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getBuilderForSession(tokenHash: string): Promise<BuilderIdentity | null>;
  deleteSession(tokenHash: string): Promise<void>;
  listBuilders(): Promise<BuilderIdentity[]>;
  setBuilderStatus(builderId: string, status: BuilderIdentity['status'], programVerified: boolean): Promise<boolean>;
  listServices(): Promise<CatalogService[]>;
  listOwnedServices(builderId: string): Promise<CatalogService[]>;
  listOwnedServiceIds(builderId: string): Promise<string[]>;
  ownsService(builderId: string, serviceId: string): Promise<boolean>;
  requestOwnership(builderId: string, serviceId: string, evidence: string): Promise<void>;
  revokeMagicLink(tokenHash: string): Promise<void>;
  listOwnershipRequests(): Promise<Array<{ id: string; builderEmail: string; serviceId: string; evidence: string }>>;
  resolveOwnershipRequest(requestId: string, approved: boolean): Promise<boolean>;
  createSubmission(builderId: string, serviceId: string | null, draft: BuilderServiceDraft): Promise<void>;
  listSubmissions(): Promise<Array<{ id: string; builderEmail: string; serviceId: string | null; draft: BuilderServiceDraft; createdAt: string }>>;
  approveSubmission(submissionId: string): Promise<boolean>;
  rejectSubmission(submissionId: string): Promise<boolean>;
  listComments(serviceId: string): Promise<Array<{ id: string; nickname: string | null; body: string; createdAt: string; reportCount: number }>>;
  createComment(serviceId: string, nickname: string | null, body: string): Promise<string>;
  reportComment(serviceId: string, commentId: string): Promise<boolean>;
  listReportedComments(): Promise<Array<{ id: string; serviceId: string; body: string; reportCount: number; visible: boolean }>>;
  setCommentVisibility(commentId: string, visible: boolean): Promise<boolean>;
  deleteComment(commentId: string): Promise<boolean>;
  getDashboard(builderId: string): Promise<Array<{ serviceId: string; name: string; impressions: number; likes: number; dislikes: number; previewClicks: number; ratings: number; averageRating: number | null; comments: number }>>;
  recordFunnelEvent(name: string, metadata: Record<string, unknown>): Promise<void>;
}

const schema = `
CREATE TABLE IF NOT EXISTS gyro_builders (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'suspended')),
  program_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyro_builders ADD COLUMN IF NOT EXISTS program_verified boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS gyro_magic_links (
  token_hash text PRIMARY KEY,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS gyro_builder_sessions (
  token_hash text PRIMARY KEY,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_public_services (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES gyro_builders(id),
  draft jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_builder_ownership_requests (
  id uuid PRIMARY KEY,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  evidence text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_builder_service_ownership (
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (builder_id, service_id)
);
CREATE TABLE IF NOT EXISTS gyro_builder_submissions (
  id uuid PRIMARY KEY,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  service_id text,
  draft jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_public_comments (
  id uuid PRIMARY KEY,
  service_id text NOT NULL,
  nickname text,
  body text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_service_metrics (
  service_id text PRIMARY KEY,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating_total integer NOT NULL DEFAULT 0,
  rating_sum integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gyro_admin_audit (
  id uuid PRIMARY KEY,
  action text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gyro_comments_public_idx ON gyro_public_comments (service_id, created_at DESC) WHERE visible;
CREATE INDEX IF NOT EXISTS gyro_submissions_created_idx ON gyro_builder_submissions (created_at);
`;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createPostgresBuilderStore(connectionString: string): BuilderPortalStore {
  const hostname = new URL(connectionString).hostname;
  const usesLocalPostgres = hostname === '' || ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const pool = new Pool({
    connectionString,
    ssl: usesLocalPostgres ? false : { rejectUnauthorized: true },
    max: 10,
  });
  const query = <T extends import('pg').QueryResultRow = import('pg').QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ) => pool.query<T>(text, values);

  return {
    async initialize() {
      await query(schema);
    },
    async issueMagicLink(email, tokenHash, expiresAt) {
      const builderId = randomUUID();
      await query(
        `INSERT INTO gyro_builders (id, email, status, program_verified) VALUES ($1, $2, 'pending', false)
         ON CONFLICT (email) DO NOTHING`,
        [builderId, email],
      );
      const builder = await query<{ id: string }>('SELECT id FROM gyro_builders WHERE email = $1', [email]);
      await query('DELETE FROM gyro_magic_links WHERE builder_id = $1 OR expires_at < now()', [builder.rows[0].id]);
      await query('INSERT INTO gyro_magic_links (token_hash, builder_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, builder.rows[0].id, expiresAt]);
    },
    async revokeMagicLink(tokenHash) {
      await query('DELETE FROM gyro_magic_links WHERE token_hash = $1', [tokenHash]);
    },
    async consumeMagicLink(tokenHash) {
      const result = await query<BuilderIdentity>(
        `UPDATE gyro_magic_links SET consumed_at = now()
         WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
         RETURNING builder_id AS id`,
        [tokenHash],
      );
      const builderId = result.rows[0]?.id;
      if (!builderId) return null;
      const builder = await query<BuilderIdentity>(
        'SELECT id, email, status, program_verified AS "programVerified" FROM gyro_builders WHERE id = $1',
        [builderId],
      );
      return builder.rows[0] ?? null;
    },
    async createSession(builderId, tokenHash, expiresAt) {
      await query('DELETE FROM gyro_builder_sessions WHERE builder_id = $1 OR expires_at < now()', [builderId]);
      await query('INSERT INTO gyro_builder_sessions (token_hash, builder_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, builderId, expiresAt]);
    },
    async getBuilderForSession(tokenHash) {
      const result = await query<BuilderIdentity>(
        `SELECT b.id, b.email, b.status, b.program_verified AS "programVerified" FROM gyro_builder_sessions s
         JOIN gyro_builders b ON b.id = s.builder_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash],
      );
      return result.rows[0] ?? null;
    },
    async deleteSession(tokenHash) {
      await query('DELETE FROM gyro_builder_sessions WHERE token_hash = $1', [tokenHash]);
    },
    async listBuilders() {
      const result = await query<BuilderIdentity>(
        'SELECT id, email, status, program_verified AS "programVerified" FROM gyro_builders ORDER BY created_at DESC',
      );
      return result.rows;
    },
    async setBuilderStatus(builderId, status, programVerified) {
      const result = await query(
        `WITH updated AS (UPDATE gyro_builders SET status = $2, program_verified = $4 WHERE id = $1 RETURNING id)
         INSERT INTO gyro_admin_audit (id, action, target_id)
         SELECT $3, $5, id::text FROM updated RETURNING target_id`,
        [builderId, status, randomUUID(), programVerified, `builder_${status}${programVerified ? '_program_verified' : ''}`],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async listServices() {
      const result = await query<{ id: string; owner_id: string; draft: BuilderServiceDraft }>(
        'SELECT id, owner_id, draft FROM gyro_public_services ORDER BY created_at DESC',
      );
      return result.rows.map(({ id, draft }) => ({
        ...draft,
        id,
        audiences: ['student', 'teacher', 'parent', 'other'],
        room: '빌더 제출',
        roomKey: 'builder',
        number: id,
        imageUrl: draft.serviceUrl,
        kind: 'service',
        tasks: [],
        verification: { level: 'link', sources: [draft.serviceUrl] },
      }));
    },
    async listOwnedServices(builderId) {
      const result = await query<{ id: string; draft: BuilderServiceDraft }>(
        'SELECT id, draft FROM gyro_public_services WHERE owner_id = $1 ORDER BY created_at DESC',
        [builderId],
      );
      return result.rows.map(({ id, draft }) => ({
        ...draft,
        id,
        audiences: ['student', 'teacher', 'parent', 'other'],
        room: '빌더 제출',
        roomKey: 'builder',
        number: id,
        imageUrl: draft.serviceUrl,
        kind: 'service',
        tasks: [],
        verification: { level: 'link', sources: [draft.serviceUrl] },
      }));
    },
    async listOwnedServiceIds(builderId) {
      const result = await query<{ service_id: string }>(
        `SELECT service_id FROM gyro_builder_service_ownership WHERE builder_id = $1
         UNION SELECT id AS service_id FROM gyro_public_services WHERE owner_id = $1`,
        [builderId],
      );
      return result.rows.map((row) => row.service_id);
    },
    async ownsService(builderId, serviceId) {
      const result = await query(
        `SELECT 1 FROM gyro_builder_service_ownership WHERE builder_id = $1 AND service_id = $2
         UNION SELECT 1 FROM gyro_public_services WHERE owner_id = $1 AND id = $2 LIMIT 1`,
        [builderId, serviceId],
      );
      return result.rowCount !== 0;
    },
    async requestOwnership(builderId, serviceId, evidence) {
      await query(
        `INSERT INTO gyro_builder_ownership_requests (id, builder_id, service_id, evidence)
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), builderId, serviceId, evidence],
      );
    },
    async listOwnershipRequests() {
      const result = await query<{ id: string; builder_email: string; service_id: string; evidence: string }>(
        `SELECT r.id, b.email AS builder_email, r.service_id, r.evidence
         FROM gyro_builder_ownership_requests r JOIN gyro_builders b ON b.id = r.builder_id
         WHERE r.status = 'pending' ORDER BY r.created_at ASC`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        builderEmail: row.builder_email,
        serviceId: row.service_id,
        evidence: row.evidence,
      }));
    },
    async resolveOwnershipRequest(requestId, approved) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query<{ builder_id: string; service_id: string }>(
          `UPDATE gyro_builder_ownership_requests SET status = $2 WHERE id = $1 AND status = 'pending'
           RETURNING builder_id, service_id`,
          [requestId, approved ? 'approved' : 'rejected'],
        );
        const row = result.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return false;
        }
        if (approved) {
          await client.query(
            'INSERT INTO gyro_builder_service_ownership (builder_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [row.builder_id, row.service_id],
          );
        }
        await client.query(
          'INSERT INTO gyro_admin_audit (id, action, target_id) VALUES ($1, $2, $3)',
          [randomUUID(), `ownership_${approved ? 'approved' : 'rejected'}`, requestId],
        );
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async createSubmission(builderId, serviceId, draft) {
      await query(
        'INSERT INTO gyro_builder_submissions (id, builder_id, service_id, draft) VALUES ($1, $2, $3, $4)',
        [randomUUID(), builderId, serviceId, draft],
      );
    },
    async listSubmissions() {
      const result = await query<{ id: string; builder_email: string; service_id: string | null; draft: BuilderServiceDraft; created_at: Date }>(
        `SELECT s.id, b.email AS builder_email, s.service_id, s.draft, s.created_at
         FROM gyro_builder_submissions s JOIN gyro_builders b ON b.id = s.builder_id
         ORDER BY s.created_at ASC`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        builderEmail: row.builder_email,
        serviceId: row.service_id,
        draft: row.draft,
        createdAt: row.created_at.toISOString(),
      }));
    },
    async approveSubmission(submissionId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const submission = await client.query<{ id: string; builder_id: string; service_id: string | null; draft: BuilderServiceDraft }>(
          `SELECT id, builder_id, service_id, draft FROM gyro_builder_submissions
           WHERE id = $1 FOR UPDATE`,
          [submissionId],
        );
        const row = submission.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return false;
        }
        const id = row.service_id ?? `builder-${randomUUID()}`;
        await client.query(
          `INSERT INTO gyro_public_services (id, owner_id, draft) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET draft = EXCLUDED.draft, updated_at = now()
           WHERE gyro_public_services.owner_id = EXCLUDED.owner_id`,
          [id, row.builder_id, row.draft],
        );
        const published = await client.query('SELECT id FROM gyro_public_services WHERE id = $1 AND owner_id = $2', [id, row.builder_id]);
        if (published.rowCount === 0) {
          await client.query('ROLLBACK');
          return false;
        }
        await client.query(
          `INSERT INTO gyro_builder_ownership_requests (id, builder_id, service_id, evidence, status)
           VALUES ($1, $2, $3, '운영자 승인된 신규 서비스 제출', 'approved')`,
          [randomUUID(), row.builder_id, id],
        );
        await client.query('DELETE FROM gyro_builder_submissions WHERE id = $1', [submissionId]);
        await client.query(
          'INSERT INTO gyro_admin_audit (id, action, target_id) VALUES ($1, $2, $3)',
          [randomUUID(), 'submission_approved', submissionId],
        );
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async rejectSubmission(submissionId) {
      const result = await query(
        `WITH removed AS (DELETE FROM gyro_builder_submissions WHERE id = $1 RETURNING id)
         INSERT INTO gyro_admin_audit (id, action, target_id)
         SELECT $2, 'submission_rejected', id::text FROM removed RETURNING target_id`,
        [submissionId, randomUUID()],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async listComments(serviceId) {
      const result = await query<{ id: string; nickname: string | null; body: string; created_at: Date; report_count: number }>(
        `SELECT id, nickname, body, created_at, report_count FROM gyro_public_comments
         WHERE service_id = $1 AND visible = true ORDER BY created_at DESC LIMIT 100`,
        [serviceId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        nickname: row.nickname,
        body: row.body,
        createdAt: row.created_at.toISOString(),
        reportCount: row.report_count,
      }));
    },
    async createComment(serviceId, nickname, body) {
      const id = randomUUID();
      await query(
        'INSERT INTO gyro_public_comments (id, service_id, nickname, body) VALUES ($1, $2, $3, $4)',
        [id, serviceId, nickname, body],
      );
      return id;
    },
    async reportComment(serviceId, commentId) {
      const result = await query(
        'UPDATE gyro_public_comments SET report_count = report_count + 1 WHERE id = $1 AND service_id = $2 AND visible = true',
        [commentId, serviceId],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async listReportedComments() {
      const result = await query<{ id: string; service_id: string; body: string; report_count: number; visible: boolean }>(
        `SELECT id, service_id, body, report_count, visible FROM gyro_public_comments
         WHERE report_count > 0 ORDER BY visible DESC, report_count DESC, created_at ASC LIMIT 500`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        body: row.body,
        reportCount: row.report_count,
        visible: row.visible,
      }));
    },
    async setCommentVisibility(commentId, visible) {
      const result = await query(
        `WITH updated AS (UPDATE gyro_public_comments SET visible = $2 WHERE id = $1 RETURNING id)
         INSERT INTO gyro_admin_audit (id, action, target_id)
         SELECT $3, $4, id::text FROM updated RETURNING target_id`,
        [commentId, visible, randomUUID(), `comment_${visible ? 'shown' : 'hidden'}`],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async deleteComment(commentId) {
      const result = await query(
        `WITH removed AS (DELETE FROM gyro_public_comments WHERE id = $1 RETURNING id)
         INSERT INTO gyro_admin_audit (id, action, target_id)
         SELECT $2, 'comment_deleted', id::text FROM removed RETURNING target_id`,
        [commentId, randomUUID()],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async getDashboard(builderId) {
      const result = await query<{
        service_id: string;
        name: string;
        counts: Record<string, number>;
        rating_total: number;
        rating_sum: number;
        comments: string;
      }>(
        `WITH owned AS (
           SELECT service_id FROM gyro_builder_service_ownership WHERE builder_id = $1
           UNION SELECT id AS service_id FROM gyro_public_services WHERE owner_id = $1
         )
         SELECT o.service_id, COALESCE(s.draft->>'name', o.service_id) AS name,
           m.counts, m.rating_total, m.rating_sum,
           (SELECT count(*)::text FROM gyro_public_comments c WHERE c.service_id = o.service_id) AS comments
         FROM owned o
         LEFT JOIN gyro_public_services s ON s.id = o.service_id
         LEFT JOIN gyro_service_metrics m ON m.service_id = o.service_id
         ORDER BY o.service_id`,
        [builderId],
      );
      return result.rows.map((row) => ({
        serviceId: row.service_id,
        name: row.name,
        impressions: row.counts?.impressions ?? 0,
        likes: row.counts?.likes ?? 0,
        dislikes: row.counts?.dislikes ?? 0,
        previewClicks: row.counts?.previewClicks ?? 0,
        ratings: row.rating_total ?? 0,
        averageRating: row.rating_total ? row.rating_sum / row.rating_total : null,
        comments: Number(row.comments),
      }));
    },
    async recordFunnelEvent(name, metadata) {
      const serviceId = metadata.serviceId;
      if (typeof serviceId !== 'string') return;
      let metric: string | null = null;
      if (name === 'card_like') metric = 'likes';
      else if (name === 'card_dislike' && metadata.stage !== 'reason_tag') metric = 'dislikes';
      else if (name === 'card_skip') metric = 'skips';
      else if (name === 'service_click' && metadata.mode === 'embed' && metadata.stage !== 'preview_close') metric = 'previewClicks';
      else if (name === 'service_feedback_submit' && typeof metadata.rating === 'number') metric = 'ratings';
      else if (name === 'connection_report') metric = 'connectionReports';
      if (['likes', 'dislikes', 'skips'].includes(metric ?? '')) {
        await query(
          `INSERT INTO gyro_service_metrics (service_id, counts) VALUES ($1, jsonb_build_object('impressions', 1, $2::text, 1))
           ON CONFLICT (service_id) DO UPDATE SET counts =
             jsonb_set(
               jsonb_set(gyro_service_metrics.counts, '{impressions}',
                 to_jsonb(COALESCE((gyro_service_metrics.counts->>'impressions')::int, 0) + 1), true),
               ARRAY[$2::text], to_jsonb(COALESCE((gyro_service_metrics.counts->>$2::text)::int, 0) + 1), true)`,
          [serviceId, metric],
        );
      } else if (metric === 'ratings') {
        await query(
          `INSERT INTO gyro_service_metrics (service_id, rating_total, rating_sum)
           VALUES ($1, 1, $2)
           ON CONFLICT (service_id) DO UPDATE SET rating_total = gyro_service_metrics.rating_total + 1,
             rating_sum = gyro_service_metrics.rating_sum + EXCLUDED.rating_sum`,
          [serviceId, metadata.rating],
        );
      } else if (metric) {
        await query(
          `INSERT INTO gyro_service_metrics (service_id, counts) VALUES ($1, jsonb_build_object($2::text, 1))
           ON CONFLICT (service_id) DO UPDATE SET counts = jsonb_set(
             gyro_service_metrics.counts, ARRAY[$2::text],
             to_jsonb(COALESCE((gyro_service_metrics.counts->>$2::text)::int, 0) + 1), true)`,
          [serviceId, metric],
        );
      }
    },
  };
}

export function createMagicToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function digestToken(token: string): string {
  return hashToken(token);
}

export async function sendBuilderMagicLink(email: string, link: string): Promise<void> {
  const connectionString = process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING;
  const senderAddress = process.env.AZURE_COMMUNICATION_EMAIL_SENDER;
  if (!connectionString || !senderAddress) {
    throw new Error('빌더 매직링크 이메일 발송 설정이 없습니다.');
  }
  const client = new EmailClient(connectionString);
  const poller = await client.beginSend({
    senderAddress,
    recipients: { to: [{ address: email }] },
    content: {
      subject: 'Gyro 빌더 로그인 링크',
      plainText: `아래 링크에서 Gyro 빌더 포털에 로그인하세요. 15분 후 만료되며 한 번만 사용할 수 있습니다.\n\n${link}\n\n요청하지 않았다면 이 메일을 무시하세요.`,
    },
  });
  const result = await poller.pollUntilDone();
  if (result.status !== 'Succeeded') throw new Error('빌더 매직링크 이메일 발송에 실패했습니다.');
}

export function createDisabledBuilderStore(): null {
  return null;
}

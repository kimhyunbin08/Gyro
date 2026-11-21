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
  geo?: BuilderGeoDraft;
};

export type BuilderGeoDraft = {
  problem: string;
  targetUsers: string[];
  useCases: string[];
  capabilities: string[];
  keywords: string[];
  recommendationSummary: string;
};
export type BuilderSubmission = {
  id: string;
  serviceId: string | null;
  draft: BuilderServiceDraft;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt: string | null;
};

export type BuilderSocialLink = { label: string; url: string };
export type PublicBuilderProfile = { displayName: string; socialLinks: BuilderSocialLink[] };

export type BuilderIdentity = {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'suspended';
  programVerified: boolean;
};

export type Institution = { id: string; name: string; slug: string; description: string };
export type BuilderInstitution = Institution & {
  membershipStatus: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'revoked' | null;
  isAdmin: boolean;
};
export type InstitutionMembershipRequest = {
  builderId: string;
  displayName: string | null;
  createdAt: string;
};
export type InstitutionServiceRequest = {
  id: string;
  builderId: string;
  displayName: string | null;
  serviceId: string;
  serviceName: string;
  createdAt: string;
};
export type InstitutionAuditEvent = {
  action: string;
  targetId: string;
  actorId: string | null;
  createdAt: string;
};

export interface BuilderPortalStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  issueMagicLink(email: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeMagicLink(tokenHash: string): Promise<BuilderIdentity | null>;
  createSession(builderId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getBuilderForSession(tokenHash: string): Promise<BuilderIdentity | null>;
  deleteSession(tokenHash: string): Promise<void>;
  listBuilders(): Promise<BuilderIdentity[]>;
  setBuilderStatus(builderId: string, status: BuilderIdentity['status'], programVerified: boolean): Promise<boolean>;
  listServices(): Promise<CatalogService[]>;
  listPublicBuilderProfiles(): Promise<Array<{ serviceId: string; profile: PublicBuilderProfile }>>;
  listOwnedServices(builderId: string): Promise<CatalogService[]>;
  listOwnedServiceIds(builderId: string): Promise<string[]>;
  ownsService(builderId: string, serviceId: string): Promise<boolean>;
  requestOwnership(builderId: string, serviceId: string, evidence: string): Promise<void>;
  revokeMagicLink(tokenHash: string): Promise<void>;
  listOwnershipRequests(): Promise<Array<{ id: string; builderEmail: string; serviceId: string; evidence: string }>>;
  resolveOwnershipRequest(requestId: string, approved: boolean): Promise<boolean>;
  createSubmission(builderId: string, serviceId: string | null, draft: BuilderServiceDraft, rightsStatementVersion: string): Promise<void>;
  listSubmissions(): Promise<Array<{
    id: string; builderEmail: string; serviceId: string | null; draft: BuilderServiceDraft; createdAt: string;
    rightsAttestedAt: string | null; rightsStatementVersion: string | null;
  }>>;
  listBuilderSubmissions(builderId: string): Promise<BuilderSubmission[]>;
  approveSubmission(submissionId: string): Promise<boolean>;
  rejectSubmission(submissionId: string): Promise<boolean>;
  listComments(serviceId: string): Promise<Array<{ id: string; nickname: string | null; body: string; createdAt: string; reportCount: number }>>;
  createComment(serviceId: string, nickname: string | null, body: string, disclosureVersion: string): Promise<string>;
  reportComment(serviceId: string, commentId: string): Promise<boolean>;
  listReportedComments(): Promise<Array<{ id: string; serviceId: string; body: string; reportCount: number; visible: boolean }>>;
  setCommentVisibility(commentId: string, visible: boolean): Promise<boolean>;
  deleteComment(commentId: string): Promise<boolean>;
  getDashboard(builderId: string): Promise<Array<{ serviceId: string; name: string; impressions: number; likes: number; dislikes: number; previewClicks: number; ratings: number; averageRating: number | null; comments: number }>>;
  recordFunnelEvent(name: string, metadata: Record<string, unknown>): Promise<void>;
  getBuilderProfile(builderId: string): Promise<{ displayName: string; socialLinks: BuilderSocialLink[]; public: boolean }>;
  updateBuilderProfile(builderId: string, profile: { displayName: string; socialLinks: BuilderSocialLink[]; public: boolean }): Promise<void>;
  listInstitutions(): Promise<Institution[]>;
  createInstitution(input: { name: string; slug: string; description: string; adminEmail: string }): Promise<Institution | null>;
  listBuilderInstitutions(builderId: string): Promise<BuilderInstitution[]>;
  requestInstitutionMembership(builderId: string, institutionId: string): Promise<boolean>;
  withdrawInstitutionMembership(builderId: string, institutionId: string): Promise<boolean>;
  isInstitutionAdmin(builderId: string, institutionId: string): Promise<boolean>;
  listManagedInstitutions(builderId: string): Promise<Institution[]>;
  updateInstitutionProfile(institutionId: string, actorBuilderId: string, profile: { name: string; description: string }): Promise<boolean>;
  revokeInstitutionMembership(institutionId: string, builderId: string, actorBuilderId: string): Promise<boolean>;
  listInstitutionAuditHistory(institutionId: string): Promise<InstitutionAuditEvent[]>;
  listInstitutionMembershipRequests(institutionId: string): Promise<InstitutionMembershipRequest[]>;
  resolveInstitutionMembershipRequest(institutionId: string, builderId: string, actorBuilderId: string, approved: boolean): Promise<boolean>;
  requestInstitutionService(builderId: string, institutionId: string, serviceId: string): Promise<boolean>;
  listInstitutionServiceRequests(institutionId: string): Promise<InstitutionServiceRequest[]>;
  resolveInstitutionServiceRequest(institutionId: string, requestId: string, actorBuilderId: string, approved: boolean): Promise<boolean>;
  listInstitutionServiceIds(institutionId: string): Promise<string[]>;
  getInstitutionDashboard(institutionId: string): Promise<Array<{ serviceId: string; name: string; likes: number; dislikes: number; previewClicks: number; ratings: number; averageRating: number | null }>>;
  listInstitutionMembers(institutionId: string): Promise<Array<{ builderId: string; displayName: string | null; joinedAt: string }>>;
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
ALTER TABLE gyro_builders ADD COLUMN IF NOT EXISTS profile_display_name text NOT NULL DEFAULT '';
ALTER TABLE gyro_builders ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gyro_builders ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT false;
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rights_attested_at timestamptz,
  rights_statement_version text
);
ALTER TABLE gyro_builder_submissions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE gyro_builder_submissions ADD COLUMN IF NOT EXISTS decided_at timestamptz;
ALTER TABLE gyro_builder_submissions ADD COLUMN IF NOT EXISTS rights_attested_at timestamptz;
ALTER TABLE gyro_builder_submissions ADD COLUMN IF NOT EXISTS rights_statement_version text;
CREATE TABLE IF NOT EXISTS gyro_public_comments (
  id uuid PRIMARY KEY,
  service_id text NOT NULL,
  nickname text,
  body text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  disclosure_version text NOT NULL DEFAULT 'legacy',
  disclosed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyro_public_comments ADD COLUMN IF NOT EXISTS disclosure_version text NOT NULL DEFAULT 'legacy';
ALTER TABLE gyro_public_comments ADD COLUMN IF NOT EXISTS disclosed_at timestamptz NOT NULL DEFAULT now();
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
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gyro_admin_audit ADD COLUMN IF NOT EXISTS actor_id text;
CREATE TABLE IF NOT EXISTS gyro_institutions (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gyro_institution_admins (
  institution_id uuid NOT NULL REFERENCES gyro_institutions(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, builder_id)
);
CREATE TABLE IF NOT EXISTS gyro_institution_memberships (
  institution_id uuid NOT NULL REFERENCES gyro_institutions(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, builder_id)
);
CREATE TABLE IF NOT EXISTS gyro_institution_service_requests (
  id uuid PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES gyro_institutions(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, builder_id, service_id)
);
CREATE TABLE IF NOT EXISTS gyro_institution_services (
  institution_id uuid NOT NULL REFERENCES gyro_institutions(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES gyro_builders(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, service_id)
);
CREATE INDEX IF NOT EXISTS gyro_comments_public_idx ON gyro_public_comments (service_id, created_at DESC) WHERE visible;
CREATE INDEX IF NOT EXISTS gyro_submissions_created_idx ON gyro_builder_submissions (created_at);
CREATE INDEX IF NOT EXISTS gyro_membership_queue_idx ON gyro_institution_memberships (institution_id, status, created_at);
CREATE INDEX IF NOT EXISTS gyro_institution_service_queue_idx ON gyro_institution_service_requests (institution_id, status, created_at);
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
      await query('DELETE FROM gyro_magic_links WHERE expires_at <= now() OR consumed_at IS NOT NULL');
      await query('DELETE FROM gyro_builder_sessions WHERE expires_at <= now()');
    },
    async close() {
      await pool.end();
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
    async listPublicBuilderProfiles() {
      const result = await query<{
        service_id: string;
        display_name: string;
        social_links: BuilderSocialLink[];
      }>(
        `SELECT DISTINCT owned.service_id, b.profile_display_name AS display_name, b.social_links
         FROM (
           SELECT id AS service_id, owner_id AS builder_id FROM gyro_public_services
           UNION
           SELECT service_id, builder_id FROM gyro_builder_service_ownership
         ) owned
         JOIN gyro_builders b ON b.id = owned.builder_id
         WHERE b.status = 'approved' AND b.program_verified = true
           AND b.profile_public = true AND b.profile_display_name <> ''
         ORDER BY owned.service_id`,
      );
      return result.rows.map((row) => ({
        serviceId: row.service_id,
        profile: { displayName: row.display_name, socialLinks: row.social_links ?? [] },
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
    async createSubmission(builderId, serviceId, draft, rightsStatementVersion) {
      await query(
        `INSERT INTO gyro_builder_submissions
           (id, builder_id, service_id, draft, rights_attested_at, rights_statement_version)
         VALUES ($1, $2, $3, $4, now(), $5)`,
        [randomUUID(), builderId, serviceId, draft, rightsStatementVersion],
      );
    },
    async listSubmissions() {
      const result = await query<{
        id: string; builder_email: string; service_id: string | null; draft: BuilderServiceDraft; created_at: Date;
        rights_attested_at: Date | null; rights_statement_version: string | null;
      }>(
        `SELECT s.id, b.email AS builder_email, s.service_id, s.draft, s.created_at,
                s.rights_attested_at, s.rights_statement_version
         FROM gyro_builder_submissions s JOIN gyro_builders b ON b.id = s.builder_id
         WHERE s.status = 'pending'
         ORDER BY s.created_at ASC`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        builderEmail: row.builder_email,
        serviceId: row.service_id,
        draft: row.draft,
        createdAt: row.created_at.toISOString(),
        rightsAttestedAt: row.rights_attested_at?.toISOString() ?? null,
        rightsStatementVersion: row.rights_statement_version,
      }));
    },
    async listBuilderSubmissions(builderId) {
      const result = await query<{
        id: string; service_id: string | null; draft: BuilderServiceDraft;
        status: BuilderSubmission['status']; created_at: Date; decided_at: Date | null;
      }>(
        `SELECT id, service_id, draft, status, created_at, decided_at
         FROM gyro_builder_submissions WHERE builder_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [builderId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        draft: row.draft,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        decidedAt: row.decided_at?.toISOString() ?? null,
      }));
    },
    async approveSubmission(submissionId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const submission = await client.query<{ id: string; builder_id: string; service_id: string | null; draft: BuilderServiceDraft }>(
          `SELECT id, builder_id, service_id, draft FROM gyro_builder_submissions
           WHERE id = $1 AND status = 'pending' FOR UPDATE`,
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
        await client.query(
          `UPDATE gyro_builder_submissions SET status = 'approved', decided_at = now() WHERE id = $1`,
          [submissionId],
        );
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
        `WITH rejected AS (
           UPDATE gyro_builder_submissions SET status = 'rejected', decided_at = now()
           WHERE id = $1 AND status = 'pending' RETURNING id
         )
         INSERT INTO gyro_admin_audit (id, action, target_id)
         SELECT $2, 'submission_rejected', id::text FROM rejected RETURNING target_id`,
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
    async createComment(serviceId, nickname, body, disclosureVersion) {
      const id = randomUUID();
      await query(
        `INSERT INTO gyro_public_comments (id, service_id, nickname, body, disclosure_version, disclosed_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [id, serviceId, nickname, body, disclosureVersion],
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
    async getBuilderProfile(builderId) {
      const result = await query<{ profile_display_name: string; social_links: BuilderSocialLink[]; profile_public: boolean }>(
        'SELECT profile_display_name, social_links, profile_public FROM gyro_builders WHERE id = $1',
        [builderId],
      );
      const row = result.rows[0];
      if (!row) throw new Error('빌더 계정을 찾을 수 없습니다.');
      return { displayName: row.profile_display_name, socialLinks: row.social_links ?? [], public: row.profile_public };
    },
    async updateBuilderProfile(builderId, profile) {
      await query(
        'UPDATE gyro_builders SET profile_display_name = $2, social_links = $3, profile_public = $4 WHERE id = $1',
        [builderId, profile.displayName, JSON.stringify(profile.socialLinks), profile.public],
      );
    },
    async listInstitutions() {
      const result = await query<Institution>(
        `SELECT id, name, slug, description FROM gyro_institutions
         WHERE status = 'approved' ORDER BY name`,
      );
      return result.rows;
    },
    async createInstitution(input) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const builder = await client.query<{ id: string }>(
          `SELECT id FROM gyro_builders WHERE email = $1 AND status = 'approved' AND program_verified = true FOR UPDATE`,
          [input.adminEmail],
        );
        if (!builder.rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }
        const institutionId = randomUUID();
        await client.query(
          `INSERT INTO gyro_institutions (id, name, slug, description) VALUES ($1, $2, $3, $4)`,
          [institutionId, input.name, input.slug, input.description],
        );
        await client.query(
          'INSERT INTO gyro_institution_admins (institution_id, builder_id) VALUES ($1, $2)',
          [institutionId, builder.rows[0].id],
        );
        await client.query(
          'INSERT INTO gyro_admin_audit (id, action, target_id, actor_id) VALUES ($1, $2, $3, $4)',
          [randomUUID(), 'institution_created', institutionId, 'operator'],
        );
        await client.query('COMMIT');
        return { id: institutionId, name: input.name, slug: input.slug, description: input.description };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async listBuilderInstitutions(builderId) {
      const result = await query<{
        id: string; name: string; slug: string; description: string;
        membership_status: BuilderInstitution['membershipStatus']; is_admin: boolean;
      }>(
        `SELECT i.id, i.name, i.slug, i.description, m.status AS membership_status,
           EXISTS (SELECT 1 FROM gyro_institution_admins a WHERE a.institution_id = i.id AND a.builder_id = $1) AS is_admin
         FROM gyro_institutions i
         LEFT JOIN gyro_institution_memberships m ON m.institution_id = i.id AND m.builder_id = $1
         WHERE i.status = 'approved' AND (
           m.builder_id IS NOT NULL OR EXISTS (
             SELECT 1 FROM gyro_institution_admins a WHERE a.institution_id = i.id AND a.builder_id = $1
           )
         )
         ORDER BY i.name`,
        [builderId],
      );
      return result.rows.map((row) => ({
        id: row.id, name: row.name, slug: row.slug, description: row.description,
        membershipStatus: row.membership_status, isAdmin: row.is_admin,
      }));
    },
    async requestInstitutionMembership(builderId, institutionId) {
      const result = await query(
        `WITH requested AS (
         INSERT INTO gyro_institution_memberships (institution_id, builder_id, status)
         SELECT id, $2, 'pending' FROM gyro_institutions WHERE id = $1 AND status = 'approved'
         ON CONFLICT (institution_id, builder_id) DO UPDATE SET status = 'pending', created_at = now(), updated_at = now()
         WHERE gyro_institution_memberships.status IN ('rejected', 'withdrawn', 'revoked')
         RETURNING institution_id, builder_id
         )
         INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
         SELECT $3, 'institution_membership_requested', institution_id::text || ':' || builder_id::text, builder_id::text
         FROM requested RETURNING target_id`,
        [institutionId, builderId, randomUUID()],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async withdrawInstitutionMembership(builderId, institutionId) {
      const result = await query(
        `WITH withdrawn AS (
           UPDATE gyro_institution_memberships SET status = 'withdrawn', updated_at = now()
           WHERE builder_id = $1 AND institution_id = $2 AND status IN ('pending', 'approved')
           RETURNING institution_id, builder_id
         )
         , revoked_requests AS (
           UPDATE gyro_institution_service_requests r SET status = 'revoked'
           FROM withdrawn w
           WHERE r.institution_id = w.institution_id AND r.builder_id = w.builder_id AND r.status = 'pending'
           RETURNING r.institution_id, r.builder_id, r.service_id
         )
         , audit_members AS (
           INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
           SELECT $3, 'institution_membership_withdrawn',
             institution_id::text || ':' || builder_id::text, builder_id::text FROM withdrawn
           RETURNING id
         )
         , audit_requests AS (
           INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
           SELECT gen_random_uuid(), 'institution_service_revoked',
             institution_id::text || ':' || service_id, builder_id::text FROM revoked_requests
           RETURNING id
         )
         SELECT institution_id FROM withdrawn`,
        [builderId, institutionId, randomUUID()],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async isInstitutionAdmin(builderId, institutionId) {
      const result = await query(
        `SELECT 1 FROM gyro_institution_admins a
         JOIN gyro_institutions i ON i.id = a.institution_id
         JOIN gyro_builders b ON b.id = a.builder_id
         WHERE a.builder_id = $1 AND a.institution_id = $2
           AND i.status = 'approved' AND b.status = 'approved' AND b.program_verified = true`,
        [builderId, institutionId],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async listManagedInstitutions(builderId) {
      const result = await query<Institution>(
        `SELECT i.id, i.name, i.slug, i.description FROM gyro_institutions i
         JOIN gyro_institution_admins a ON a.institution_id = i.id
         WHERE a.builder_id = $1 AND i.status = 'approved' ORDER BY i.name`,
        [builderId],
      );
      return result.rows;
    },
    async updateInstitutionProfile(institutionId, actorBuilderId, profile) {
      const result = await query(
        `WITH updated AS (
           UPDATE gyro_institutions SET name = $2, description = $3
           WHERE id = $1 AND status = 'approved' RETURNING id
         )
         INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
         SELECT $4, 'institution_profile_updated', id::text, $5 FROM updated RETURNING target_id`,
        [institutionId, profile.name, profile.description, randomUUID(), actorBuilderId],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async revokeInstitutionMembership(institutionId, builderId, actorBuilderId) {
      const result = await query(
        `WITH revoked AS (
           UPDATE gyro_institution_memberships SET status = 'revoked', updated_at = now()
           WHERE institution_id = $1 AND builder_id = $2 AND status = 'approved'
           RETURNING institution_id, builder_id
         )
         , revoked_requests AS (
           UPDATE gyro_institution_service_requests r SET status = 'revoked'
           FROM revoked w
           WHERE r.institution_id = w.institution_id AND r.builder_id = w.builder_id AND r.status = 'pending'
           RETURNING r.institution_id, r.builder_id, r.service_id
         )
         , audit_members AS (
           INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
           SELECT $3, 'institution_membership_revoked',
             institution_id::text || ':' || builder_id::text, $4 FROM revoked
           RETURNING id
         )
         , audit_requests AS (
           INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
           SELECT gen_random_uuid(), 'institution_service_revoked',
             institution_id::text || ':' || service_id, $4 FROM revoked_requests
           RETURNING id
         )
         SELECT institution_id FROM revoked`,
        [institutionId, builderId, randomUUID(), actorBuilderId],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async listInstitutionAuditHistory(institutionId) {
      const result = await query<{
        action: string; target_id: string; actor_id: string | null; created_at: Date;
      }>(
        `SELECT action, target_id, actor_id, created_at FROM gyro_admin_audit
         WHERE (target_id = $1 OR target_id LIKE $2) AND action LIKE 'institution_%'
         ORDER BY created_at DESC LIMIT 100`,
        [institutionId, `${institutionId}:%`],
      );
      return result.rows.map((row) => ({
        action: row.action,
        targetId: row.target_id,
        actorId: row.actor_id,
        createdAt: row.created_at.toISOString(),
      }));
    },
    async listInstitutionMembershipRequests(institutionId) {
      const result = await query<{ builder_id: string; display_name: string; created_at: Date }>(
        `SELECT b.id AS builder_id, b.profile_display_name AS display_name, m.created_at
         FROM gyro_institution_memberships m JOIN gyro_builders b ON b.id = m.builder_id
         WHERE m.institution_id = $1 AND m.status = 'pending' AND b.status <> 'suspended'
         ORDER BY m.created_at`,
        [institutionId],
      );
      return result.rows.map((row) => ({
        builderId: row.builder_id,
        displayName: row.display_name || null,
        createdAt: row.created_at.toISOString(),
      }));
    },
    async resolveInstitutionMembershipRequest(institutionId, builderId, actorBuilderId, approved) {
      const result = await query(
        `WITH updated AS (
           UPDATE gyro_institution_memberships SET status = $3, updated_at = now()
           WHERE institution_id = $1 AND builder_id = $2 AND status = 'pending' RETURNING institution_id, builder_id
         )
         INSERT INTO gyro_admin_audit (id, action, target_id, actor_id)
         SELECT $4, $5, institution_id::text || ':' || builder_id::text, $6 FROM updated RETURNING target_id`,
        [
          institutionId, builderId, approved ? 'approved' : 'rejected', randomUUID(),
          `institution_membership_${approved ? 'approved' : 'rejected'}`, actorBuilderId,
        ],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async requestInstitutionService(builderId, institutionId, serviceId) {
      const result = await query(
        `INSERT INTO gyro_institution_service_requests (id, institution_id, builder_id, service_id)
         SELECT $1, m.institution_id, m.builder_id, $4
         FROM gyro_institution_memberships m
         JOIN gyro_institutions i ON i.id = m.institution_id AND i.status = 'approved'
         JOIN gyro_builder_service_ownership o ON o.builder_id = m.builder_id AND o.service_id = $4
         WHERE m.institution_id = $2 AND m.builder_id = $3 AND m.status = 'approved'
         ON CONFLICT (institution_id, builder_id, service_id) DO UPDATE SET status = 'pending', created_at = now()
         WHERE gyro_institution_service_requests.status IN ('rejected', 'revoked')
         RETURNING id`,
        [randomUUID(), institutionId, builderId, serviceId],
      );
      if ((result.rowCount ?? 0) > 0) {
        await query(
          `INSERT INTO gyro_admin_audit (id, action, target_id, actor_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), 'institution_service_requested', `${institutionId}:${serviceId}`, builderId],
        );
        return true;
      }
      const owner = await query(
        `SELECT 1 FROM gyro_public_services s
         JOIN gyro_institution_memberships m ON m.builder_id = s.owner_id AND m.institution_id = $2 AND m.status = 'approved'
        JOIN gyro_institutions i ON i.id = m.institution_id AND i.status = 'approved'
         WHERE s.id = $1 AND s.owner_id = $3`,
        [serviceId, institutionId, builderId],
      );
      if ((owner.rowCount ?? 0) === 0) return false;
      const retry = await query(
        `INSERT INTO gyro_institution_service_requests (id, institution_id, builder_id, service_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (institution_id, builder_id, service_id) DO UPDATE SET status = 'pending', created_at = now()
         WHERE gyro_institution_service_requests.status IN ('rejected', 'revoked')
         RETURNING id`,
        [randomUUID(), institutionId, builderId, serviceId],
      );
      if ((retry.rowCount ?? 0) > 0) {
        await query(
          `INSERT INTO gyro_admin_audit (id, action, target_id, actor_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), 'institution_service_requested', `${institutionId}:${serviceId}`, builderId],
        );
        return true;
      }
      return false;
    },
    async listInstitutionServiceRequests(institutionId) {
      const result = await query<{
        id: string; builder_id: string; display_name: string; service_id: string; service_name: string; created_at: Date;
      }>(
        `SELECT r.id, r.builder_id, b.profile_display_name AS display_name, r.service_id,
           COALESCE(s.draft->>'name', r.service_id) AS service_name, r.created_at
         FROM gyro_institution_service_requests r JOIN gyro_builders b ON b.id = r.builder_id
         LEFT JOIN gyro_public_services s ON s.id = r.service_id
         WHERE r.institution_id = $1 AND r.status = 'pending'
         ORDER BY r.created_at`,
        [institutionId],
      );
      return result.rows.map((row) => ({
        id: row.id, builderId: row.builder_id, displayName: row.display_name || null,
        serviceId: row.service_id, serviceName: row.service_name, createdAt: row.created_at.toISOString(),
      }));
    },
    async resolveInstitutionServiceRequest(institutionId, requestId, actorBuilderId, approved) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const requestResult = await client.query<{ builder_id: string; service_id: string }>(
          `SELECT builder_id, service_id FROM gyro_institution_service_requests
           WHERE id = $1 AND institution_id = $2 AND status = 'pending' FOR UPDATE`,
          [requestId, institutionId],
        );
        const row = requestResult.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return false;
        }
        const membership = await client.query(
          `SELECT 1 FROM gyro_institution_memberships WHERE institution_id = $1 AND builder_id = $2 AND status = 'approved'`,
          [institutionId, row.builder_id],
        );
        const ownership = await client.query(
          `SELECT 1 FROM gyro_builder_service_ownership WHERE builder_id = $1 AND service_id = $2
           UNION SELECT 1 FROM gyro_public_services WHERE owner_id = $1 AND id = $2 LIMIT 1`,
          [row.builder_id, row.service_id],
        );
        if ((membership.rowCount ?? 0) === 0 || (ownership.rowCount ?? 0) === 0) {
          await client.query('ROLLBACK');
          return false;
        }
        await client.query(
          `UPDATE gyro_institution_service_requests SET status = $2 WHERE id = $1`,
          [requestId, approved ? 'approved' : 'rejected'],
        );
        if (approved) {
          await client.query(
            `INSERT INTO gyro_institution_services (institution_id, builder_id, service_id) VALUES ($1, $2, $3)
             ON CONFLICT (institution_id, service_id) DO NOTHING`,
            [institutionId, row.builder_id, row.service_id],
          );
        }
        await client.query(
          `INSERT INTO gyro_admin_audit (id, action, target_id, actor_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), `institution_service_${approved ? 'approved' : 'rejected'}`, `${institutionId}:${row.service_id}`, actorBuilderId],
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
    async listInstitutionServiceIds(institutionId) {
      const result = await query<{ service_id: string }>(
        `SELECT s.service_id FROM gyro_institution_services s
         JOIN gyro_institutions i ON i.id = s.institution_id
         WHERE s.institution_id = $1 AND i.status = 'approved' ORDER BY s.created_at DESC`,
        [institutionId],
      );
      return result.rows.map((row) => row.service_id);
    },
    async getInstitutionDashboard(institutionId) {
      const result = await query<{
        service_id: string; name: string; counts: Record<string, number>;
        rating_total: number; rating_sum: number;
      }>(
        `SELECT s.service_id, COALESCE(p.draft->>'name', s.service_id) AS name,
           m.counts, m.rating_total, m.rating_sum
         FROM gyro_institution_services s
         LEFT JOIN gyro_public_services p ON p.id = s.service_id
         LEFT JOIN gyro_service_metrics m ON m.service_id = s.service_id
         WHERE s.institution_id = $1 ORDER BY s.created_at DESC`,
        [institutionId],
      );
      return result.rows.map((row) => ({
        serviceId: row.service_id, name: row.name,
        likes: row.counts?.likes ?? 0, dislikes: row.counts?.dislikes ?? 0,
        previewClicks: row.counts?.previewClicks ?? 0,
        ratings: row.rating_total ?? 0,
        averageRating: row.rating_total ? row.rating_sum / row.rating_total : null,
      }));
    },
    async listInstitutionMembers(institutionId) {
      const result = await query<{ builder_id: string; display_name: string; joined_at: Date }>(
        `SELECT b.id AS builder_id, b.profile_display_name AS display_name, m.updated_at AS joined_at
         FROM gyro_institution_memberships m JOIN gyro_builders b ON b.id = m.builder_id
         WHERE m.institution_id = $1 AND m.status = 'approved' ORDER BY m.updated_at`,
        [institutionId],
      );
      return result.rows.map((row) => ({
        builderId: row.builder_id,
        displayName: row.display_name || null,
        joinedAt: row.joined_at.toISOString(),
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

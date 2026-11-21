import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { createMagicToken, createPostgresBuilderStore, digestToken } from '../src/builder-portal.js';

const databaseUrl = process.env.GYRO_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('builder and institution portal with PostgreSQL', () => {
  const store = databaseUrl ? createPostgresBuilderStore(databaseUrl) : null;
  const auditPool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
  let app: ReturnType<typeof createApp>;
  const origin = 'http://localhost:4173';

  function getStore() {
    if (!store) throw new Error('GYRO_TEST_DATABASE_URL is required for this suite.');
    return store;
  }

  function getAuditPool() {
    if (!auditPool) throw new Error('GYRO_TEST_DATABASE_URL is required for this suite.');
    return auditPool;
  }

  beforeAll(async () => {
    const testStore = getStore();
    vi.stubEnv('GYRO_BUILDER_PORTAL_ENABLED', 'true');
    vi.stubEnv('GYRO_PUBLIC_COMMENTS_ENABLED', 'true');
    vi.stubEnv('WEB_ORIGIN', origin);
    vi.stubEnv('BUILDER_ADMIN_TOKEN', 'postgres-integration-admin');
    await testStore.initialize();
    await testStore.initialize();
    app = createApp({ builderStore: testStore });
  });

  afterAll(async () => {
    if (auditPool) await auditPool.end();
    if (store) await store.close();
    vi.unstubAllEnvs();
  });

  async function createApprovedBuilder(email: string): Promise<{ id: string; cookie: string }> {
    const testStore = getStore();
    const { token, tokenHash } = createMagicToken();
    await testStore.issueMagicLink(email, tokenHash, new Date(Date.now() + 60_000));
    const builder = await testStore.consumeMagicLink(tokenHash);
    if (!builder) throw new Error('Failed to consume PostgreSQL test magic link.');
    const approved = await testStore.setBuilderStatus(builder.id, 'approved', true);
    if (!approved) throw new Error('Failed to approve PostgreSQL test builder.');
    const sessionToken = randomBytes(32).toString('base64url');
    await testStore.createSession(builder.id, digestToken(sessionToken), new Date(Date.now() + 60_000));
    expect(token).toHaveLength(43);
    return { id: builder.id, cookie: `gyro_builder_session=${sessionToken}` };
  }

  it('creates an institution, approves membership and service linking, and isolates other builders', async () => {
    const suffix = randomBytes(5).toString('hex');
    const admin = await createApprovedBuilder(`admin-${suffix}@example.test`);
    const member = await createApprovedBuilder(`member-${suffix}@example.test`);
    const outsider = await createApprovedBuilder(`outsider-${suffix}@example.test`);

    const savedProfile = await request(app)
      .put('/api/builder/profile')
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({
        displayName: `Maker ${suffix}`,
        socialLinks: [{ label: 'Portfolio', url: 'https://example.test/portfolio' }],
        public: true,
      });
    expect(savedProfile.status).toBe(200);
    expect((await request(app).get('/api/builder/profile').set('Cookie', member.cookie)).body.profile)
      .toEqual(expect.objectContaining({ displayName: `Maker ${suffix}`, public: true }));

    const created = await request(app)
      .post('/api/admin/institutions')
      .set('X-Admin-Token', 'postgres-integration-admin')
      .send({
        name: `Test Institution ${suffix}`,
        slug: `test-institution-${suffix}`,
        description: 'PostgreSQL integration test institution',
        adminEmail: `ADMIN-${suffix}@example.test`,
      });
    expect(created.status).toBe(201);
    const institutionId = created.body.institution.id as string;
    const otherInstitution = await request(app)
      .post('/api/admin/institutions')
      .set('X-Admin-Token', 'postgres-integration-admin')
      .send({
        name: `Other Institution ${suffix}`,
        slug: `other-institution-${suffix}`,
        description: 'Second test institution',
        adminEmail: `outsider-${suffix}@example.test`,
      });
    expect(otherInstitution.status).toBe(201);
    const otherInstitutionId = otherInstitution.body.institution.id as string;
    expect((await request(app).get('/api/institutions')).body.institutions).toContainEqual(
      expect.objectContaining({ id: institutionId }),
    );

    const membership = await request(app)
      .post(`/api/builder/institutions/${institutionId}/membership`)
      .set('Origin', origin).set('Cookie', member.cookie).send({});
    expect(membership.status).toBe(202);

    const outsiderDecision = await request(app)
      .patch(`/api/institution/${institutionId}/members/${member.id}`)
      .set('Origin', origin).set('Cookie', outsider.cookie).send({ approved: true });
    expect(outsiderDecision.status).toBe(403);
    expect((await request(app)
      .get('/api/institution/dashboard')
      .query({ institutionId: otherInstitutionId }).set('Cookie', outsider.cookie)).status).toBe(200);

    const approvedMembership = await request(app)
      .patch(`/api/institution/${institutionId}/members/${member.id}`)
      .set('Origin', origin).set('Cookie', admin.cookie).send({ approved: true });
    expect(approvedMembership.status).toBe(200);

    const outsiderMembership = await request(app)
      .post(`/api/builder/institutions/${institutionId}/membership`)
      .set('Origin', origin).set('Cookie', outsider.cookie).send({});
    expect(outsiderMembership.status).toBe(202);
    const rejectedMembership = await request(app)
      .patch(`/api/institution/${institutionId}/members/${outsider.id}`)
      .set('Origin', origin).set('Cookie', admin.cookie).send({ approved: false });
    expect(rejectedMembership.status).toBe(200);
    const outsiderInstitutions = (await request(app).get('/api/builder/institutions').set('Cookie', outsider.cookie))
      .body.institutions as Array<{ id: string; membershipStatus: string | null }>;
    expect(outsiderInstitutions.find((institution) => institution.id === institutionId)?.membershipStatus)
      .toBe('rejected');

    const submission = await request(app)
      .post('/api/builder/services')
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({
        name: `Service ${suffix}`,
        tagline: 'A practical service for PostgreSQL integration checks',
        description: 'This service fixture validates builder submissions and institutional service linking.',
        serviceUrl: 'https://example.test/service',
        tags: ['testing'],
        geo: {
          problem: 'Integration test fixture',
          targetUsers: ['Test maintainers'],
          useCases: ['Exercise the review pipeline'],
          capabilities: ['GEO payload persistence'],
          keywords: ['postgres integration'],
          recommendationSummary: 'A test-only service fixture.',
        },
        rightsConfirmed: true,
      });
    expect(submission.status).toBe(202);
    const builderSubmissions = await request(app)
      .get('/api/builder/submissions').set('Cookie', member.cookie);
    expect(builderSubmissions.body.submissions).toEqual([
      expect.objectContaining({ status: 'pending', draft: expect.objectContaining({ geo: expect.any(Object) }) }),
    ]);

    const queue = await request(app)
      .get('/api/admin/submissions')
      .set('X-Admin-Token', 'postgres-integration-admin');
    const pending = queue.body.submissions.find((item: { builderEmail: string }) => item.builderEmail === `member-${suffix}@example.test`);
    expect(pending).toBeDefined();
    const published = await request(app)
      .post(`/api/admin/submissions/${pending.id}/approve`)
      .set('X-Admin-Token', 'postgres-integration-admin');
    expect(published.status).toBe(200);
    expect((await request(app).get('/api/builder/submissions').set('Cookie', member.cookie))
      .body.submissions[0].status).toBe('approved');
    const attestation = await getAuditPool().query<{ rights_attested_at: Date; rights_statement_version: string }>(
      `SELECT rights_attested_at, rights_statement_version FROM gyro_builder_submissions WHERE id = $1`,
      [pending.id],
    );
    expect(attestation.rows[0]).toEqual(expect.objectContaining({
      rights_statement_version: 'builder-rights-v1',
    }));
    expect(attestation.rows[0].rights_attested_at).toBeInstanceOf(Date);
    const publishedService = (await getStore().listServices())
      .find((service) => service.name === `Service ${suffix}`);
    expect(publishedService).toBeDefined();
    const comment = await request(app)
      .post(`/api/services/${encodeURIComponent(publishedService!.id)}/comments`)
      .send({ body: '공개 안내가 저장되는지 확인하는 테스트 댓글입니다.', publicDisclosureAccepted: true });
    expect(comment.status).toBe(201);
    const disclosure = await getAuditPool().query<{ disclosure_version: string; disclosed_at: Date }>(
      'SELECT disclosure_version, disclosed_at FROM gyro_public_comments WHERE id = $1',
      [comment.body.id],
    );
    expect(disclosure.rows[0]?.disclosure_version).toBe('public-comment-v1');
    expect(disclosure.rows[0]?.disclosed_at).toBeInstanceOf(Date);
    const rejectedSubmission = await request(app)
      .post('/api/builder/services')
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({
        name: `Rejected ${suffix}`,
        tagline: 'A separate rejected service proposal for status history',
        description: 'This proposal remains private after the operator rejects it.',
        serviceUrl: 'https://example.test/rejected',
        tags: ['testing'],
        rightsConfirmed: true,
      });
    expect(rejectedSubmission.status).toBe(202);
    const rejectedQueue = await request(app)
      .get('/api/admin/submissions')
      .set('X-Admin-Token', 'postgres-integration-admin');
    const rejectedPending = rejectedQueue.body.submissions.find(
      (item: { draft: { name: string } }) => item.draft.name === `Rejected ${suffix}`,
    );
    const rejection = await request(app)
      .post(`/api/admin/submissions/${rejectedPending.id}/reject`)
      .set('X-Admin-Token', 'postgres-integration-admin');
    expect(rejection.status).toBe(200);
    expect((await request(app).get('/api/builder/submissions').set('Cookie', member.cookie))
      .body.submissions.find((item: { draft: { name: string } }) => item.draft.name === `Rejected ${suffix}`).status)
      .toBe('rejected');

    const owned = await request(app).get('/api/builder/services').set('Cookie', member.cookie);
    const serviceId = owned.body.services.find((service: { name: string }) => service.name === `Service ${suffix}`).id as string;
    expect(await getStore().listPublicBuilderProfiles()).toContainEqual({
      serviceId,
      profile: {
        displayName: `Maker ${suffix}`,
        socialLinks: [{ label: 'Portfolio', url: 'https://example.test/portfolio' }],
      },
    });
    await getStore().requestOwnership(member.id, '2026-06-1', 'PostgreSQL profile visibility fixture');
    const ownershipRequest = (await getStore().listOwnershipRequests())
      .find((item) => item.builderEmail === `member-${suffix}@example.test`);
    expect(ownershipRequest).toBeDefined();
    expect(await getStore().resolveOwnershipRequest(ownershipRequest!.id, true)).toBe(true);
    expect(await getStore().listPublicBuilderProfiles()).toContainEqual({
      serviceId: '2026-06-1',
      profile: {
        displayName: `Maker ${suffix}`,
        socialLinks: [{ label: 'Portfolio', url: 'https://example.test/portfolio' }],
      },
    });
    const serviceRequest = await request(app)
      .post(`/api/builder/institutions/${institutionId}/services`)
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({ serviceId });
    expect(serviceRequest.status).toBe(202);

    const requestList = await request(app)
      .get('/api/institution/dashboard')
      .query({ institutionId }).set('Cookie', admin.cookie);
    expect(requestList.status).toBe(200);
    expect(requestList.body.serviceRequests).toEqual([
      expect.objectContaining({ serviceId, builderId: member.id }),
    ]);

    const approvedService = await request(app)
      .patch(`/api/institution/${institutionId}/service-requests/${requestList.body.serviceRequests[0].id}`)
      .set('Origin', origin).set('Cookie', admin.cookie).send({ approved: true });
    expect(approvedService.status).toBe(200);

    const dashboard = await request(app)
      .get('/api/institution/dashboard')
      .query({ institutionId }).set('Cookie', admin.cookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.members).toEqual([expect.objectContaining({ builderId: member.id })]);
    expect(dashboard.body.services).toEqual([expect.objectContaining({ serviceId, name: `Service ${suffix}` })]);
    expect(JSON.stringify(dashboard.body)).not.toContain(`member-${suffix}@example.test`);

    const pendingServiceName = `Pending link ${suffix}`;
    const secondSubmission = await request(app)
      .post('/api/builder/services')
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({
        name: pendingServiceName,
        tagline: 'A second proposal for pending organization link coverage',
        description: 'This service fixture remains unlinked when its builder leaves the institution.',
        serviceUrl: 'https://example.test/pending-link',
        tags: ['testing'],
        rightsConfirmed: true,
      });
    expect(secondSubmission.status).toBe(202);
    const secondQueue = await request(app)
      .get('/api/admin/submissions').set('X-Admin-Token', 'postgres-integration-admin');
    const secondPending = secondQueue.body.submissions.find(
      (item: { draft: { name: string } }) => item.draft.name === pendingServiceName,
    );
    expect((await request(app)
      .post(`/api/admin/submissions/${secondPending.id}/approve`)
      .set('X-Admin-Token', 'postgres-integration-admin')).status).toBe(200);
    const secondService = (await request(app).get('/api/builder/services').set('Cookie', member.cookie))
      .body.services.find((service: { name: string }) => service.name === pendingServiceName);
    expect((await request(app)
      .post(`/api/builder/institutions/${institutionId}/services`)
      .set('Origin', origin).set('Cookie', member.cookie)
      .send({ serviceId: secondService.id })).status).toBe(202);

    const updatedInstitution = await request(app)
      .patch(`/api/institution/${institutionId}`)
      .set('Origin', origin).set('Cookie', admin.cookie)
      .send({ name: `Updated ${suffix}`, description: 'Updated institution introduction' });
    expect(updatedInstitution.status).toBe(200);
    expect((await request(app).get('/api/institutions')).body.institutions)
      .toContainEqual(expect.objectContaining({ id: institutionId, name: `Updated ${suffix}` }));

    const crossInstitutionAccess = await request(app)
      .get('/api/institution/dashboard')
      .query({ institutionId }).set('Cookie', outsider.cookie);
    expect(crossInstitutionAccess.status).toBe(403);

    const revoked = await request(app)
      .delete(`/api/institution/${institutionId}/members/${member.id}`)
      .set('Origin', origin).set('Cookie', admin.cookie);
    expect(revoked.status).toBe(204);
    expect((await request(app).get('/api/builder/institutions').set('Cookie', member.cookie))
      .body.institutions[0].membershipStatus).toBe('revoked');
    expect((await request(app).get('/api/institution/dashboard').query({ institutionId }).set('Cookie', admin.cookie))
      .body.members).toHaveLength(0);
    expect((await request(app).get('/api/institution/dashboard').query({ institutionId }).set('Cookie', admin.cookie))
      .body.serviceRequests).toHaveLength(0);

    const history = await request(app)
      .get('/api/institution/dashboard').query({ institutionId }).set('Cookie', admin.cookie);
    expect(history.body.history.map((entry: { action: string }) => entry.action)).toEqual(expect.arrayContaining([
      'institution_membership_requested',
      'institution_membership_approved',
      'institution_membership_rejected',
      'institution_service_requested',
      'institution_service_approved',
      'institution_profile_updated',
      'institution_membership_revoked',
      'institution_service_revoked',
    ]));

    const audit = await getAuditPool().query<{ action: string; actor_id: string }>(
      `SELECT action, actor_id FROM gyro_admin_audit
       WHERE target_id LIKE $1 AND action LIKE 'institution_%'`,
      [`%${institutionId}%`],
    );
    expect(audit.rows.some((row) => row.action === 'institution_membership_approved' && row.actor_id === admin.id)).toBe(true);
    expect(audit.rows.some((row) => row.action === 'institution_service_approved' && row.actor_id === admin.id)).toBe(true);
    expect(audit.rows.some((row) => row.action === 'institution_membership_revoked' && row.actor_id === admin.id)).toBe(true);
  });
});

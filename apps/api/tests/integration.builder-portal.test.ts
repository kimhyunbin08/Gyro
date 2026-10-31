import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { digestToken, type BuilderIdentity, type BuilderPortalStore, type BuilderServiceDraft } from '../src/builder-portal.js';
import type { CatalogService } from '../src/catalog.js';

function createStore(
  initialBuilder: BuilderIdentity = {
    id: 'builder-1',
    email: 'maker@example.com',
    status: 'approved',
    programVerified: true,
  },
): BuilderPortalStore {
  const builder = initialBuilder;
  const magic = new Set<string>();
  const sessions = new Map<string, BuilderIdentity>();
  const services: CatalogService[] = [];
  const submissions = new Map<string, { builderId: string; serviceId: string | null; draft: BuilderServiceDraft }>();
  const comments = new Map<string, { id: string; serviceId: string; nickname: string | null; body: string; visible: boolean; reportCount: number; createdAt: string }>();
  let sequence = 0;
  const store: BuilderPortalStore = {
    async initialize() {},
    async issueMagicLink(_email, tokenHash) { magic.add(tokenHash); },
    async revokeMagicLink(tokenHash) { magic.delete(tokenHash); },
    async consumeMagicLink(tokenHash) {
      if (!magic.delete(tokenHash)) return null;
      return builder;
    },
    async createSession(_builderId, tokenHash) { sessions.set(tokenHash, builder); },
    async getBuilderForSession(tokenHash) { return sessions.get(tokenHash) ?? null; },
    async deleteSession(tokenHash) { sessions.delete(tokenHash); },
    async listBuilders() { return [builder]; },
    async setBuilderStatus(_builderId, status, programVerified) {
      builder.status = status;
      builder.programVerified = programVerified;
      return true;
    },
    async listServices() { return services; },
    async listOwnedServices() { return services; },
    async listOwnedServiceIds() { return services.map(({ id }) => id); },
    async ownsService(_builderId, serviceId) { return services.some(({ id }) => id === serviceId); },
    async requestOwnership() {},
    async listOwnershipRequests() { return []; },
    async resolveOwnershipRequest() { return false; },
    async createSubmission(builderId, serviceId, draft) {
      submissions.set(`submission-${++sequence}`, { builderId, serviceId, draft });
    },
    async listSubmissions() {
      return [...submissions.entries()].map(([id, row]) => ({
        id,
        builderEmail: builder.email,
        serviceId: row.serviceId,
        draft: row.draft,
        createdAt: new Date().toISOString(),
      }));
    },
    async approveSubmission(submissionId) {
      const row = submissions.get(submissionId);
      if (!row) return false;
      const id = row.serviceId ?? `builder-${sequence}`;
      const service: CatalogService = {
        ...row.draft,
        id,
        imageUrl: row.draft.serviceUrl,
        audiences: ['student', 'teacher', 'parent', 'other'],
        room: '빌더 제출',
        roomKey: 'builder',
        number: id,
      };
      const existing = services.findIndex((entry) => entry.id === id);
      if (existing < 0) services.push(service);
      else services[existing] = service;
      submissions.delete(submissionId);
      return true;
    },
    async rejectSubmission(submissionId) { return submissions.delete(submissionId); },
    async listComments(serviceId) {
      return [...comments.values()].filter((comment) => comment.serviceId === serviceId && comment.visible);
    },
    async createComment(serviceId, nickname, body) {
      const id = `comment-${++sequence}`;
      comments.set(id, { id, serviceId, nickname, body, visible: true, reportCount: 0, createdAt: new Date().toISOString() });
      return id;
    },
    async reportComment(serviceId, commentId) {
      const comment = comments.get(commentId);
      if (!comment || comment.serviceId !== serviceId || !comment.visible) return false;
      comment.reportCount++;
      return true;
    },
    async listReportedComments() {
      return [...comments.values()]
        .filter(({ reportCount }) => reportCount > 0)
        .map(({ id, serviceId, body, reportCount, visible }) => ({ id, serviceId, body, reportCount, visible }));
    },
    async setCommentVisibility(commentId, visible) {
      const comment = comments.get(commentId);
      if (!comment) return false;
      comment.visible = visible;
      return true;
    },
    async deleteComment(commentId) { return comments.delete(commentId); },
    async getDashboard() {
      return services.map((service) => ({
        serviceId: service.id,
        name: service.name,
        impressions: 0,
        likes: 0,
        dislikes: 0,
        previewClicks: 0,
        ratings: 0,
        averageRating: null,
        comments: [...comments.values()].filter((comment) => comment.serviceId === service.id).length,
      }));
    },
    async recordFunnelEvent() {},
  };
  return store;
}

describe('builder portal and public comments', () => {
  beforeEach(() => {
    vi.stubEnv('WEB_ORIGIN', 'http://localhost:4173');
    vi.stubEnv('BUILDER_ADMIN_TOKEN', 'test-admin-token');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('GYRO_BUILDER_PORTAL_ENABLED', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(['', 'false'])('keeps builder and comment APIs disabled without launch approval (%s)', async (enabled) => {
    vi.stubEnv('GYRO_BUILDER_PORTAL_ENABLED', enabled);
    const store = createStore();
    const listServices = vi.spyOn(store, 'listServices');
    const createComment = vi.spyOn(store, 'createComment');
    const app = createApp({ builderStore: store });
    expect((await request(app).get('/api/builder/me')).status).toBe(503);
    expect((await request(app).get('/api/admin/builders')).status).toBe(503);
    expect((await request(app).get('/api/services/2026-06-1/comments')).status).toBe(503);
    expect((await request(app).post('/api/services/2026-06-1/comments')
      .send({ body: '공개 전에는 게시되면 안 됩니다.' })).status).toBe(503);
    expect((await request(app).post('/api/services/2026-06-1/comments/comment-1/report')).status).toBe(503);
    expect((await request(app).get('/api/services')).status).toBe(200);
    expect(listServices).not.toHaveBeenCalled();
    expect(createComment).not.toHaveBeenCalled();
  });

  it('refuses comment publication without a configured moderator', async () => {
    vi.stubEnv('BUILDER_ADMIN_TOKEN', '');
    const store = createStore();
    const createComment = vi.spyOn(store, 'createComment');
    const response = await request(createApp({ builderStore: store }))
      .post('/api/services/2026-06-1/comments').send({ body: '운영자 설정이 필요합니다.' });
    expect(response.status).toBe(503);
    expect(createComment).not.toHaveBeenCalled();
  });

  it('uses a one-time email link and requires the configured web origin', async () => {
    const store = createStore();
    let link = '';
    const app = createApp({ builderStore: store, sendMagicLink: async (_email, sentLink) => { link = sentLink; } });
    const forbidden = await request(app).post('/api/builder/auth/request').send({ email: 'maker@example.com' });
    expect(forbidden.status).toBe(403);

    const sent = await request(app)
      .post('/api/builder/auth/request')
      .set('Origin', 'http://localhost:4173')
      .send({ email: 'maker@example.com' });
    expect(sent.status).toBe(202);
    expect(new URLSearchParams(new URL(link).hash.slice(1)).get('token')).toBeTruthy();

    const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token')!;
    const verified = await request(app)
      .post('/api/builder/auth/verify')
      .set('Origin', 'http://localhost:4173')
      .send({ token });
    expect(verified.status).toBe(200);
    expect(verified.headers['set-cookie'][0]).toContain('gyro_builder_session=');
    const reused = await request(app)
      .post('/api/builder/auth/verify')
      .set('Origin', 'http://localhost:4173')
      .send({ token });
    expect(reused.status).toBe(401);
  });

  it('keeps new service submissions private until operator approval', async () => {
    const store = createStore();
    const app = createApp({ builderStore: store });
    const cookie = 'gyro_builder_session=known-session';
    await store.createSession('builder-1', digestToken('known-session'));
    const draft: BuilderServiceDraft = {
      name: '회의 정리 도구',
      tagline: '회의 내용을 정리하고 할 일을 나눠요',
      description: '회의 기록을 정돈해 팀이 다음 작업을 이어가도록 돕는 서비스입니다.',
      serviceUrl: 'https://maker.example/',
      tags: ['협업', '생산성'],
    };
    const submitted = await request(app)
      .post('/api/builder/services')
      .set('Origin', 'http://localhost:4173')
      .set('Cookie', cookie)
      .send(draft);
    expect(submitted.status).toBe(202);
    const beforeApproval = await request(app).get('/api/services?shuffle=vibe-venture');
    expect(beforeApproval.body.services.some((service: CatalogService) => service.name === draft.name)).toBe(false);
    const themedBeforeApproval = await request(app).get('/api/services?shuffle=sns');
    expect(themedBeforeApproval.body.services.some((service: CatalogService) => service.name === draft.name)).toBe(false);

    const queued = await request(app).get('/api/admin/submissions').set('X-Admin-Token', 'test-admin-token');
    const id = queued.body.submissions[0].id as string;
    const unauthorized = await request(app).post(`/api/admin/submissions/${id}/approve`);
    expect(unauthorized.status).toBe(401);
    const approved = await request(app).post(`/api/admin/submissions/${id}/approve`).set('X-Admin-Token', 'test-admin-token');
    expect(approved.status).toBe(200);
    const afterApproval = await request(app).get('/api/services?shuffle=vibe-venture');
    expect(afterApproval.body.services.some((service: CatalogService) => service.name === draft.name)).toBe(true);
    const defaultCatalog = await request(app).get('/api/services');
    expect(defaultCatalog.body.services.some((service: CatalogService) => service.name === draft.name)).toBe(true);
    const emerging = await request(app).get('/api/services?tier=emerging');
    expect(emerging.body.services.some((service: CatalogService) => service.name === draft.name)).toBe(false);
  });

  it('requires explicit program participation verification before approving builder write access', async () => {
    const store = createStore({
      id: 'builder-1',
      email: 'maker@example.com',
      status: 'pending',
      programVerified: false,
    });
    const app = createApp({ builderStore: store });
    await store.createSession('builder-1', digestToken('pending-session'));
    const cookie = 'gyro_builder_session=pending-session';
    const draft: BuilderServiceDraft = {
      name: '검증 전 제출',
      tagline: '참가 확인 전에는 제출할 수 없는 서비스입니다',
      description: '운영자의 바이브벤처 프로그램 참여 확인이 끝나기 전에는 서비스를 등록할 수 없습니다.',
      serviceUrl: 'https://maker.example/',
      tags: ['테스트'],
    };

    const blocked = await request(app)
      .post('/api/builder/services')
      .set('Origin', 'http://localhost:4173')
      .set('Cookie', cookie)
      .send(draft);
    expect(blocked.status).toBe(403);

    const missingConfirmation = await request(app)
      .patch('/api/admin/builders/builder-1')
      .set('X-Admin-Token', 'test-admin-token')
      .send({ status: 'approved' });
    expect(missingConfirmation.status).toBe(400);

    const approved = await request(app)
      .patch('/api/admin/builders/builder-1')
      .set('X-Admin-Token', 'test-admin-token')
      .send({ status: 'approved', programVerified: true });
    expect(approved.status).toBe(200);
    const allowed = await request(app)
      .post('/api/builder/services')
      .set('Origin', 'http://localhost:4173')
      .set('Cookie', cookie)
      .send(draft);
    expect(allowed.status).toBe(202);

    const revoked = await request(app)
      .patch('/api/admin/builders/builder-1')
      .set('X-Admin-Token', 'test-admin-token')
      .send({ status: 'suspended', programVerified: false });
    expect(revoked.status).toBe(200);
    const blockedAgain = await request(app)
      .post('/api/builder/services')
      .set('Origin', 'http://localhost:4173')
      .set('Cookie', cookie)
      .send(draft);
    expect(blockedAgain.status).toBe(403);
  });

  it('applies approved edits to existing services in their themed shuffle only', async () => {
    const store = createStore();
    const draft: BuilderServiceDraft = {
      name: 'SNS 새 이름',
      tagline: '커뮤니티를 위한 새로운 한 줄 소개입니다',
      description: '기존 SNS 서비스 설명을 운영자가 검수한 뒤 바꾸는 제안입니다.',
      serviceUrl: 'https://maker.example/',
      tags: ['커뮤니티'],
    };
    await store.createSubmission('builder-1', 'sns-1', draft);
    const submission = (await store.listSubmissions())[0];
    await store.approveSubmission(submission.id);
    const app = createApp({ builderStore: store });
    const themed = await request(app).get('/api/services?shuffle=sns');
    expect(themed.body.services.find((service: CatalogService) => service.id === 'sns-1')?.name).toBe(draft.name);
    const otherTheme = await request(app).get('/api/services?shuffle=dating');
    expect(otherTheme.body.services.some((service: CatalogService) => service.id === 'sns-1')).toBe(false);
    for (const path of ['/api/services', '/api/services?shuffle=vibe-venture', '/api/services?shuffle=unknown']) {
      const defaultCatalog = await request(app).get(path);
      expect(defaultCatalog.body.services.some((service: CatalogService) => service.id === 'sns-1')).toBe(false);
    }
  });

  it('allows the configured web origin to preflight admin PATCH and DELETE requests', async () => {
    const app = createApp({ builderStore: createStore() });
    const response = await request(app)
      .options('/api/admin/comments/comment-1')
      .set('Origin', 'http://localhost:4173')
      .set('Access-Control-Request-Method', 'DELETE')
      .set('Access-Control-Request-Headers', 'content-type,x-admin-token');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4173');
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-methods']).toContain('DELETE');
  });

  it('publishes anonymous comments immediately and supports report, restore, and operator deletion', async () => {
    const app = createApp({ builderStore: createStore() });
    const created = await request(app)
      .post('/api/services/2026-06-1/comments')
      .send({ nickname: '', body: '설명이 명확해서 사용해보고 싶어요.' });
    expect(created.status).toBe(201);
    const commentId = created.body.id as string;
    const visible = await request(app).get('/api/services/2026-06-1/comments');
    expect(visible.body.comments).toHaveLength(1);
    expect(visible.body.comments[0].nickname).toBeNull();

    const reported = await request(app).post(`/api/services/2026-06-1/comments/${commentId}/report`);
    expect(reported.status).toBe(202);
    const hidden = await request(app)
      .patch(`/api/admin/comments/${commentId}`)
      .set('X-Admin-Token', 'test-admin-token')
      .send({ visible: false });
    expect(hidden.status).toBe(200);
    const afterHide = await request(app).get('/api/services/2026-06-1/comments');
    expect(afterHide.body.comments).toHaveLength(0);
    const moderationQueue = await request(app)
      .get('/api/admin/reported-comments')
      .set('X-Admin-Token', 'test-admin-token');
    expect(moderationQueue.body.comments[0].visible).toBe(false);
    const restored = await request(app)
      .patch(`/api/admin/comments/${commentId}`)
      .set('X-Admin-Token', 'test-admin-token')
      .send({ visible: true });
    expect(restored.status).toBe(200);
    const afterRestore = await request(app).get('/api/services/2026-06-1/comments');
    expect(afterRestore.body.comments).toHaveLength(1);
    const deleted = await request(app)
      .delete(`/api/admin/comments/${commentId}`)
      .set('X-Admin-Token', 'test-admin-token');
    expect(deleted.status).toBe(204);
    const afterDelete = await request(app).get('/api/services/2026-06-1/comments');
    expect(afterDelete.body.comments).toHaveLength(0);
  });
});

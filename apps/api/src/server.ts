import express, { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { CatalogService } from './catalog.js';
import { checkServiceHealth, resolveServiceUrl, startCatalogHealthMonitor } from './services/health-check.service.js';
import { allShuffleServices, filterByTier, findServiceById, resolveShuffleCatalog } from './shuffles.js';
import { getServiceImage } from './image-proxy.js';
import { isTaskId } from './catalogs/task.js';
import {
  AssistantConfigurationError,
  AssistantProviderError,
  AssistantBusyError,
  PublicRepositoryError,
  getAssistantRecommendation,
  parseAssistantRequest,
} from './assistant-recommendation.js';
import { copilotConfiguration, isLocalAssistantRequest } from './copilot-provider.js';
import { dedupeCatalog, healthyCatalog } from './services/discovery-catalog.js';
import {
  createMagicToken,
  createPostgresBuilderStore,
  digestToken,
  sendBuilderMagicLink,
  type BuilderIdentity,
  type BuilderPortalStore,
  type BuilderServiceDraft,
} from './builder-portal.js';

type EventName =
  | 'landing_view'
  | 'profile_submit'
  | 'card_like'
  | 'card_dislike'
  | 'card_skip'
  | 'card_undo'
  | 'service_click'
  | 'result_view'
  | 'email_submit'
  | 'service_feedback_submit'
  | 'connection_report';

const RANKING_LIMIT = 20;

const eventSchema = z
  .object({
    name: z.enum([
      'landing_view',
      'profile_submit',
      'card_like',
      'card_dislike',
      'card_skip',
      'card_undo',
      'service_click',
      'result_view',
      'email_submit',
      'service_feedback_submit',
      'connection_report',
    ]),
    sessionId: z.string().min(8).max(100),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  // 결과 화면의 익명 별점+코멘트 피드백은 일반 퍼널 이벤트와 같은 경로(POST /api/events)로
  // 들어오지만, 추후 소유자용 피드백 집계가 가능하도록 metadata 형태를 별도 검증한다.
  .superRefine((data, ctx) => {
    const metadata = data.metadata ?? {};
    if (data.name === 'connection_report') {
      if (typeof metadata.serviceId !== 'string' || metadata.serviceId.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'serviceId가 필요합니다.', path: ['metadata', 'serviceId'] });
      }
      if (metadata.outcome !== 'success' && metadata.outcome !== 'partial' && metadata.outcome !== 'fail') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'outcome 값이 올바르지 않습니다.', path: ['metadata', 'outcome'] });
      }
      const reasons = ['install_blocked', 'auth_issue', 'permission_issue', 'incompatible', 'docs_outdated', 'other'];
      if (metadata.reason !== undefined && !reasons.includes(String(metadata.reason))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'reason 값이 올바르지 않습니다.', path: ['metadata', 'reason'] });
      }
      if (metadata.outcome === 'success' && metadata.reason !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '성공 결과에는 실패 이유를 포함할 수 없습니다.', path: ['metadata', 'reason'] });
      }
      if (metadata.agent !== undefined && (typeof metadata.agent !== 'string' || metadata.agent.length > 80)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'agent는 80자 이하 문자열이어야 합니다.', path: ['metadata', 'agent'] });
      }
      return;
    }
    if (data.name !== 'service_feedback_submit') return;
    if (typeof metadata.serviceId !== 'string' || metadata.serviceId.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'serviceId가 필요합니다.', path: ['metadata', 'serviceId'] });
    }
    const rating = metadata.rating;
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rating은 1~5 사이 정수여야 합니다.', path: ['metadata', 'rating'] });
    }
    const comment = metadata.comment;
    if (comment !== undefined && (typeof comment !== 'string' || comment.length > 300)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'comment는 300자 이하 문자열이어야 합니다.', path: ['metadata', 'comment'] });
    }
  });
const emailSchema = z.object({
  email: z.string().trim().email().max(254),
  updatesOptIn: z.boolean(),
});
const builderEmailSchema = z.object({ email: z.string().trim().email().max(254) });
const magicTokenSchema = z.object({ token: z.string().min(32).max(128) });
const ownershipRequestSchema = z.object({
  serviceId: z.string().min(1).max(120),
  evidence: z.string().url().max(500).refine((value) => new URL(value).protocol === 'https:'),
});
const builderServiceDraftSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(8).max(160),
  description: z.string().trim().min(20).max(2000),
  serviceUrl: z.string().url().max(500).refine((value) => new URL(value).protocol === 'https:'),
  tags: z.array(z.string().trim().min(1).max(30)).min(1).max(12),
});
const publicCommentSchema = z.object({
  nickname: z.string().trim().max(30).optional(),
  body: z.string().trim().min(2).max(2000),
});
const adminStatusSchema = z.object({
  status: z.enum(['approved', 'suspended']),
  programVerified: z.boolean(),
}).refine((value) => value.status !== 'approved' || value.programVerified, {
  message: '바이브벤처 프로그램 참여 확인이 필요합니다.',
});
const adminOwnershipSchema = z.object({ approved: z.boolean() });
const adminCommentSchema = z.object({ visible: z.boolean() });

// 랭킹·퍼널 집계는 셔플을 구분하지 않고 기존 카탈로그와 작업 카탈로그 전체를 대상으로 한다.
// 셔플 간 URL 중복도 동일한 dedupe 규칙으로 걸러낸다.
const dedupedAllShuffles = dedupeCatalog(allShuffleServices());

function allowedOrigin(): string {
  return process.env.WEB_ORIGIN || '*';
}

export type AppOptions = {
  builderStore?: BuilderPortalStore | null;
  sendMagicLink?: (email: string, link: string) => Promise<void>;
};

function requestCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : undefined;
}

function hasExpectedOrigin(req: Request): boolean {
  const configuredOrigin = process.env.WEB_ORIGIN;
  return Boolean(configuredOrigin && configuredOrigin !== '*' && req.get('origin') === configuredOrigin);
}

function adminAuthorized(req: Request): boolean {
  const expected = process.env.BUILDER_ADMIN_TOKEN;
  const provided = req.get('x-admin-token') ?? '';
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function mergeCatalog(base: CatalogService[], submitted: CatalogService[]): CatalogService[] {
  const merged = new Map(base.map((service) => [service.id, service]));
  for (const service of submitted) merged.set(service.id, service);
  return [...merged.values()];
}

function isCatalogService(serviceId: string): boolean {
  return Boolean(findServiceById(serviceId));
}

export function createApp(options: AppOptions = {}) {
  const portalEnabled = process.env.GYRO_BUILDER_PORTAL_ENABLED === 'true';
  const builderStore = portalEnabled ? options.builderStore ?? null : null;
  const sendMagicLink = options.sendMagicLink ?? sendBuilderMagicLink;
  const events: Array<{ name: EventName; sessionId: string; metadata: Record<string, unknown>; createdAt: string }> = [];
  const emailLeads = new Set<string>();
  const assistantRateLimits = new Map<string, { count: number; resetAt: number }>();
  const builderAuthLimits = new Map<string, { count: number; resetAt: number }>();
  const commentLimits = new Map<string, { count: number; resetAt: number }>();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const origin = _req.get('origin');
    const configuredOrigin = allowedOrigin();
    if (configuredOrigin === '*') res.header('Access-Control-Allow-Origin', '*');
    else if (origin === configuredOrigin) res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (configuredOrigin !== '*') res.header('Access-Control-Allow-Credentials', 'true');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use(['/api/builder', '/api/admin', /^\/api\/services\/[^/]+\/comments(?:\/|$)/], (_req, res, next) => {
    if (!portalEnabled) return res.status(503).json({ message: '빌더 포털과 댓글은 공개 준비 중이에요.' });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gyro-api', timestamp: new Date().toISOString() });
  });

  const builderFromRequest = async (req: Request): Promise<BuilderIdentity | null> => {
    if (!builderStore) return null;
    const token = requestCookie(req, 'gyro_builder_session');
    return token ? builderStore.getBuilderForSession(digestToken(token)) : null;
  };
  const originRequired = (req: Request, res: Response): boolean => {
    if (hasExpectedOrigin(req)) return true;
    res.status(403).json({ message: '요청 출처를 확인할 수 없습니다.' });
    return false;
  };
  const builderRequired = async (req: Request, res: Response, approved = true): Promise<BuilderIdentity | null> => {
    if (!builderStore) {
      res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
      return null;
    }
    const builder = await builderFromRequest(req);
    if (!builder) {
      res.status(401).json({ message: '로그인이 필요합니다.' });
      return null;
    }
    if (builder.status === 'suspended' || (approved && (builder.status !== 'approved' || builder.programVerified !== true))) {
      res.status(403).json({ message: '바이브벤처 프로그램 참여와 빌더 계정 승인이 필요합니다.' });
      return null;
    }
    return builder;
  };
  const rateLimited = (map: Map<string, { count: number; resetAt: number }>, key: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    for (const [entryKey, value] of map) if (value.resetAt <= now) map.delete(entryKey);
    const entry = map.get(key);
    if (!entry || entry.resetAt <= now) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count++;
    return entry.count > limit;
  };
  const publishedCatalog = async (): Promise<CatalogService[]> => {
    const userServices = builderStore ? await builderStore.listServices() : [];
    return mergeCatalog(dedupedAllShuffles, userServices);
  };

  app.post('/api/builder/auth/request', async (req, res) => {
    if (!originRequired(req, res)) return;
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const parsed = builderEmailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '올바른 이메일 주소를 입력해 주세요.' });
    const email = parsed.data.email.toLowerCase();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (rateLimited(builderAuthLimits, `ip:${ip}`, 3, 15 * 60 * 1000)
      || rateLimited(builderAuthLimits, `email:${email}`, 1, 5 * 60 * 1000)) {
      return res.status(429).json({ message: '로그인 링크 요청이 많아요. 잠시 후 다시 시도해 주세요.' });
    }
    const webOrigin = process.env.WEB_ORIGIN;
    if (!webOrigin || webOrigin === '*') return res.status(503).json({ message: '빌더 로그인 주소 설정이 필요합니다.' });
    const { token, tokenHash } = createMagicToken();
    try {
      await builderStore.issueMagicLink(email, tokenHash, new Date(Date.now() + 15 * 60 * 1000));
      const link = new URL('/builder', webOrigin);
      link.hash = new URLSearchParams({ token }).toString();
      await sendMagicLink(email, link.toString());
      res.status(202).json({ accepted: true, message: '로그인 링크를 요청한 이메일로 보냈습니다.' });
    } catch (error) {
      await builderStore.revokeMagicLink(tokenHash);
      console.error('Builder magic-link request failed.', error instanceof Error ? error.message : 'unknown error');
      res.status(503).json({ message: '로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.' });
    }
  });

  app.post('/api/builder/auth/verify', async (req, res) => {
    if (!originRequired(req, res)) return;
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const parsed = magicTokenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '로그인 링크가 올바르지 않습니다.' });
    const builder = await builderStore.consumeMagicLink(digestToken(parsed.data.token));
    if (!builder || builder.status === 'suspended') return res.status(401).json({ message: '로그인 링크가 만료되었거나 사용할 수 없습니다.' });
    const sessionToken = randomBytes(32).toString('base64url');
    await builderStore.createSession(builder.id, digestToken(sessionToken), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Lax';
    res.setHeader('Set-Cookie', `gyro_builder_session=${sessionToken}; Path=/api/builder; HttpOnly; SameSite=${sameSite}; Max-Age=604800${secure}`);
    res.json({ builder: { email: builder.email, status: builder.status, programVerified: builder.programVerified === true } });
  });

  app.get('/api/builder/me', async (req, res) => {
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const builder = await builderFromRequest(req);
    if (!builder) return res.status(401).json({ message: '로그인이 필요합니다.' });
    res.json({ builder: { email: builder.email, status: builder.status, programVerified: builder.programVerified === true } });
  });

  app.post('/api/builder/auth/logout', async (req, res) => {
    if (!originRequired(req, res)) return;
    if (builderStore) {
      const token = requestCookie(req, 'gyro_builder_session');
      if (token) await builderStore.deleteSession(digestToken(token));
    }
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Lax';
    res.setHeader('Set-Cookie', `gyro_builder_session=; Path=/api/builder; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure}`);
    res.status(204).end();
  });

  app.get('/api/builder/services', async (req, res) => {
    const builder = await builderRequired(req, res);
    if (!builder || !builderStore) return;
    const ownedIds = await builderStore.listOwnedServiceIds(builder.id);
    const catalog = await publishedCatalog();
    res.json({ services: catalog.filter((service) => ownedIds.includes(service.id)) });
  });

  app.post('/api/builder/services/ownership-requests', async (req, res) => {
    if (!originRequired(req, res)) return;
    const builder = await builderRequired(req, res, false);
    if (!builder || !builderStore) return;
    const parsed = ownershipRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '소유권 확인 요청을 다시 확인해 주세요.' });
    if (!isCatalogService(parsed.data.serviceId)) return res.status(404).json({ message: '카탈로그 서비스를 찾을 수 없습니다.' });
    await builderStore.requestOwnership(builder.id, parsed.data.serviceId, parsed.data.evidence);
    res.status(202).json({ submitted: true, message: '소유권 확인 요청을 접수했어요.' });
  });

  app.post('/api/builder/services', async (req, res) => {
    if (!originRequired(req, res)) return;
    const builder = await builderRequired(req, res);
    if (!builder || !builderStore) return;
    const parsed = builderServiceDraftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '서비스 정보와 공식 HTTPS 링크를 확인해 주세요.' });
    const draft: BuilderServiceDraft = { ...parsed.data };
    await builderStore.createSubmission(builder.id, null, draft);
    res.status(202).json({ submitted: true, message: '서비스 등록을 검수 대기열에 제출했어요.' });
  });

  app.post('/api/builder/services/:id/proposals', async (req, res) => {
    if (!originRequired(req, res)) return;
    const builder = await builderRequired(req, res);
    if (!builder || !builderStore) return;
    const parsed = builderServiceDraftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '서비스 정보와 공식 HTTPS 링크를 확인해 주세요.' });
    if (!await builderStore.ownsService(builder.id, req.params.id)) return res.status(404).json({ message: '수정 권한이 있는 서비스를 찾을 수 없습니다.' });
    await builderStore.createSubmission(builder.id, req.params.id, parsed.data);
    res.status(202).json({ submitted: true, message: '수정 제안을 검수 대기열에 제출했어요.' });
  });

  app.get('/api/builder/dashboard', async (req, res) => {
    const builder = await builderRequired(req, res);
    if (!builder || !builderStore) return;
    const ownedIds = await builderStore.listOwnedServiceIds(builder.id);
    const rows = await builderStore.getDashboard(builder.id);
    const catalog = await publishedCatalog();
    const names = new Map(catalog.map((service) => [service.id, service.name]));
    res.json({ services: rows.filter((row) => ownedIds.includes(row.serviceId)).map((row) => ({ ...row, name: names.get(row.serviceId) ?? row.name })) });
  });

  app.get('/api/admin/builders', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    res.json({ builders: await builderStore.listBuilders() });
  });

  app.patch('/api/admin/builders/:id', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const parsed = adminStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '상태 변경 값이 올바르지 않습니다.' });
    const updated = await builderStore.setBuilderStatus(
      req.params.id,
      parsed.data.status,
      parsed.data.programVerified,
    );
    if (!updated) return res.status(404).json({ message: '빌더를 찾을 수 없습니다.' });
    res.json({ updated: true });
  });

  app.get('/api/admin/ownership-requests', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    res.json({ requests: await builderStore.listOwnershipRequests() });
  });

  app.patch('/api/admin/ownership-requests/:id', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const parsed = adminOwnershipSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '소유권 승인 값이 올바르지 않습니다.' });
    const updated = await builderStore.resolveOwnershipRequest(req.params.id, parsed.data.approved);
    if (!updated) return res.status(404).json({ message: '대기 중인 소유권 요청을 찾을 수 없습니다.' });
    res.json({ updated: true });
  });

  app.get('/api/admin/submissions', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    res.json({ submissions: await builderStore.listSubmissions() });
  });

  app.post('/api/admin/submissions/:id/approve', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const updated = await builderStore.approveSubmission(req.params.id);
    if (!updated) return res.status(404).json({ message: '검수 대기 중인 제출을 찾을 수 없습니다.' });
    res.json({ approved: true });
  });

  app.post('/api/admin/submissions/:id/reject', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const rejected = await builderStore.rejectSubmission(req.params.id);
    if (!rejected) return res.status(404).json({ message: '검수 대기 중인 제출을 찾을 수 없습니다.' });
    res.json({ rejected: true });
  });

  app.get('/api/admin/reported-comments', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    res.json({ comments: await builderStore.listReportedComments() });
  });

  app.patch('/api/admin/comments/:id', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const parsed = adminCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '댓글 공개 상태가 올바르지 않습니다.' });
    const updated = await builderStore.setCommentVisibility(req.params.id, parsed.data.visible);
    if (!updated) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.json({ updated: true });
  });

  app.delete('/api/admin/comments/:id', async (req, res) => {
    if (!adminAuthorized(req)) return res.status(401).json({ message: '운영자 인증이 필요합니다.' });
    if (!builderStore) return res.status(503).json({ message: '빌더 포털 저장소가 아직 설정되지 않았어요.' });
    const deleted = await builderStore.deleteComment(req.params.id);
    if (!deleted) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    res.status(204).end();
  });

  app.get('/api/services/:id/comments', async (req, res) => {
    if (!builderStore) return res.status(503).json({ message: '댓글 저장소가 아직 설정되지 않았어요.' });
    const services = await publishedCatalog();
    if (!services.some((service) => service.id === req.params.id)) return res.status(404).json({ message: '서비스를 찾을 수 없습니다.' });
    res.json({ comments: await builderStore.listComments(req.params.id) });
  });

  app.post('/api/services/:id/comments', async (req, res) => {
    if (!builderStore) return res.status(503).json({ message: '댓글 저장소가 아직 설정되지 않았어요.' });
    if (!process.env.BUILDER_ADMIN_TOKEN) return res.status(503).json({ message: '댓글 운영자 설정이 필요합니다.' });
    const services = await publishedCatalog();
    if (!services.some((service) => service.id === req.params.id)) return res.status(404).json({ message: '서비스를 찾을 수 없습니다.' });
    const parsed = publicCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '댓글은 2~2,000자, 닉네임은 30자 이내로 입력해 주세요.' });
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    if (rateLimited(commentLimits, `post:${clientKey}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ message: '댓글 작성이 잠시 제한됐어요. 나중에 다시 시도해 주세요.' });
    }
    const id = await builderStore.createComment(req.params.id, parsed.data.nickname || null, parsed.data.body);
    res.status(201).json({ id, published: true });
  });

  app.post('/api/services/:id/comments/:commentId/report', async (req, res) => {
    if (!builderStore) return res.status(503).json({ message: '댓글 저장소가 아직 설정되지 않았어요.' });
    const services = await publishedCatalog();
    if (!services.some((service) => service.id === req.params.id)) return res.status(404).json({ message: '서비스를 찾을 수 없습니다.' });
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    if (rateLimited(commentLimits, `report:${clientKey}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ message: '신고 요청이 잠시 제한됐어요. 나중에 다시 시도해 주세요.' });
    }
    const reported = await builderStore.reportComment(req.params.id, req.params.commentId);
    if (!reported) return res.status(404).json({ message: '신고할 댓글을 찾을 수 없습니다.' });
    res.status(202).json({ accepted: true });
  });

  app.get('/api/services', async (req, res) => {
    const isTaskShuffle = req.query.shuffle === 'task';
    const taskFilter = isTaskShuffle && isTaskId(req.query.task) ? req.query.task : undefined;
    const kindFilter = isTaskShuffle && ['product', 'service', 'skill', 'mcp'].includes(String(req.query.kind))
      ? String(req.query.kind)
      : undefined;
    const shuffleServices = resolveShuffleCatalog(req.query.shuffle);
    const builderServices = builderStore ? await builderStore.listServices() : [];
    const includesNewServices = shuffleServices === resolveShuffleCatalog(undefined) || req.query.shuffle === 'task';
    const source = dedupeCatalog(filterByTier(mergeCatalog(
      shuffleServices,
      builderServices.filter((service) => shuffleServices.some(({ id }) => id === service.id)
        || (includesNewServices && !isCatalogService(service.id))),
    ), req.query.tier))
      .filter((service) => !taskFilter || service.tasks?.includes(taskFilter))
      .filter((service) => !kindFilter || (service.kind ?? 'service') === kindFilter);
    const services = await healthyCatalog(source);
    res.json({ services });
  });

  app.post('/api/assistant/chat', async (req, res) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    if (assistantRateLimits.size >= 5000) {
      for (const [key, entry] of assistantRateLimits) {
        if (entry.resetAt <= now) assistantRateLimits.delete(key);
      }
    }
    const requestedClientKey = req.ip || req.socket.remoteAddress || 'unknown';
    const clientKey = !assistantRateLimits.has(requestedClientKey) && assistantRateLimits.size >= 5000
      ? 'overflow'
      : requestedClientKey;
    const limit = assistantRateLimits.get(clientKey);
    if (!limit || limit.resetAt <= now) {
      assistantRateLimits.set(clientKey, { count: 1, resetAt: now + windowMs });
    } else if (limit.count >= 12) {
      res.setHeader('Retry-After', String(Math.ceil((limit.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'AI 추천 요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.' });
    } else {
      limit.count++;
    }
    const input = parseAssistantRequest(req.body);
    if (!input) return res.status(400).json({ message: '대화 요청 형식이 올바르지 않습니다.' });
    try {
      const configuration = copilotConfiguration();
      if (configuration.local && !isLocalAssistantRequest(req.socket.remoteAddress, req.get('host'), req.get('origin'))) {
        return res.status(403).json({ message: '개인 Copilot 추천은 로컬 개발 요청만 허용합니다.' });
      }
      const candidates = await healthyCatalog(await publishedCatalog());
      const { result, repository } = await getAssistantRecommendation(input, candidates);
      const byId = new Map(candidates.map((service) => [service.id, service]));
      const recommendations = result.recommendations.flatMap(({ serviceId, reason }) => {
        const service = byId.get(serviceId);
        return service ? [{ reason, service }] : [];
      });
      res.json({
        reply: result.reply,
        recommendations,
        ...(repository ? { analyzedRepository: { url: repository.url, languages: repository.languages } } : {}),
      });
    } catch (error) {
      if (error instanceof AssistantConfigurationError) {
        return res.status(503).json({ message: 'AI 추천 기능이 아직 설정되지 않았어요.' });
      }
      if (error instanceof AssistantBusyError) {
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ message: error.message });
      }
      if (error instanceof PublicRepositoryError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof AssistantProviderError) {
        return res.status(502).json({ message: error.message });
      }
      console.error('AI recommendation request failed.');
      return res.status(500).json({ message: 'AI 추천 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
    }
  });

  // See image-proxy.ts: fetches (and disk-caches) a real screenshot of the
  // service's own site instead of the lazy, often-placeholder mshots image
  // the catalog entries originally pointed at.
  app.get('/api/service-image/:id', async (req, res) => {
    const service = (await publishedCatalog()).find((candidate) => candidate.id === req.params.id);
    if (!service) return res.status(404).end();
    const health = await checkServiceHealth(service.serviceUrl);
    if (health.status !== 'healthy') return res.status(503).json({ message: '현재 서비스에 접속할 수 없습니다.' });
    const { data, contentType } = await getServiceImage(health.resolvedUrl, service.name);
    res.setHeader('Cache-Control', 'public, no-cache');
    res.setHeader('Content-Type', contentType);
    res.send(data);
  });

  // Aggregate per-service funnel metrics from anonymous in-memory events.
  // "Reacted" (like+dislike+skip) stands in for impressions since there is
  // no separate card-view event; connection reports and doc clicks stay separate.
  // Reason-tag, retry-intent, and dwell-bucket follow-up events carry
  // metadata.stage so they don't double-count the primary card_dislike /
  // preview-click events.
  app.get('/api/services/funnel', async (_req, res) => {
    const stats = new Map<
      string,
      { likes: number; dislikes: number; skips: number; previewClicks: number; docClicks: number; connection: { success: number; partial: number; fail: number; reasons: Record<string, number> }; dislikeReasons: Record<string, number>; retryIntent: { yes: number; no: number; unsure: number }; dwellBuckets: Record<string, number> }
    >();
    const entry = (serviceId: string) => {
      let s = stats.get(serviceId);
      if (!s) {
        s = { likes: 0, dislikes: 0, skips: 0, previewClicks: 0, docClicks: 0, connection: { success: 0, partial: 0, fail: 0, reasons: {} }, dislikeReasons: {}, retryIntent: { yes: 0, no: 0, unsure: 0 }, dwellBuckets: {} };
        stats.set(serviceId, s);
      }
      return s;
    };
    for (const event of events) {
      const serviceId = event.metadata.serviceId;
      if (typeof serviceId !== 'string') continue;
      if (event.name === 'connection_report') {
        const outcome = event.metadata.outcome;
        if (outcome === 'success' || outcome === 'partial' || outcome === 'fail') {
          const s = entry(serviceId);
          s.connection[outcome]++;
          const reason = event.metadata.reason;
          if (typeof reason === 'string') s.connection.reasons[reason] = (s.connection.reasons[reason] || 0) + 1;
        }
      } else if (event.name === 'service_click' && event.metadata.mode === 'guide') {
        entry(serviceId).docClicks++;
      } else if (event.name === 'card_like') entry(serviceId).likes++;
      else if (event.name === 'card_dislike') {
        if (event.metadata.stage === 'reason_tag') {
          const reason = event.metadata.reason;
          if (typeof reason === 'string') {
            const s = entry(serviceId);
            s.dislikeReasons[reason] = (s.dislikeReasons[reason] || 0) + 1;
          }
        } else {
          entry(serviceId).dislikes++;
        }
      } else if (event.name === 'card_skip') entry(serviceId).skips++;
      else if (event.name === 'service_click' && event.metadata.mode === 'embed') {
        if (event.metadata.stage === 'preview_close') {
          const retryIntent = event.metadata.retryIntent;
          if (retryIntent === 'yes' || retryIntent === 'no' || retryIntent === 'unsure') entry(serviceId).retryIntent[retryIntent]++;
          const bucket = event.metadata.dwellBucket;
          if (typeof bucket === 'string') {
            const s = entry(serviceId);
            s.dwellBuckets[bucket] = (s.dwellBuckets[bucket] || 0) + 1;
          }
        } else {
          entry(serviceId).previewClicks++;
        }
      }
    }
    const funnel = (await publishedCatalog())
      .map((service) => {
        const s = stats.get(service.id);
        const impressions = (s?.likes || 0) + (s?.dislikes || 0) + (s?.skips || 0);
        return {
          id: service.id,
          name: service.name,
          impressions,
          likes: s?.likes || 0,
          dislikes: s?.dislikes || 0,
          skips: s?.skips || 0,
          previewClicks: s?.previewClicks || 0,
          docClicks: s?.docClicks || 0,
          connection: {
            ...(s?.connection || { success: 0, partial: 0, fail: 0, reasons: {} }),
            total: (s?.connection.success || 0) + (s?.connection.partial || 0) + (s?.connection.fail || 0),
            successRate: s && s.connection.success + s.connection.partial + s.connection.fail > 0
              ? s.connection.success / (s.connection.success + s.connection.partial + s.connection.fail)
              : null,
            selfReported: true,
          },
          dislikeReasons: s?.dislikeReasons || {},
          retryIntent: s?.retryIntent || { yes: 0, no: 0, unsure: 0 },
          dwellBuckets: s?.dwellBuckets || {},
        };
      })
      .filter((entry) => entry.impressions > 0 || entry.previewClicks > 0 || entry.docClicks > 0 || entry.connection.success + entry.connection.partial + entry.connection.fail > 0)
      .sort((a, b) => b.impressions - a.impressions);
    res.json({ funnel });
  });

  // Aggregates anonymous 'card_like' (right-swipe) events by serviceId so
  // visitors can see which services the community has found most
  // interesting so far. Purely derived from in-memory event counts; no
  // separate persistence layer, consistent with the rest of the event store.
  app.get('/api/services/ranking', async (_req, res) => {
    const likeCounts = new Map<string, number>();
    for (const event of events) {
      if (event.name !== 'card_like') continue;
      const serviceId = event.metadata.serviceId;
      if (typeof serviceId !== 'string') continue;
      likeCounts.set(serviceId, (likeCounts.get(serviceId) || 0) + 1);
    }
    const ranking = (await publishedCatalog())
      .map((service) => ({ id: service.id, name: service.name, tagline: service.tagline, serviceUrl: resolveServiceUrl(service.serviceUrl), likeCount: likeCounts.get(service.id) || 0 }))
      .filter((entry) => entry.likeCount > 0)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, RANKING_LIMIT);
    res.json({ ranking });
  });

  app.post('/api/events', async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '이벤트 형식이 올바르지 않습니다.' });
    const metadata = parsed.data.metadata || {};
    const safeMetadata = parsed.data.name === 'connection_report'
      ? Object.fromEntries(['serviceId', 'outcome', 'reason', 'agent'].filter((key) => metadata[key] !== undefined).map((key) => [key, metadata[key]]))
      : metadata;
    if (builderStore) await builderStore.recordFunnelEvent(parsed.data.name, safeMetadata);
    events.push({ ...parsed.data, metadata: safeMetadata, createdAt: new Date().toISOString() });
    if (events.length > 5000) events.splice(0, events.length - 5000);
    res.status(202).json({ accepted: true });
  });

  app.post('/api/email-leads', (req, res) => {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '올바른 이메일을 입력해 주세요.' });
    const email = parsed.data.email.toLowerCase();
    if (emailLeads.has(email)) return res.status(409).json({ message: '이미 저장된 이메일이에요.' });
    emailLeads.add(email);
    res.status(201).json({ saved: true, updatesOptIn: parsed.data.updatesOptIn });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
      return res.status(413).json({ message: '요청이 너무 커요. 메시지와 저장소 입력을 줄여 주세요.' });
    }
    if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: '요청 JSON 형식이 올바르지 않습니다.' });
    }
    console.error('API request failed.');
    res.status(500).json({ message: '잠시 후 다시 시도해 주세요.' });
  });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const start = async () => {
    const portalEnabled = process.env.GYRO_BUILDER_PORTAL_ENABLED === 'true';
    if (portalEnabled) {
      for (const name of ['DATABASE_URL', 'WEB_ORIGIN', 'BUILDER_ADMIN_TOKEN',
        'AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING', 'AZURE_COMMUNICATION_EMAIL_SENDER']) {
        if (!process.env[name]) throw new Error(`Builder portal requires ${name}.`);
      }
      const origin = new URL(process.env.WEB_ORIGIN!);
      if (origin.origin !== process.env.WEB_ORIGIN
        || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
        throw new Error('Builder portal requires an exact web origin with HTTPS in production.');
      }
    }
    const builderStore = portalEnabled && process.env.DATABASE_URL
      ? createPostgresBuilderStore(process.env.DATABASE_URL)
      : null;
    if (builderStore) await builderStore.initialize();
    else console.warn('Builder portal and comments are disabled: launch approval is required.');
    const port = Number(process.env.PORT || 3001);
    const host = process.env.GYRO_ASSISTANT_PROVIDER === 'copilot-local' ? '127.0.0.1' : '0.0.0.0';
    const server = createApp({ builderStore }).listen(port, host, () => console.log(`Gyro API listening on ${host}:${port}`));
    const stopMonitor = startCatalogHealthMonitor(async () => [
      ...allShuffleServices().map((service) => service.serviceUrl),
      ...(builderStore ? (await builderStore.listServices()).map((service) => service.serviceUrl) : []),
    ]);
    server.on('close', stopMonitor);
    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
      process.once(signal, () => {
        stopMonitor();
        server.close();
      });
    }
  };
  void start().catch((error: unknown) => {
    console.error('Gyro API startup failed.', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}

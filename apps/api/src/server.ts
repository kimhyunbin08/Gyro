import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { catalog as liveCatalog } from './catalog.js';
import { checkServiceHealth } from './services/health-check.service.js';

type Audience = 'student' | 'teacher' | 'parent' | 'other';
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
  | 'service_feedback_submit';

const RANKING_LIMIT = 20;

type Service = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  serviceUrl: string;
  tags: string[];
  audiences: Audience[];
  health: { status: 'healthy'; checkedAt: string };
};

const events: Array<{ name: EventName; sessionId: string; metadata: Record<string, unknown>; createdAt: string }> = [];
const emailLeads = new Set<string>();
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
    ]),
    sessionId: z.string().min(8).max(100),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  // 결과 화면의 익명 별점+코멘트 피드백은 일반 퍼널 이벤트와 같은 경로(POST /api/events)로
  // 들어오지만, 추후 소유자용 피드백 집계가 가능하도록 metadata 형태를 별도 검증한다.
  .superRefine((data, ctx) => {
    if (data.name !== 'service_feedback_submit') return;
    const metadata = data.metadata ?? {};
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

function normalizeServiceUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

// The source catalog occasionally lists the same project across multiple
// exhibit months (resubmitted with no changes), which would otherwise show
// the identical card twice in one swipe session. Keep only the first
// occurrence per unique live URL.
function dedupeCatalog(services: typeof liveCatalog): typeof liveCatalog {
  const seen = new Set<string>();
  return services.filter((service) => {
    const key = normalizeServiceUrl(service.serviceUrl);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const dedupedCatalog = dedupeCatalog(liveCatalog);

function allowedOrigin(): string {
  return process.env.WEB_ORIGIN || '*';
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin());
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gyro-api', timestamp: new Date().toISOString() });
  });

  app.get('/api/services', async (_req, res) => {
    const checked = await Promise.all(
      dedupedCatalog.map(async (service) => ({ service, health: await checkServiceHealth(service.serviceUrl) }))
    );
    // prd.md §9 item 5: only services that pass a recent health check reach the swipe deck.
    const services = checked.filter((c) => c.health.status === 'healthy').map((c) => ({ ...c.service, health: c.health }));
    res.json({ services });
  });

  // prd.md §14.3 / trd.md §10.1 (Phase 2 draft): aggregate per-service
  // funnel drop-off for builders, purely from existing in-memory events —
  // no new event names or schema changes. "Reacted" (like+dislike+skip)
  // stands in for impressions since there is no separate card-view event.
  // Reason-tag and retry-intent follow-up events carry metadata.stage so
  // they don't double-count the primary card_dislike / preview-click events.
  app.get('/api/services/funnel', (_req, res) => {
    const stats = new Map<
      string,
      { likes: number; dislikes: number; skips: number; previewClicks: number; dislikeReasons: Record<string, number>; retryIntent: { yes: number; no: number; unsure: number } }
    >();
    const entry = (serviceId: string) => {
      let s = stats.get(serviceId);
      if (!s) {
        s = { likes: 0, dislikes: 0, skips: 0, previewClicks: 0, dislikeReasons: {}, retryIntent: { yes: 0, no: 0, unsure: 0 } };
        stats.set(serviceId, s);
      }
      return s;
    };
    for (const event of events) {
      const serviceId = event.metadata.serviceId;
      if (typeof serviceId !== 'string') continue;
      if (event.name === 'card_like') entry(serviceId).likes++;
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
        } else {
          entry(serviceId).previewClicks++;
        }
      }
    }
    const funnel = dedupedCatalog
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
          dislikeReasons: s?.dislikeReasons || {},
          retryIntent: s?.retryIntent || { yes: 0, no: 0, unsure: 0 },
        };
      })
      .filter((entry) => entry.impressions > 0 || entry.previewClicks > 0)
      .sort((a, b) => b.impressions - a.impressions);
    res.json({ funnel });
  });

  // Aggregates anonymous 'card_like' (right-swipe) events by serviceId so
  // visitors can see which services the community has found most
  // interesting so far. Purely derived from in-memory event counts; no
  // separate persistence layer, consistent with the rest of the event store.
  app.get('/api/services/ranking', (_req, res) => {
    const likeCounts = new Map<string, number>();
    for (const event of events) {
      if (event.name !== 'card_like') continue;
      const serviceId = event.metadata.serviceId;
      if (typeof serviceId !== 'string') continue;
      likeCounts.set(serviceId, (likeCounts.get(serviceId) || 0) + 1);
    }
    const ranking = dedupedCatalog
      .map((service) => ({ id: service.id, name: service.name, tagline: service.tagline, serviceUrl: service.serviceUrl, likeCount: likeCounts.get(service.id) || 0 }))
      .filter((entry) => entry.likeCount > 0)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, RANKING_LIMIT);
    res.json({ ranking });
  });

  app.post('/api/events', (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: '이벤트 형식이 올바르지 않습니다.' });
    events.push({ ...parsed.data, metadata: parsed.data.metadata || {}, createdAt: new Date().toISOString() });
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
    console.error(err);
    res.status(500).json({ message: '잠시 후 다시 시도해 주세요.' });
  });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, '0.0.0.0', () => console.log(`Gyro API listening on ${port}`));
}

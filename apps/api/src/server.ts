import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { catalog as liveCatalog } from './catalog.js';

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
  | 'email_submit';

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
const eventSchema = z.object({
  name: z.enum(['landing_view', 'profile_submit', 'card_like', 'card_dislike', 'card_skip', 'card_undo', 'service_click', 'result_view', 'email_submit']),
  sessionId: z.string().min(8).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

  app.get('/api/services', (_req, res) => {
    const checkedAt = new Date().toISOString();
    res.json({ services: dedupedCatalog.map((service) => ({ ...service, health: { status: 'healthy', checkedAt } })) });
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

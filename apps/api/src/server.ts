import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

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

const catalog: Omit<Service, 'health'>[] = [
  {
    id: 'vibe-study',
    name: 'Vibe Study',
    tagline: '친구와 함께 만드는 나만의 공부 루틴',
    description: 'AI와 대화하며 오늘 할 일을 정리하고, 친구와 진행 상황을 공유하는 학습 도구예요.',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['학습', '생산성', 'AI'],
    audiences: ['student', 'teacher'],
  },
  {
    id: 'class-canvas',
    name: 'Class Canvas',
    tagline: '수업 아이디어를 한 장으로 펼쳐보기',
    description: '선생님과 학생이 함께 프로젝트를 기획하고 결과를 전시하는 협업 보드예요.',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['학습', '협업', '창작'],
    audiences: ['student', 'teacher'],
  },
  {
    id: 'everyday-lab',
    name: 'Everyday Lab',
    tagline: '생활 속 궁금증을 실험으로 바꾸기',
    description: '주변의 문제를 발견하고 작은 실험과 기록으로 해결 방법을 찾아보는 서비스예요.',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['생활', '창작', '탐구'],
    audiences: ['student', 'parent', 'teacher'],
  },
  {
    id: 'story-maker',
    name: 'Story Maker',
    tagline: '머릿속 이야기를 인터랙티브하게',
    description: '아이디어와 그림을 연결해 나만의 짧은 이야기와 발표 자료를 만들어보세요.',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['창작', '표현', 'AI'],
    audiences: ['student', 'parent'],
  },
  {
    id: 'teacher-kit',
    name: 'Teacher Kit',
    tagline: '수업 준비 시간을 가볍게',
    description: '수업 자료와 활동 아이디어를 모아두고 필요한 순간 꺼내 쓰는 교실 도구예요.',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['교육', '생산성', '협업'],
    audiences: ['teacher'],
  },
  {
    id: 'local-finder',
    name: 'Local Finder',
    tagline: '우리 동네의 새로운 쓰임 찾기',
    description: '동네의 장소와 이야기를 지도로 기록하고, 함께 새로운 활용법을 발견해요.',
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    serviceUrl: 'https://hiyangssam.github.io/vibeshowroom/',
    tags: ['생활', '탐구', '협업'],
    audiences: ['student', 'parent', 'other'],
  },
];

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
    res.json({ services: catalog.map((service) => ({ ...service, health: { status: 'healthy', checkedAt } })) });
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

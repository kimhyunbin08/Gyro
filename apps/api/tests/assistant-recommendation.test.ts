import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { selectAssistantCandidates } from '../src/assistant-recommendation.js';
import { allShuffleServices } from '../src/shuffles.js';
import { AssistantProviderError, generateCopilotReply } from '../src/copilot-provider.js';
import * as healthChecks from '../src/services/health-check.service.js';

vi.mock('../src/copilot-provider.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/copilot-provider.js')>(),
  generateCopilotReply: vi.fn(),
}));

describe('POST /api/assistant/chat', () => {
  const app = createApp();
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    vi.stubEnv('GYRO_ASSISTANT_PROVIDER', 'copilot');
    vi.stubEnv('COPILOT_MODEL', 'test-model');
    vi.stubEnv('COPILOT_GITHUB_TOKEN', 'github_pat_test');
    vi.mocked(generateCopilotReply).mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects malformed chat requests', async () => {
    const response = await request(app).post('/api/assistant/chat').send({ messages: [] });
    expect(response.status).toBe(400);
    const oversizedMessage = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: 'x'.repeat(1501) }],
    });
    expect(oversizedMessage.status).toBe(400);
  });

  it('returns an explicit unavailable response when Copilot is not configured', async () => {
    vi.stubEnv('COPILOT_GITHUB_TOKEN', '');
    const response = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '회의록 정리가 어려워요.' }],
    });
    expect(response.status).toBe(503);
    expect(response.body.message).toContain('설정되지');
  });

  it('analyzes only a public GitHub repository and constrains recommendations to the catalog', async () => {
    const seenUrls = new Set<string>();
    const services = allShuffleServices().filter((service) => {
      const key = service.serviceUrl.trim().toLowerCase().replace(/\/+$/, '');
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });
    const candidate = selectAssistantCandidates(
      services,
      '반복 업무를 줄이고 싶어요.\nReact\nReact 도구\nTypeScript\n# 프로젝트 README\nReact 앱',
    )[0];
    vi.mocked(generateCopilotReply).mockResolvedValue(JSON.stringify({
      reply: '현재 도구와 연결할 수 있는 후보예요.',
      recommendations: [
        { serviceId: candidate.id, reason: '문제와 관련된 자동화 기능이 있어요.' },
        { serviceId: candidate.id, reason: '동일 항목 중복' },
        { serviceId: 'not-in-catalog', reason: '존재하지 않는 서비스' },
      ],
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/languages')) return new Response(JSON.stringify({ TypeScript: 1234 }), { status: 200 });
      if (url.endsWith('/readme')) {
        return new Response(JSON.stringify({
          encoding: 'base64',
          content: Buffer.from('# 프로젝트 README\nReact 앱').toString('base64'),
        }), { status: 200 });
      }
      if (url.endsWith('/repos/sample/project')) {
        return new Response(JSON.stringify({ private: false, description: 'React 도구' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const response = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '반복 업무를 줄이고 싶어요.' }],
      techStack: 'React',
      repoUrl: 'https://github.com/sample/project',
    });
    expect(response.status).toBe(200);
    expect(response.body.reply).toContain('후보');
    expect(response.body.recommendations).toHaveLength(1);
    expect(response.body.recommendations[0].service.id).toBe(candidate.id);
    expect(response.body.analyzedRepository).toEqual({
      url: 'https://github.com/sample/project',
      languages: ['TypeScript'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(generateCopilotReply).toHaveBeenCalledWith(
      expect.stringContaining('프로젝트 README'),
      expect.stringContaining('React'),
    );
  });

  it('accepts prior assistant replies up to the generated 2500-character limit', async () => {
    vi.mocked(generateCopilotReply).mockResolvedValue(JSON.stringify({ reply: '다음 질문이에요.', recommendations: [] }));
    const response = await request(createApp()).post('/api/assistant/chat').send({
      messages: [
        { role: 'user', content: '업무를 도와줘요.' },
        { role: 'assistant', content: '가'.repeat(2500) },
        { role: 'user', content: '다른 후보도 알려줘요.' },
      ],
    });
    expect(response.status).toBe(200);
  });

  it('checks health and final URL deduplication before presenting candidates to the model', async () => {
    vi.spyOn(healthChecks, 'checkServiceHealth').mockImplementation(async (sourceUrl) => ({
      status: sourceUrl === allShuffleServices()[0].serviceUrl ? 'unhealthy' : 'healthy',
      checkedAt: '2026-10-25T00:00:00.000Z', sourceUrl,
      resolvedUrl: 'https://merged.example/', urlChanged: true,
    }));
    vi.mocked(generateCopilotReply).mockResolvedValue(JSON.stringify({ reply: '확인했어요.', recommendations: [] }));
    expect((await request(createApp()).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '도구를 찾아줘요.' }],
    })).status).toBe(200);
    const prompt = vi.mocked(generateCopilotReply).mock.calls[0][0];
    const line = prompt.split('\n').find((item) => item.startsWith('후보 카탈로그 JSON: '))!;
    const candidates = JSON.parse(line.slice('후보 카탈로그 JSON: '.length));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).not.toBe(allShuffleServices()[0].id);
  });

  it.each(['private', 'oversized', 'malformed'])('rejects %s public repository data before sending it to Copilot', async (failure) => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (failure === 'oversized') return new Response('x'.repeat(64 * 1024 + 1));
      if (url.endsWith('/languages')) return new Response('{}');
      if (url.endsWith('/readme')) return new Response(JSON.stringify({ encoding: 'base64', content: 'SGk=' }));
      return new Response(JSON.stringify({
        private: failure === 'private' ? true : 'false', description: 'project',
      }));
    });
    const response = await request(createApp()).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '공개 저장소에 맞는 도구를 찾아줘요.' }],
      repoUrl: 'https://github.com/sample/project',
    });
    expect(response.status).toBe(400);
    expect(generateCopilotReply).not.toHaveBeenCalled();
  });

  it('rejects non-GitHub repository URLs without fetching them', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const response = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '문제를 해결할 도구를 찾아요.' }],
      repoUrl: 'https://example.com/owner/repo',
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces role-specific message limits and preserves CORS on oversized JSON errors', async () => {
    const isolated = createApp();
    for (const [role, size] of [['user', 1501], ['assistant', 2501]] as const) {
      expect((await request(isolated).post('/api/assistant/chat').send({
        messages: [{ role, content: 'a'.repeat(size) }],
      })).status).toBe(400);
    }
    const response = await request(isolated).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '가'.repeat(12000) }],
    });
    expect(response.status).toBe(413);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(generateCopilotReply).not.toHaveBeenCalled();
  });

  it('rejects malformed model output and reports provider failures without leaking credentials', async () => {
    const payload = { messages: [{ role: 'user', content: '일정을 정리해요.' }] };
    vi.mocked(generateCopilotReply).mockResolvedValue('not JSON');
    expect((await request(app).post('/api/assistant/chat').send(payload)).status).toBe(502);
    vi.mocked(generateCopilotReply).mockRejectedValue(new AssistantProviderError('Copilot 요청이 실패했습니다.'));
    const response = await request(app).post('/api/assistant/chat').send(payload);
    expect(response.status).toBe(502);
    expect(response.text).not.toContain('github_pat_test');
  });

  it('blocks external origins in local mode even with spoofed forwarding headers', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GYRO_ASSISTANT_PROVIDER', 'copilot-local');
    const response = await request(app).post('/api/assistant/chat')
      .set('Origin', 'https://example.com')
      .set('x-forwarded-for', '127.0.0.1')
      .send({ messages: [{ role: 'user', content: '도구를 찾아요.' }] });
    expect(response.status).toBe(403);
    expect(generateCopilotReply).not.toHaveBeenCalled();
  });

  it('limits chat requests per client IP', async () => {
    const responses = await Promise.all(Array.from({ length: 13 }, () =>
      request(app)
        .post('/api/assistant/chat')
        .set('x-forwarded-for', '198.51.100.17')
        .send({ messages: [] }),
    ));
    expect(responses.filter((response) => response.status === 400)).toHaveLength(12);
    const limited = responses.find((response) => response.status === 429);
    expect(limited).toBeDefined();
    expect(Number(limited?.headers['retry-after'])).toBeGreaterThan(0);
  });
});

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server.js';
import { selectAssistantCandidates } from '../src/assistant-recommendation.js';
import { allShuffleServices } from '../src/shuffles.js';

describe('POST /api/assistant/chat', () => {
  const app = createApp();
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnvironment.endpoint === undefined) delete process.env.AZURE_OPENAI_ENDPOINT;
    else process.env.AZURE_OPENAI_ENDPOINT = originalEnvironment.endpoint;
    if (originalEnvironment.deployment === undefined) delete process.env.AZURE_OPENAI_DEPLOYMENT;
    else process.env.AZURE_OPENAI_DEPLOYMENT = originalEnvironment.deployment;
    if (originalEnvironment.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
    else process.env.AZURE_OPENAI_API_KEY = originalEnvironment.apiKey;
    if (originalEnvironment.apiVersion === undefined) delete process.env.AZURE_OPENAI_API_VERSION;
    else process.env.AZURE_OPENAI_API_VERSION = originalEnvironment.apiVersion;
  });

  it('rejects malformed chat requests', async () => {
    const response = await request(app).post('/api/assistant/chat').send({ messages: [] });
    expect(response.status).toBe(400);
    const oversizedMessage = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: 'x'.repeat(1501) }],
    });
    expect(oversizedMessage.status).toBe(400);
  });

  it('returns an explicit unavailable response when Azure is not configured', async () => {
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_API_KEY;
    const response = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '회의록 정리가 어려워요.' }],
    });
    expect(response.status).toBe(503);
    expect(response.body.message).toContain('설정되지');
  });

  it('analyzes only a public GitHub repository and constrains recommendations to the catalog', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://gyro-test.openai.azure.com';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gyro-deployment';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
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
    const azurePayload = {
      choices: [{
        message: {
          content: JSON.stringify({
            reply: '현재 도구와 연결할 수 있는 후보예요.',
            recommendations: [
              { serviceId: candidate.id, reason: '문제와 관련된 자동화 기능이 있어요.' },
              { serviceId: 'not-in-catalog', reason: '존재하지 않는 서비스' },
            ],
          }),
        },
      }],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/openai/deployments/')) {
        const requestBody = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        expect(requestBody.messages[0].content).toContain('React');
        expect(requestBody.messages[0].content).toContain('프로젝트 README');
        return new Response(JSON.stringify(azurePayload), { status: 200 });
      }
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const azureRequest = fetchMock.mock.calls.find(([url]) => String(url).includes('/openai/deployments/'));
    expect(azureRequest?.[1]?.headers).toMatchObject({ 'api-key': 'test-key' });
  });

  it('rejects non-GitHub repository URLs without fetching them', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://gyro-test.openai.azure.com';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gyro-deployment';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const response = await request(app).post('/api/assistant/chat').send({
      messages: [{ role: 'user', content: '문제를 해결할 도구를 찾아요.' }],
      repoUrl: 'https://example.com/owner/repo',
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
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

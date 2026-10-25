// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

const mcpService = {
  id: 'task-test-mcp',
  name: '테스트 MCP',
  tagline: '반복 보고서 작업을 도와요',
  description: '',
  imageUrl: '',
  serviceUrl: 'https://example.com/mcp',
  health: { status: 'healthy', checkedAt: '2026-10-18T00:00:00.000Z' },
  tags: ['반복 보고서'],
  audiences: ['student'],
  kind: 'mcp',
  tasks: ['report-automation'],
  connection: {
    agents: [],
    transport: 'stdio',
    runtime: 'local',
    auth: 'unknown',
    permissions: ['읽기 권한'],
    installSteps: ['공식 문서를 확인하세요.'],
    exampleUsage: '<img src=x onerror=alert(1)>',
    docsUrl: 'https://example.com/docs',
  },
  verification: { level: 'link', sources: ['https://example.com/docs'] },
};

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

describe('web unit: task discovery and connection guide', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('opens a task-filtered swipe deck and renders the guide without embedding an iframe', async () => {
    const events: Array<{ name: string; metadata: Record<string, unknown> }> = [];
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
      if (input.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (input.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: [mcpService] })));
      if (input.includes('/api/events') && init?.body) events.push(JSON.parse(String(init.body)));
      return Promise.resolve(new Response('{}'));
    }));

    await loadAppModule();
    document.getElementById('task-entry-button')!.click();
    expect(document.getElementById('task-discovery')!.classList.contains('hidden')).toBe(false);
    expect(document.querySelectorAll('[data-task]')).toHaveLength(12);
    document.querySelector<HTMLButtonElement>('[data-task="report-automation"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(false);
    const requestUrl = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('shuffle=task'))?.[0];
    expect(String(requestUrl)).toContain('shuffle=task');
    expect(String(requestUrl)).toContain('task=report-automation');
    expect(document.querySelector('[data-guide]')?.textContent).toBe('연결 가이드');
    expect(document.querySelector('[data-preview]')).toBeNull();
    expect(document.querySelector('.service-card .kind-badge')?.textContent).toBe('MCP');
    expect(document.querySelector('.service-card .verification-badge')?.textContent).toContain('2026-10-18');

    document.querySelector<HTMLButtonElement>('[data-guide]')!.click();
    const overlay = document.getElementById('guide-overlay')!;
    expect(overlay.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('guide-content')!.textContent).toContain('확인 안 됨');
    expect(document.getElementById('guide-content')!.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(document.querySelector('#guide-content img')).toBeNull();
    expect(document.getElementById('preview-overlay')!.classList.contains('hidden')).toBe(true);

    document.querySelector<HTMLButtonElement>('[data-outcome="fail"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-reason="auth_issue"]')!.click();
    document.querySelector<HTMLButtonElement>('.guide-report-submit')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(events.some((event) => event.name === 'connection_report'
      && event.metadata.serviceId === mcpService.id
      && event.metadata.outcome === 'fail'
      && event.metadata.reason === 'auth_issue')).toBe(true);

    document.getElementById('like-button')!.click();
    await new Promise((resolve) => setTimeout(resolve, 280));
    expect(document.getElementById('results')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('result-list')!.textContent).toContain('반복 보고서 자동화');
    document.querySelector<HTMLButtonElement>('[data-guide-result]')!.click();
    expect(overlay.classList.contains('hidden')).toBe(false);
  });

  it('keeps failed reports available for retry, clears stale failure reasons and ignores old submissions after reopening', async () => {
    let fail = true;
    let resolveReport: ((response: Response) => void) | undefined;
    const reports: Array<{ metadata: Record<string, unknown> }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' }));
      if (input.includes('/api/services')) return new Response(JSON.stringify({ services: [mcpService] }));
      if (input.includes('/api/events') && JSON.parse(String(init?.body)).name === 'connection_report') {
        reports.push(JSON.parse(String(init?.body)));
        if (fail) return new Response('{}', { status: 503 });
        return new Promise<Response>((resolve) => { resolveReport = resolve; });
      }
      return new Response('{}');
    }));
    await loadAppModule();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>('.home-product-title')!.click();
    const overlay = document.getElementById('guide-overlay')!;
    const submit = document.querySelector<HTMLButtonElement>('.guide-report-submit')!;
    expect(submit.disabled).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-outcome="partial"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-reason="auth_issue"]')!.click();
    submit.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reports[0].metadata).toMatchObject({ outcome: 'partial', reason: 'auth_issue' });
    expect(overlay.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('guide-report')!.textContent).toContain('전송에 실패');
    fail = false;
    document.querySelector<HTMLButtonElement>('[data-outcome="success"]')!.click();
    submit.click();
    document.querySelector<HTMLButtonElement>('[data-outcome="fail"]')!.click();
    submit.click();
    expect(reports).toHaveLength(2);
    expect(reports[1].metadata).toMatchObject({ outcome: 'success' });
    expect(reports[1].metadata.reason).toBeUndefined();
    document.getElementById('guide-close')!.click();
    document.querySelector<HTMLButtonElement>('.home-product-title')!.click();
    resolveReport!(new Response('{}'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(overlay.classList.contains('hidden')).toBe(false);
  });

  it('does not let an old task response replace a newer screen', async () => {
    let resolveTask: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' }));
      if (input.includes('shuffle=task')) return new Promise<Response>((resolve) => { resolveTask = resolve; });
      if (input.includes('/api/services')) return new Response(JSON.stringify({ services: [mcpService] }));
      return new Response('{}');
    }));
    await loadAppModule();
    document.getElementById('task-entry-button')!.click();
    document.querySelector<HTMLButtonElement>('[data-task="report-automation"]')!.click();
    document.getElementById('start-button')!.click();
    resolveTask!(new Response(JSON.stringify({ services: [mcpService] })));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.getElementById('profile')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(true);
  });

  it('keeps users on the task picker when no healthy task items are available', async () => {
    vi.stubGlobal('fetch', vi.fn((input: string) => {
      if (input.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (input.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: [] })));
      return Promise.resolve(new Response('{}'));
    }));

    await loadAppModule();
    document.getElementById('task-entry-button')!.click();
    document.querySelector<HTMLButtonElement>('[data-task="report-automation"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('task-discovery')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('task-status')!.textContent).toContain('연결할 수 있는 항목이 없어요');
    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(true);
  });
});

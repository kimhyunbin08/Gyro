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

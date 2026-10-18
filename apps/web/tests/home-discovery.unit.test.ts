// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');
const bodyMarkup = indexHtml.match(/<body>([\s\S]*)<\/body>/)![1];
const sampleServices = [
  { id: 'design-tool', name: 'Canvas Studio', tagline: '디자인과 협업을 한곳에서', description: '', imageUrl: '', serviceUrl: 'https://example.com/canvas', tags: ['디자인', '협업'], audiences: ['student'], kind: 'product' },
  { id: 'note-service', name: 'Note Garden', tagline: '생각을 정리하는 서비스', description: '', imageUrl: '', serviceUrl: 'https://example.com/notes', tags: ['기록'], audiences: ['teacher'] },
  { id: 'calendar-mcp', name: 'Calendar MCP', tagline: '회의 일정을 연결해요', description: '', imageUrl: '', serviceUrl: 'https://example.com/calendar', tags: ['일정'], audiences: ['other'], kind: 'mcp' },
];

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('web unit: home discovery and appearance settings', () => {
  beforeEach(() => {
    mountApp();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('loads searchable service cards immediately and filters by query and kind', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: sampleServices })));
      return Promise.resolve(new Response('{}'));
    }));
    await loadAppModule();
    await flush();

    expect(document.querySelectorAll('#home-service-list .home-product-card')).toHaveLength(3);
    const search = document.getElementById('service-search') as HTMLInputElement;
    search.value = '회의';
    search.dispatchEvent(new Event('input'));
    expect(document.querySelectorAll('#home-service-list .home-product-card')).toHaveLength(1);
    expect(document.getElementById('home-service-list')!.textContent).toContain('Calendar MCP');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('[data-home-kind="product"]')!.click();
    expect(document.querySelectorAll('#home-service-list .home-product-card')).toHaveLength(1);
    expect(document.getElementById('home-service-list')!.textContent).toContain('Canvas Studio');

    document.querySelector<HTMLButtonElement>('[data-home-kind="mcp"]')!.click();
    document.querySelector<HTMLButtonElement>('.home-product-preview')!.click();
    expect(document.getElementById('guide-overlay')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('preview-overlay')!.classList.contains('hidden')).toBe(true);
  });

  it('switches and saves one of the three configured themes', async () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: sampleServices })));
      return Promise.resolve(new Response('{}'));
    }));
    await loadAppModule();

    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect(document.querySelector('[data-app-theme="midnight"]')!.getAttribute('aria-pressed')).toBe('true');
    (document.getElementById('theme-settings-button') as HTMLButtonElement).click();
    expect(document.getElementById('theme-settings')!.classList.contains('hidden')).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-app-theme="midnight"]')!.click();

    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect(document.querySelector('[data-app-theme="midnight"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(storage.setItem).toHaveBeenCalledWith('gyro.appearance-theme', 'midnight');
    await flush();
  });

  it('keeps the product navigation and appearance settings available across screens', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: sampleServices })));
      return Promise.resolve(new Response('{}'));
    }));
    await loadAppModule();

    expect(indexHtml).toContain('<title>Gyro — 내가 필요한 서비스 찾기</title>');
    expect(indexHtml).toContain('<html lang="ko" data-theme="midnight">');
    expect(indexHtml).toContain('family=Noto+Sans+KR');
    expect(document.getElementById('brand-home')!.textContent).toContain('내가 필요한 서비스 찾기');
    expect([...document.querySelectorAll('[data-primary-nav]')].map(button => button.textContent?.trim())).toEqual([
      '홈',
      '주제별 탐색',
      '작업으로 찾기',
      '인기 서비스',
    ]);

    (document.getElementById('task-entry-button') as HTMLButtonElement).click();
    expect(document.getElementById('task-discovery')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('task-entry-button')!.getAttribute('aria-current')).toBe('page');
    expect(document.getElementById('theme-settings-button')).not.toBeNull();

    (document.getElementById('discover-nav') as HTMLButtonElement).click();
    expect(document.getElementById('landing')!.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('service-search'));
    await flush();
  });
});

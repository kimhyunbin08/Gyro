// @vitest-environment jsdom
// Regression coverage for the "발견 시작하기" race condition: clicking the
// start button before the async /api/services fetch resolved left
// `services` empty and stranded the cards screen at "0 / 0" forever.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

const sampleService = {
  id: 'svc-1',
  name: '테스트 서비스',
  tagline: '테스트용 서비스입니다',
  description: '설명',
  imageUrl: 'https://example.com/a.png',
  serviceUrl: 'https://example.com',
  tags: ['학습'],
  audiences: ['student'],
};

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

/** Imports the real app module fresh for each test (it runs top-level side effects on import). */
async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

describe('web unit: catalog load race guard', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
  });

  it('disables the start button while the catalog is loading, then enables it on success', async () => {
    let resolveServices: (value: Response) => void;
    const servicesPromise = new Promise<Response>((resolve) => { resolveServices = resolve; });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return servicesPromise;
      return Promise.resolve(new Response('{}'));
    }));

    await loadAppModule();
    const startButton = document.getElementById('start-button') as HTMLButtonElement;

    expect(startButton.disabled).toBe(true);
    expect(startButton.textContent).toBe('불러오는 중...');

    // Clicking while disabled must not navigate away from the landing screen.
    startButton.click();
    expect(document.getElementById('landing')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('profile')!.classList.contains('hidden')).toBe(true);

    resolveServices!(new Response(JSON.stringify({ services: [sampleService] })));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(startButton.disabled).toBe(false);
    expect(startButton.textContent).toContain('발견 시작하기');
  });

  it('keeps the start button enabled-but-inert if the catalog fetch fails, instead of stalling cards at 0 / 0', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return Promise.reject(new Error('network down'));
      return Promise.resolve(new Response('{}'));
    }));

    await loadAppModule();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const startButton = document.getElementById('start-button') as HTMLButtonElement;
    expect(startButton.disabled).toBe(false);
    expect(startButton.textContent).toBe('서비스를 불러오지 못했어요');

    // Clicking must be a no-op (guarded by `services.length === 0`), never
    // advancing to the cards screen with an empty catalog.
    startButton.click();
    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('progress')!.textContent).toBe('0 / 0');
  });
});

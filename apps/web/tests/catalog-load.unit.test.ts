// @vitest-environment jsdom
// The landing and questionnaire stay usable while the service catalog is
// checked in the background; the final action remains guarded until cards exist.
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

describe('web unit: background catalog loading', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
  });

  it('opens the questionnaire immediately, then enables card discovery after the catalog arrives', async () => {
    let resolveServices: (value: Response) => void;
    const servicesPromise = new Promise<Response>((resolve) => { resolveServices = resolve; });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return servicesPromise;
      return Promise.resolve(new Response('{}'));
    }));

    await loadAppModule();
    const startButton = document.getElementById('start-button') as HTMLButtonElement;

    expect(startButton.disabled).toBe(false);
    startButton.click();
    expect(document.getElementById('landing')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('profile')!.classList.contains('hidden')).toBe(false);
    expect((document.getElementById('profile-next') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('profile-status')!.textContent).toContain('확인하고 있어요');

    resolveServices!(new Response(JSON.stringify({ services: [sampleService] })));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.querySelector<HTMLButtonElement>('[data-audience="student"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-interest="학습"]')!.click();
    expect((document.getElementById('profile-next') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('profile-status')!.textContent).toBe('');
  });

  it('shows an explicit error and never advances to an empty card deck when loading fails', async () => {
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
    startButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('profile-status')!.textContent).toContain('불러오지 못했어요');
    document.querySelector<HTMLButtonElement>('[data-audience="student"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-interest="학습"]')!.click();
    (document.getElementById('profile-next') as HTMLButtonElement).click();
    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('progress')!.textContent).toBe('0 / 0');
  });
});

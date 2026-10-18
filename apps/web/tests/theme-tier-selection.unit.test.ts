// @vitest-environment jsdom
// Regression coverage for the 테마 → 주류/비주류 선택 → 프로필 flow
// (prd.md §9-4 #7 / trd.md): picking a theme shows the mainstream/emerging
// tier screen immediately while the client warms a single full catalog per
// theme. The selected tier is filtered locally, avoiding another round-trip.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

const defaultServices = [
  { id: 'vv-1', name: '바이브 벤처 서비스', tagline: '', description: '', imageUrl: '', serviceUrl: 'https://example.com/vv', tags: [], audiences: ['student'] },
];
const snsMainstream = [
  { id: 'sns-main-1', name: 'SNS 주류 서비스', tagline: '', description: '', imageUrl: '', serviceUrl: 'https://example.com/sns-main', tags: ['소통'], audiences: ['student'], tier: 'mainstream' },
];
const snsEmerging = [
  { id: 'sns-emg-1', name: 'SNS 신생 서비스', tagline: '', description: '', imageUrl: '', serviceUrl: 'https://example.com/sns-emg', tags: ['소통'], audiences: ['student'], tier: 'emerging' },
];
const snsAll = [...snsMainstream, ...snsEmerging];

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

const requestedUrls: string[] = [];
function stubServiceFetch() {
  requestedUrls.length = 0;
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    requestedUrls.push(url);
    if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
    if (url.includes('shuffle=sns') && url.includes('tier=mainstream')) return Promise.resolve(new Response(JSON.stringify({ services: snsMainstream })));
    if (url.includes('shuffle=sns') && url.includes('tier=emerging')) return Promise.resolve(new Response(JSON.stringify({ services: snsEmerging })));
    if (url.includes('shuffle=sns')) return Promise.resolve(new Response(JSON.stringify({ services: snsAll })));
    if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: defaultServices })));
    return Promise.resolve(new Response('{}'));
  }));
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function isHidden(id: string) {
  return document.getElementById(id)!.classList.contains('hidden');
}

describe('web unit: theme tier selection', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
  });

  it('shows the tier screen immediately and warms only the selected theme in the background', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('theme-entry-button') as HTMLButtonElement).click();
    expect(isHidden('theme')).toBe(false);
    document.querySelector<HTMLButtonElement>('[data-theme="sns"]')!.click();

    expect(isHidden('tier')).toBe(false);
    expect(isHidden('theme')).toBe(true);
    expect(requestedUrls.some((u) => u.includes('shuffle=sns'))).toBe(true);
    expect(requestedUrls.filter((u) => u.includes('shuffle=sns'))).toHaveLength(1);
  });

  it('uses the warmed catalog and filters mainstream services when 주류 is chosen', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('theme-entry-button') as HTMLButtonElement).click();
    document.querySelector<HTMLButtonElement>('[data-theme="sns"]')!.click();
    document.querySelectorAll<HTMLButtonElement>('#tier-choices button')[0].click();
    await flush();

    expect(requestedUrls.some((u) => u.includes('shuffle=sns') && !u.includes('tier='))).toBe(true);
    expect(requestedUrls.some((u) => u.includes('shuffle=sns') && u.includes('tier='))).toBe(false);
    expect(isHidden('profile')).toBe(false);
    expect(document.getElementById('interest-choices')!.textContent).toContain('소통');
    expect(document.getElementById('profile-status')!.textContent).toBe('');
  });

  it('opens the profile immediately while a cold catalog loads and enables discovery when ready', async () => {
    let resolveSns!: (response: Response) => void;
    const snsPromise = new Promise<Response>((resolve) => { resolveSns = resolve; });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      requestedUrls.push(url);
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('shuffle=sns')) return snsPromise;
      if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: defaultServices })));
      return Promise.resolve(new Response('{}'));
    }));
    await loadAppModule();
    await flush();

    (document.getElementById('theme-entry-button') as HTMLButtonElement).click();
    document.querySelector<HTMLButtonElement>('[data-theme="sns"]')!.click();
    document.querySelectorAll<HTMLButtonElement>('#tier-choices button')[0].click();
    expect(isHidden('profile')).toBe(false);
    expect((document.getElementById('profile-next') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('profile-status')!.textContent).toContain('확인하고 있어요');

    document.querySelector<HTMLButtonElement>('[data-audience="student"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-interest="소통"]')!.click();
    resolveSns(new Response(JSON.stringify({ services: snsMainstream })));
    await flush();

    expect((document.getElementById('profile-next') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('profile-status')!.textContent).toBe('');
  });

  it('shows both tiers when 둘 다(추천) is chosen', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('theme-entry-button') as HTMLButtonElement).click();
    document.querySelector<HTMLButtonElement>('[data-theme="sns"]')!.click();
    document.querySelectorAll<HTMLButtonElement>('#tier-choices button')[2].click();
    await flush();

    expect(isHidden('profile')).toBe(false);
    expect(document.getElementById('profile-status')!.textContent).toBe('');
  });

  it('returns to the theme screen from the tier screen via "테마 다시 고르기"', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('theme-entry-button') as HTMLButtonElement).click();
    document.querySelector<HTMLButtonElement>('[data-theme="sns"]')!.click();
    (document.getElementById('tier-back') as HTMLButtonElement).click();

    expect(isHidden('theme')).toBe(false);
    expect(isHidden('tier')).toBe(true);
  });
});

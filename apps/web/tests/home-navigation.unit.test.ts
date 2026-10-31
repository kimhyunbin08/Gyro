// @vitest-environment jsdom
// The shared header returns to platform home, not the marketing landing.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

const sampleServices = [
  { id: 'svc-1', name: '테스트 서비스 1', tagline: '', description: '', imageUrl: '', serviceUrl: 'https://example.com/1', tags: ['학습'], audiences: ['student'] },
  { id: 'svc-2', name: '테스트 서비스 2', tagline: '', description: '', imageUrl: '', serviceUrl: 'https://example.com/2', tags: ['학습'], audiences: ['student'] },
];

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

function stubServiceFetch() {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
    if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services: sampleServices })));
    return Promise.resolve(new Response('{}'));
  }));
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Swipe decisions fly the card out over a 260ms animation before the
 *  underlying state actually updates (see flyOutCard's setTimeout). */
async function waitForFlyOut() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function isHidden(id: string) {
  return document.getElementById(id)!.classList.contains('hidden');
}

describe('web unit: home navigation', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('returns to platform home and resets round state via the single shared logo', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('start-button') as HTMLButtonElement).click();
    await flush();
    document.querySelector<HTMLButtonElement>('#audience-choices button')!.click();
    document.querySelector<HTMLButtonElement>('#interest-choices button')!.click();
    (document.getElementById('profile-next') as HTMLButtonElement).click();

    expect(isHidden('cards')).toBe(false);
    expect(document.getElementById('progress')!.textContent).not.toBe('0 / 0');

    // Swipe one card away so there is in-progress round state to reset.
    (document.getElementById('like-button') as HTMLButtonElement).click();
    await waitForFlyOut();

    const logo = document.getElementById('brand-home');
    expect(logo).not.toBeNull();
    logo!.click();

    expect(isHidden('home')).toBe(false);
    expect(isHidden('landing')).toBe(true);
    expect(isHidden('cards')).toBe(true);

    // Re-entering the cards screen must start the round over, confirming
    // state (index/batch bounds) was actually reset, not just hidden.
    (document.getElementById('start-button') as HTMLButtonElement).click();
    await flush();
    document.querySelector<HTMLButtonElement>('#audience-choices button')!.click();
    document.querySelector<HTMLButtonElement>('#interest-choices button')!.click();
    (document.getElementById('profile-next') as HTMLButtonElement).click();
    expect(document.getElementById('progress')!.textContent).toBe('1 / 2');
  });

  it('returns to platform home from results via the shared home tab', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('start-button') as HTMLButtonElement).click();
    await flush();
    document.querySelector<HTMLButtonElement>('#audience-choices button')!.click();
    document.querySelector<HTMLButtonElement>('#interest-choices button')!.click();
    (document.getElementById('profile-next') as HTMLButtonElement).click();

    (document.getElementById('like-button') as HTMLButtonElement).click();
    await waitForFlyOut();
    (document.getElementById('like-button') as HTMLButtonElement).click();
    await waitForFlyOut();
    expect(isHidden('results')).toBe(false);

    const homeButton = document.getElementById('discover-nav');
    expect(homeButton).not.toBeNull();
    homeButton!.click();

    expect(isHidden('home')).toBe(false);
    expect(isHidden('results')).toBe(true);
  });

  it('does not navigate home automatically when a round finishes with no more cards', async () => {
    stubServiceFetch();
    await loadAppModule();
    await flush();

    (document.getElementById('start-button') as HTMLButtonElement).click();
    await flush();
    document.querySelector<HTMLButtonElement>('#audience-choices button')!.click();
    document.querySelector<HTMLButtonElement>('#interest-choices button')!.click();
    (document.getElementById('profile-next') as HTMLButtonElement).click();

    (document.getElementById('like-button') as HTMLButtonElement).click();
    await waitForFlyOut();
    (document.getElementById('like-button') as HTMLButtonElement).click();
    await waitForFlyOut();

    // The whole (two-service) catalog is exhausted, but landing a round on
    // "results" must stay a manual choice — no auto-redirect to landing.
    expect(isHidden('results')).toBe(false);
    expect(isHidden('landing')).toBe(true);
  });
});

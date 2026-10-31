// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const markup = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];
const services = Array.from({ length: 3 }, (_, index) => ({
  id: `platform-${index}`, name: `도구 ${index}`, tagline: '반복 업무를 도와요', description: '내가 만든 서비스의 자세한 설명입니다.',
  imageUrl: '', serviceUrl: `https://example.com/${index}`, tags: ['학습'], audiences: ['student'],
}));
const $ = (id: string) => document.getElementById(id)!;
const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();
const visible = (id: string) => !$(id).classList.contains('hidden');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
let fetchMock: Mock<(url: string) => Promise<Response>>;
let removeWindowListeners: () => void;

async function mount(hash = '') {
  document.body.innerHTML = markup;
  window.history.replaceState(null, '', `/${hash}`);
  await import('../src/app.ts');
  await tick();
}

async function startCards() {
  $('catalog-nav').click();
  $('start-button').click();
  await tick();
  click('[data-audience="student"]');
  click('[data-interest="학습"]');
  $('profile-next').click();
}

async function likeCard() {
  vi.useFakeTimers();
  $('like-button').click();
  await vi.advanceTimersByTimeAsync(260);
  vi.useRealTimers();
}

describe('landing and shared platform', () => {
  beforeEach(() => {
    vi.resetModules();
    const windowListeners = vi.spyOn(window, 'addEventListener');
    removeWindowListeners = () => {
      for (const [type, listener] of windowListeners.mock.calls) window.removeEventListener(type, listener);
      windowListeners.mockRestore();
    };
    storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'https://api.example' }));
      if (url.includes('/api/builder/me')) return new Response(JSON.stringify({ message: '빌더 인증이 필요해요.' }), { status: 401 });
      if (url.includes('/api/builder/auth/verify')) return new Response(JSON.stringify({ builder: { status: 'pending', programVerified: false } }));
      if (url.includes('/api/services/funnel')) return new Response(JSON.stringify({ funnel: [] }));
      if (url.includes('/api/services')) return new Response(JSON.stringify({ services }));
      return new Response('{}');
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    removeWindowListeners();
  });

  it('starts on a light marketing landing without platform controls or duplicate branding', async () => {
    await mount();
    expect(visible('landing')).toBe(true);
    expect(visible('platform-nav')).toBe(false);
    expect(visible('home')).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('paper');
    expect(document.querySelector('#landing #assistant-form')).toBeNull();
    expect(document.querySelectorAll('.brand-lockup')).toHaveLength(1);
    expect(document.querySelectorAll('.home-logo')).toHaveLength(0);
    expect(document.querySelector('#preview-overlay #guide-overlay')).toBeNull();
  });

  it('switches the landing story and ThemeAI theme without granting builder access or persisting a role', async () => {
    await mount();
    click('[data-landing-audience="builder"]');
    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect($('landing-title').textContent).toContain('당신이 만든 가능성');
    expect($('landing-step-one-copy').textContent).toContain('운영자 검수');
    expect(document.querySelector('[data-landing-audience="builder"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(visible('builder-approved-tools')).toBe(false);
    click('[data-landing-audience="user"]');
    expect(document.documentElement.dataset.theme).toBe('paper');
    expect($('landing-title').textContent).toContain('필요했던 서비스');
  });

  it.each(['user', 'builder'])('enters the same four-tab workspace from the %s landing without login', async audience => {
    await mount();
    click(`[data-landing-audience="${audience}"]`);
    click('[data-enter-service]');
    expect(visible('home')).toBe(true);
    expect(visible('landing')).toBe(false);
    expect(visible('landing-audience')).toBe(false);
    expect(visible('platform-nav')).toBe(true);
    expect(location.hash).toBe('#home');
    expect([...document.querySelectorAll('[data-primary-nav]')].map(button => button.textContent?.trim())).toEqual(['홈', '내 피드', '발견', '설정']);
    expect(document.documentElement.dataset.theme).toBe(audience === 'user' ? 'paper' : 'midnight');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/verify'))).toBe(false);
  });

  it('isolates saved platform appearance from both landing themes and restores it on re-entry', async () => {
    let saved: string | null = 'clay';
    storage.getItem.mockImplementation(() => saved);
    storage.setItem.mockImplementation((_key: string, value: string) => { saved = value; });
    await mount();
    expect(document.documentElement.dataset.theme).toBe('paper');
    click('[data-enter-service]');
    expect(document.documentElement.dataset.theme).toBe('clay');
    $('theme-settings-button').click();
    click('[data-app-theme="midnight"]');
    expect(storage.setItem).toHaveBeenCalledWith('gyro.appearance-theme', 'midnight');
    $('back-to-landing').click();
    expect(document.documentElement.dataset.theme).toBe('paper');
    click('[data-landing-audience="builder"]');
    click('[data-landing-audience="user"]');
    expect(saved).toBe('midnight');
    click('[data-enter-service]');
    expect(document.documentElement.dataset.theme).toBe('midnight');
  });

  it.each([['#home', 'home', 'discover-nav'], ['#feed', 'builder', 'builder-nav'], ['#discover', 'discovery', 'catalog-nav'], ['#settings', 'settings', 'theme-settings-button']])(
    'supports direct links to %s with a single active tab',
    async (hash, screen, tab) => {
      await mount(hash);
      expect(visible(screen)).toBe(true);
      expect($(tab).getAttribute('aria-current')).toBe('page');
      expect(document.querySelectorAll('[data-primary-nav][aria-current="page"]')).toHaveLength(1);
    },
  );

  it('restores base tabs on history/hash navigation and keeps discovery subflows under discovery', async () => {
    await mount('#home');
    $('catalog-nav').click();
    $('theme-entry-button').click();
    expect(visible('theme')).toBe(true);
    expect($('catalog-nav').getAttribute('aria-current')).toBe('page');
    window.history.replaceState(null, '', '#settings');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(visible('settings')).toBe(true);
    expect($('theme-settings-button').getAttribute('aria-current')).toBe('page');
    window.history.replaceState(null, '', '#landing');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(visible('landing')).toBe(true);
    expect(visible('platform-nav')).toBe(false);
  });

  it('skips to platform content without changing the route or returning to landing', async () => {
    await mount('#discover');
    document.querySelector<HTMLAnchorElement>('.skip-link')!.click();
    expect(location.hash).toBe('#discover');
    expect(visible('discovery')).toBe(true);
    expect(document.activeElement).toBe($('main-content'));
  });

  it('keeps session picks across tab/round resets, supports undo and explicit removal, and never saves them', async () => {
    await mount('#home');
    await startCards();
    await likeCard();
    $('undo-button').click();
    $('builder-nav').click();
    expect($('feed-service-list').textContent).toContain('아직 관심 표시한 서비스가 없어요');
    await startCards();
    await likeCard();
    $('builder-nav').click();
    expect($('feed-service-list').textContent).toContain('도구 0');
    expect($('feed-service-list').textContent).toContain(services[0].description);
    expect(document.querySelector<HTMLAnchorElement>('#feed-service-list a')!.href).toBe(services[0].serviceUrl);
    await startCards();
    await likeCard();
    $('undo-button').click();
    $('builder-nav').click();
    expect(document.querySelectorAll('#feed-service-list .home-product-card')).toHaveLength(1);
    click('.feed-remove');
    expect($('feed-service-list').textContent).toContain('아직 관심 표시한 서비스가 없어요');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('surfaces storage failures while still applying a valid theme', async () => {
    storage.setItem.mockImplementation(() => { throw new Error('Storage blocked'); });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount('#settings');
    click('[data-app-theme="clay"]');
    expect(document.documentElement.dataset.theme).toBe('clay');
    expect($('theme-settings-status').textContent).toContain('저장하지 못했어요');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('shows approved owned services in the shared feed, prefills edits and clears the private list on logout', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'https://api.example' }));
      if (url.includes('/api/builder/me')) return new Response(JSON.stringify({
        builder: { email: 'builder@example.com', status: 'approved', programVerified: true },
      }));
      if (url.endsWith('/api/builder/services')) return new Response(JSON.stringify({ services: [services[0]] }));
      if (url.endsWith('/api/builder/dashboard')) return new Response(JSON.stringify({ services: [] }));
      if (url.includes('/api/services')) return new Response(JSON.stringify({ services }));
      return new Response('{}');
    });
    await mount('#feed');
    await tick();
    expect(visible('builder-approved-tools')).toBe(true);
    expect($('builder-owned-list').textContent).toContain(services[0].description);
    expect(document.querySelector<HTMLAnchorElement>('#builder-owned-list a')!.href).toBe(services[0].serviceUrl);
    const edit = [...document.querySelectorAll<HTMLButtonElement>('#builder-owned-list button')].find(button => button.textContent === '수정 제안 →')!;
    edit.click();
    expect(($('builder-edit-id') as HTMLInputElement).value).toBe(services[0].id);
    expect(($('builder-service-description') as HTMLTextAreaElement).value).toBe(services[0].description);
    expect(($('builder-service-url') as HTMLInputElement).value).toBe(services[0].serviceUrl);
    expect(document.activeElement).toBe($('builder-service-name'));
    $('builder-logout').click();
    await tick();
    expect(document.querySelectorAll('#builder-owned-list .home-product-card')).toHaveLength(0);
    expect(visible('builder-account-panel')).toBe(false);
    expect(visible('builder-login-form')).toBe(true);
  });

  it('consumes a magic-link token only for authentication and replaces it with the feed route', async () => {
    await mount('#token=one-time-token');
    await tick();
    expect(fetchMock).toHaveBeenCalledWith('https://api.example/api/builder/auth/verify', expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ token: 'one-time-token' }),
    }));
    expect(location.hash).toBe('#feed');
    expect(visible('builder')).toBe(true);
    expect(visible('builder-approved-tools')).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not overwrite a new platform route when a delayed magic-link verification completes', async () => {
    let completeVerification!: (response: Response) => void;
    const originalFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string) => url.includes('/api/builder/auth/verify')
      ? new Promise<Response>(resolve => { completeVerification = resolve; })
      : originalFetch(url));
    await mount('#token=one-time-token');
    $('discover-nav').click();
    expect(location.hash).toBe('#home');
    completeVerification(new Response(JSON.stringify({ builder: { status: 'pending', programVerified: false } })));
    await tick();
    expect(location.hash).toBe('#home');
    expect(visible('home')).toBe(true);
  });
});

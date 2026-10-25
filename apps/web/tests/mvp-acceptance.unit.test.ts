// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const markup = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];
const services = Array.from({ length: 12 }, (_, index) => ({
  id: `acceptance-${index}`, name: `서비스 ${index}`, tagline: '업무를 도와요', description: '',
  imageUrl: '', serviceUrl: `https://example.com/${index}`, tags: ['학습'], audiences: ['student'],
}));
const $ = (id: string) => document.getElementById(id)!;
const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const events: Array<{ name: string; metadata: Record<string, unknown> }> = [];

async function mount(override?: (url: string, init?: RequestInit) => Response | undefined) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const response = override?.(url, init);
    if (response) return response;
    if (url.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' }));
    if (url.includes('/api/services/ranking')) return new Response(JSON.stringify({ ranking: [] }));
    if (url.includes('/api/services')) return new Response(JSON.stringify({ services }));
    if (url.includes('/api/events')) events.push(JSON.parse(String(init?.body)));
    return new Response('{}');
  }));
  await import('../src/app.ts');
  await tick();
}

async function start() {
  $('start-button').click();
  await tick();
  click('[data-audience="student"]');
  click('[data-interest="학습"]');
  $('profile-next').click();
}

describe('MVP acceptance regressions', () => {
  beforeEach(() => {
    document.body.innerHTML = markup;
    events.length = 0;
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('commits only one card for repeated buttons and keyboard input during animation', async () => {
    await mount();
    await start();
    vi.useFakeTimers();
    $('like-button').click();
    $('like-button').click();
    $('swipe-stage').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await vi.advanceTimersByTimeAsync(260);
    expect($('progress').textContent).toBe('2 / 10');
    expect(events.filter((event) => event.name === 'card_like')).toHaveLength(1);
    $('undo-button').click();
    expect($('progress').textContent).toBe('1 / 10');
    expect(($('undo-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('cancels a pending decision when leaving cards and starts a different discovery from its first card', async () => {
    await mount();
    await start();
    vi.useFakeTimers();
    $('like-button').click();
    $('theme-entry-button').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(events.filter((event) => event.name === 'card_like')).toHaveLength(0);
    click('[data-theme="sns"]');
    click('[data-tier-index="2"]');
    await vi.advanceTimersByTimeAsync(0);
    click('[data-audience="student"]');
    click('[data-interest="소통"]');
    $('profile-next').click();
    expect($('progress').textContent).toBe('1 / 10');
    expect($('cards').classList.contains('hidden')).toBe(false);
  });

  it('supports skip, one-step undo and batched dislike reasons without crossing rounds', async () => {
    await mount();
    await start();
    $('skip-button').click();
    expect($('progress').textContent).toBe('2 / 10');
    $('undo-button').click();
    expect($('progress').textContent).toBe('1 / 10');
    $('skip-button').click();
    $('skip-button').click();
    $('undo-button').click();
    $('undo-button').click();
    expect($('progress').textContent).toBe('2 / 10');
    vi.useFakeTimers();
    $('reject-button').click();
    await vi.advanceTimersByTimeAsync(260);
    expect($('dislike-reasons').textContent).toBe('');
    for (let index = 0; index < 8; index++) $('skip-button').click();
    expect($('results').classList.contains('hidden')).toBe(false);
    expect($('dislike-reasons').textContent).toContain('서비스 1');
    expect($('result-list').textContent).toContain('아직 관심');
    $('continue-button').click();
    $('undo-button').click();
    expect($('progress').textContent).toBe('1 / 2');
  });

  it('records preview close once and supports intent, skip and automatic timeout', async () => {
    await mount();
    await start();
    vi.useFakeTimers();
    click('[data-preview]');
    $('preview-close').click();
    $('preview-close').click();
    expect($('preview-overlay').classList.contains('hidden')).toBe(true);
    expect(events.filter((event) => event.metadata.dwellBucket)).toHaveLength(1);
    click('[data-preview]');
    $('preview-close').click();
    click('[data-retry-intent="yes"]');
    expect(events.filter((event) => event.metadata.retryIntent === 'yes')).toHaveLength(1);
    click('[data-preview]');
    $('preview-close').click();
    await vi.advanceTimersByTimeAsync(6000);
    expect($('preview-overlay').classList.contains('hidden')).toBe(true);
    click('[data-preview]');
    $('preview-close').click();
    $('retry-intent-skip').click();
    expect($('preview-overlay').classList.contains('hidden')).toBe(true);
  });

  it('shows ranking HTTP failures explicitly and restores the empty-state message on retry', async () => {
    let failing = true;
    await mount((url) => url.includes('/api/services/ranking')
      ? new Response(JSON.stringify({ ranking: [] }), { status: failing ? 503 : 200 }) : undefined);
    $('home-ranking-entry').click();
    await tick();
    expect($('ranking-empty').textContent).toContain('불러오지 못했어요');
    $('ranking-back').click();
    failing = false;
    $('home-ranking-entry').click();
    await tick();
    expect($('ranking-empty').textContent).toContain('아직 집계된 선택');
  });

  it('preserves a failed AI prompt for retry and does not duplicate failed turns', async () => {
    let fail = true;
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    await mount((url, init) => {
      if (!url.includes('/api/assistant/chat')) return undefined;
      requests.push(JSON.parse(String(init?.body)));
      return fail ? new Response(JSON.stringify({ message: '잠시 후 다시 시도해 주세요.' }), { status: 502 })
        : new Response(JSON.stringify({ reply: '가'.repeat(2000), recommendations: [] }));
    });
    const input = $('assistant-message') as HTMLTextAreaElement;
    ($('assistant-consent') as HTMLInputElement).checked = true;
    input.value = '일정을 도와줘요.';
    $('assistant-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(input.value).toBe('일정을 도와줘요.');
    expect($('assistant-thread').children).toHaveLength(0);
    fail = false;
    $('assistant-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    input.value = '다른 방법도 알려줘요.';
    $('assistant-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    expect(requests[2].messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(requests[2].messages[1].content).toHaveLength(2000);
    $('assistant-reset').click();
    expect($('assistant-thread').children).toHaveLength(0);
    expect(($('assistant-consent') as HTMLInputElement).checked).toBe(false);
  });

  it('requires a feedback rating and reports submission failures without losing the comment', async () => {
    await mount((url, init) => {
      if (url.includes('/api/events') && JSON.parse(String(init?.body)).name === 'service_feedback_submit') {
        return new Response('{}', { status: 503 });
      }
      return undefined;
    });
    await start();
    vi.useFakeTimers();
    $('like-button').click();
    await vi.advanceTimersByTimeAsync(260);
    for (let index = 0; index < 9; index++) $('skip-button').click();
    const submit = document.querySelector<HTMLButtonElement>('.feedback-submit')!;
    expect(submit.disabled).toBe(true);
    click('[data-star="4"]');
    const comment = document.querySelector<HTMLTextAreaElement>('.feedback-comment')!;
    comment.value = '계속 사용하고 싶어요.';
    submit.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('.feedback-message')!.textContent).toContain('실패');
    expect(submit.disabled).toBe(false);
    expect(comment.value).toBe('계속 사용하고 싶어요.');
  });
});

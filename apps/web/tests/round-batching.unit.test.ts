// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

describe('web unit: swipe round size', () => {
  beforeEach(() => {
    document.body.innerHTML = bodyMarkup;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows 10 + 10 + remainder cards across consecutive rounds', async () => {
    const services = Array.from({ length: 23 }, (_, index) => ({
      id: `svc-${index}`,
      name: `서비스 ${index + 1}`,
      tagline: '',
      description: '',
      imageUrl: '',
      serviceUrl: `https://example.com/${index}`,
      tags: ['학습'],
      audiences: ['student'],
    }));
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('config.json')) return Promise.resolve(new Response(JSON.stringify({ apiUrl: 'http://localhost:3001' })));
      if (url.includes('/api/services')) return Promise.resolve(new Response(JSON.stringify({ services })));
      return Promise.resolve(new Response('{}'));
    }));
    vi.resetModules();
    const { BATCH_SIZE } = await import('../src/app.ts');
    expect(BATCH_SIZE).toBe(10);

    document.getElementById('start-button')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>('[data-audience="student"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-interest="학습"]')!.click();
    document.getElementById('profile-next')!.click();
    expect(document.getElementById('progress')!.textContent).toBe('1 / 10');

    vi.useFakeTimers();
    const swipeRound = async (count: number) => {
      for (let i = 0; i < count; i++) {
        document.getElementById('like-button')!.click();
        await vi.advanceTimersByTimeAsync(260);
      }
    };
    await swipeRound(10);
    expect(document.getElementById('cards')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('continue-button')!.textContent).toContain('다음 10개 더 보기');

    document.getElementById('continue-button')!.click();
    expect(document.getElementById('progress')!.textContent).toBe('1 / 10');
    await swipeRound(10);
    expect(document.getElementById('continue-button')!.textContent).toContain('다음 3개 더 보기');

    document.getElementById('continue-button')!.click();
    expect(document.getElementById('progress')!.textContent).toBe('1 / 3');
    await swipeRound(3);
    expect(document.getElementById('results')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('continue-button')!.classList.contains('hidden')).toBe(true);
  });
});

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { initializeBuilderPortal } from '../src/builder-portal-ui.js';

afterEach(() => vi.unstubAllGlobals());

it('shows the release gate error rather than silently presenting a working login', async () => {
  document.body.innerHTML = `
    <form id="builder-login-form"><p id="builder-login-status"></p></form>
    <div id="builder-account-panel" class="hidden"></div>`;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ message: '빌더 포털과 댓글은 공개 준비 중이에요.' }), { status: 503 },
  )));
  initializeBuilderPortal('https://api.example');
  await vi.waitFor(() => {
    expect(document.getElementById('builder-login-status')!.textContent).toContain('공개 준비 중');
  });
  expect(document.getElementById('builder-account-panel')!.classList.contains('hidden')).toBe(true);
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializePublicComments } from '../src/public-comments.js';

describe('public comments availability', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="public-comment-list"></div>
      <form id="public-comment-form">
        <input id="public-comment-nickname">
        <textarea id="public-comment-body"></textarea>
        <button type="submit">댓글 게시</button>
      </form>
      <p id="public-comment-status"></p>`;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('hides the publishing form and shows the release gate message when unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: '빌더 포털과 댓글은 공개 준비 중이에요.' }), { status: 503 },
    )));
    await initializePublicComments('https://api.example')('service-1');
    expect(document.getElementById('public-comment-form')!.hidden).toBe(true);
    expect(document.getElementById('public-comment-list')!.textContent).toContain('공개 준비 중');
  });

  it('only enables publishing after comments have loaded successfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ comments: [] }))));
    await initializePublicComments('https://api.example')('service-1');
    expect(document.getElementById('public-comment-form')!.hidden).toBe(false);
    expect(document.getElementById('public-comment-list')!.textContent).toContain('아직 댓글이 없습니다');
  });
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const markup = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];
const $ = (id: string) => document.getElementById(id)!;
const input = () => $('assistant-message') as HTMLTextAreaElement;
const consent = () => $('assistant-consent') as HTMLInputElement;
const settings = () => $('assistant-consent-settings') as HTMLDetailsElement;
const button = () => $('assistant-send') as HTMLButtonElement;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function reply(content = '출석을 확인하는 선생님 입장이신가요?') {
  return new Response(JSON.stringify({ reply: content, recommendations: [] }));
}

describe('assistant chat composer', () => {
  let chat: ReturnType<typeof vi.fn<(init?: RequestInit) => Promise<Response>>>;
  let removeWindowListeners: () => void;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = markup;
    window.history.replaceState(null, '', '/#home');
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const listeners = vi.spyOn(window, 'addEventListener');
    removeWindowListeners = () => {
      for (const [type, listener] of listeners.mock.calls) window.removeEventListener(type, listener);
    };
    chat = vi.fn(async () => reply());
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/assistant/chat')) return chat(init);
      if (url.includes('config.json')) return new Response(JSON.stringify({ apiUrl: 'https://api.example' }));
      if (url.includes('/api/services')) return new Response(JSON.stringify({ services: [] }));
      return new Response('{}');
    }));
    await import('../src/app.ts');
    await tick();
  });

  afterEach(() => {
    removeWindowListeners();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function submit(content: string) {
    input().value = content;
    $('assistant-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  function key(options: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
    input().dispatchEvent(event);
    return event;
  }

  it('starts with neutral problem guidance and explicitly requests consent before sending', () => {
    expect(input().placeholder).toContain('어떤 문제');
    expect(input().placeholder).not.toContain('회의록');
    expect($('assistant-send-label').textContent).toBe('대화 시작하기');
    expect(settings().open).toBe(true);
    settings().open = false;
    submit('출석체크가 어려워요.');
    expect(chat).not.toHaveBeenCalled();
    expect(settings().open).toBe(true);
    expect(document.activeElement).toBe(consent());
    expect($('assistant-status').textContent).toContain('동의');
  });

  it('shows a pending assistant turn, then switches to follow-up guidance without losing context or consent', async () => {
    const pending = deferred<Response>();
    chat.mockImplementationOnce(() => pending.promise);
    consent().checked = true;
    ($('assistant-tech-stack') as HTMLInputElement).value = '학교 출결 시스템';
    ($('assistant-context') as HTMLDetailsElement).open = true;
    submit('학교 출석체크가 어려워요.');

    expect(input().value).toBe('');
    expect(input().rows).toBe(1);
    expect(input().placeholder).toContain('미리 작성');
    expect(button().disabled).toBe(true);
    expect(($('assistant-reset') as HTMLButtonElement).disabled).toBe(true);
    expect($('assistant-form').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('.assistant-message-pending')?.textContent).toContain('답변을 준비');
    expect($('assistant-thread').getAttribute('aria-label')).toBe('Gyro와의 대화');
    expect(settings().open).toBe(false);
    expect(($('assistant-context') as HTMLDetailsElement).open).toBe(false);
    expect($('assistant-consent-summary').textContent).toContain('동의됨');

    pending.resolve(reply());
    await tick();
    expect(document.querySelector('.assistant-message-pending')).toBeNull();
    expect(input().placeholder).toContain('Gyro의 질문');
    expect(input().placeholder).not.toContain('어떤 문제');
    expect($('assistant-message-label').textContent).toBe('답변 또는 추가 요청');
    expect($('assistant-send-label').textContent).toBe('메시지 보내기');
    expect($('assistant-form').getAttribute('aria-busy')).toBe('false');
    expect(button().disabled).toBe(false);
    expect([...document.querySelectorAll('.assistant-message-author')].map(element => element.textContent)).toEqual(['나', 'Gyro']);
    expect(consent().checked).toBe(true);
    expect(($('assistant-tech-stack') as HTMLInputElement).value).toBe('학교 출결 시스템');

    chat.mockResolvedValueOnce(reply('어떤 부분이 가장 번거로운가요?'));
    submit('선생님이요.');
    await tick();
    const payload = JSON.parse(String(chat.mock.calls[1][0]?.body));
    expect(payload.messages.map((message: { content: string }) => message.content)).toEqual([
      '학교 출석체크가 어려워요.', '출석을 확인하는 선생님 입장이신가요?', '선생님이요.',
    ]);
    expect(payload.techStack).toBe('학교 출결 시스템');
    expect(input().value).toBe('');
  });

  it.each(['http', 'invalid', 'network'] as const)('removes a failed first turn and restores initial guidance on %s failure', async failure => {
    consent().checked = true;
    if (failure === 'http') {
      chat.mockResolvedValueOnce(new Response(JSON.stringify({ message: '다시 시도해 주세요.' }), { status: 502 }));
    } else if (failure === 'invalid') {
      chat.mockResolvedValueOnce(new Response('{}'));
    } else {
      chat.mockRejectedValueOnce(new Error('offline'));
    }
    submit('출석체크를 도와주세요.');
    await tick();
    expect(input().value).toBe('출석체크를 도와주세요.');
    expect(input().placeholder).toContain('어떤 문제');
    expect(input().rows).toBe(2);
    expect($('assistant-thread').children).toHaveLength(0);
    expect($('assistant-send-label').textContent).toBe('대화 시작하기');
    expect($('assistant-form').getAttribute('aria-busy')).toBe('false');
    expect(settings().open).toBe(true);
    expect(button().disabled).toBe(false);
    expect($('assistant-status').textContent).not.toBe('');
    submit(input().value);
    await tick();
    expect(JSON.parse(String(chat.mock.calls[1][0]?.body)).messages).toHaveLength(1);
  });

  it('preserves successful history and follow-up guidance after a failed follow-up', async () => {
    consent().checked = true;
    submit('출석체크가 어려워요.');
    await tick();
    chat.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    submit('선생님이요.');
    await tick();
    expect(input().value).toBe('선생님이요.');
    expect(input().placeholder).toContain('Gyro의 질문');
    expect($('assistant-thread').querySelectorAll('.assistant-message')).toHaveLength(2);
    expect(document.querySelector('.assistant-message-pending')).toBeNull();
    submit(input().value);
    await tick();
    expect(JSON.parse(String(chat.mock.calls[2][0]?.body)).messages.map((message: { role: string }) => message.role))
      .toEqual(['user', 'assistant', 'user']);
  });

  it('sends on Enter but leaves Shift+Enter and Korean composition to the textarea', async () => {
    consent().checked = true;
    input().value = '선생님이요.';
    expect(key({ shiftKey: true }).defaultPrevented).toBe(false);
    expect(key({ isComposing: true }).defaultPrevented).toBe(false);
    expect(key({ keyCode: 229 }).defaultPrevented).toBe(false);
    expect(chat).not.toHaveBeenCalled();
    expect(key().defaultPrevented).toBe(true);
    await tick();
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('keeps a new draft on failure and prevents duplicate sends or reset while waiting', async () => {
    const pending = deferred<Response>();
    chat.mockImplementationOnce(() => pending.promise);
    consent().checked = true;
    submit('첫 메시지');
    input().value = '대기 중 작성한 다음 메시지';
    key();
    $('assistant-form').dispatchEvent(new Event('submit', { cancelable: true }));
    $('assistant-reset').dispatchEvent(new Event('click'));
    expect(chat).toHaveBeenCalledTimes(1);
    expect(consent().checked).toBe(true);
    pending.reject(new Error('offline'));
    await tick();
    expect(input().value).toBe('대기 중 작성한 다음 메시지');
    expect($('assistant-thread').children).toHaveLength(0);
    expect(button().disabled).toBe(false);
  });

  it('allows consent to be revoked and resets all conversation-specific controls', async () => {
    consent().checked = true;
    submit('출석체크가 어려워요.');
    await tick();
    consent().checked = false;
    consent().dispatchEvent(new Event('change'));
    expect($('assistant-consent-summary').textContent).not.toContain('동의됨');
    submit('선생님이요.');
    expect(chat).toHaveBeenCalledTimes(1);
    expect(settings().open).toBe(true);
    ($('assistant-tech-stack') as HTMLInputElement).value = 'Notion';
    ($('assistant-repo-url') as HTMLInputElement).value = 'https://github.com/sample/repo';
    $('assistant-reset').click();
    expect(input().value).toBe('');
    expect(input().rows).toBe(2);
    expect(input().placeholder).toContain('어떤 문제');
    expect($('assistant-send-label').textContent).toBe('대화 시작하기');
    expect(settings().open).toBe(true);
    expect(consent().checked).toBe(false);
    expect(($('assistant-tech-stack') as HTMLInputElement).value).toBe('');
    expect(($('assistant-repo-url') as HTMLInputElement).value).toBe('');
    expect($('assistant-thread').children).toHaveLength(0);
    expect(document.activeElement).toBe(input());
  });
});

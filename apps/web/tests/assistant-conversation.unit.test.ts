import { describe, expect, it } from 'vitest';
import { assistantRequest, type AssistantMessage } from '../src/assistant-conversation.js';

describe('assistant request history', () => {
  it('keeps whole recent turns with the new user message last', () => {
    const history: AssistantMessage[] = Array.from({ length: 16 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant', content: String(index),
    }));
    const message: AssistantMessage = { role: 'user', content: 'new message' };
    const payload = assistantRequest(history, message, 'React', '');
    expect(payload.messages).toHaveLength(11);
    expect(payload.messages[0]).toEqual(history[6]);
    expect(payload.messages.at(-1)).toEqual(message);
    expect(history).toHaveLength(16);
  });

  it('bounds actual UTF-8 JSON bytes even for long Korean replies', () => {
    const history: AssistantMessage[] = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: index % 2 === 0 ? '가'.repeat(1500) : '나'.repeat(2500),
    }));
    const payload = assistantRequest(history, { role: 'user', content: '다'.repeat(1500) }, '기'.repeat(500), 'https://github.com/sample/project');
    expect(new TextEncoder().encode(JSON.stringify(payload)).byteLength).toBeLessThanOrEqual(30 * 1024);
    expect(payload.messages[0].role).toBe('user');
    expect(payload.messages.at(-1)?.content).toBe('다'.repeat(1500));
    expect(payload.messages.length % 2).toBe(1);
  });
});

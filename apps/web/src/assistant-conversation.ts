export type AssistantMessage = { role: 'user' | 'assistant'; content: string };

export function assistantRequest(
  history: AssistantMessage[],
  message: AssistantMessage,
  techStack: string,
  repoUrl: string,
) {
  const messages = [...history.slice(-10), message];
  const payload = { messages, techStack, repoUrl };
  // Keep complete prior turns while respecting the API's UTF-8 body limit.
  while (messages.length > 1 && new TextEncoder().encode(JSON.stringify(payload)).byteLength > 30 * 1024) {
    messages.splice(0, 2);
  }
  return payload;
}

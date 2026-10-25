import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, RuntimeConnection } from '@github/copilot-sdk';

export class AssistantConfigurationError extends Error {}
export class AssistantProviderError extends Error {}
export class AssistantBusyError extends Error {}

let requestPending = false;

export function copilotConfiguration(): { model: string; token?: string; local: boolean } {
  const provider = process.env.GYRO_ASSISTANT_PROVIDER;
  const local = provider === 'copilot-local';
  if (provider !== 'copilot' && !(local && process.env.NODE_ENV === 'development')) {
    throw new AssistantConfigurationError('Copilot 추천 환경이 설정되지 않았습니다.');
  }
  const model = process.env.COPILOT_MODEL?.trim();
  if (!model) throw new AssistantConfigurationError('COPILOT_MODEL 환경 변수가 설정되지 않았습니다.');
  if (local) return { model, local };
  const token = process.env.COPILOT_GITHUB_TOKEN?.trim();
  if (!token?.startsWith('github_pat_')) {
    throw new AssistantConfigurationError('Copilot Requests 권한이 있는 fine-grained PAT를 설정해 주세요.');
  }
  return { model, token, local };
}

function isLoopback(value: string | undefined): boolean {
  return value === 'localhost' || value === '127.0.0.1' || value === '::1'
    || value === '[::1]' || value === '::ffff:127.0.0.1';
}

export function isLocalAssistantRequest(remoteAddress: string | undefined, host: string | undefined, origin: string | undefined): boolean {
  if (!isLoopback(remoteAddress) || !host) return false;
  try {
    const hostUrl = new URL(`http://${host}`);
    if (!isLoopback(hostUrl.hostname) || hostUrl.username || hostUrl.password || hostUrl.pathname !== '/') return false;
    if (origin === undefined) return true;
    const originUrl = new URL(origin);
    return (originUrl.protocol === 'http:' || originUrl.protocol === 'https:')
      && isLoopback(originUrl.hostname) && !originUrl.username && !originUrl.password
      && originUrl.origin === origin;
  } catch {
    return false;
  }
}

export async function generateCopilotReply(systemPrompt: string, prompt: string): Promise<string> {
  const { model, token, local } = copilotConfiguration();
  if (requestPending) throw new AssistantBusyError('AI 추천을 처리 중이에요. 완료 후 다시 시도해 주세요.');
  requestPending = true;
  let directory: string | undefined;
  let client: CopilotClient | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'gyro-copilot-'));
    client = new CopilotClient({
      connection: RuntimeConnection.forStdio(),
      mode: 'empty',
      baseDirectory: directory,
      workingDirectory: directory,
      gitHubToken: token,
      useLoggedInUser: local,
      logLevel: 'none',
      env: { ...process.env, COPILOT_GITHUB_TELEMETRY_DISABLED: 'true' },
    });
    await client.start();
    const auth = await client.getAuthStatus();
    if (!auth.isAuthenticated) {
      throw new AssistantConfigurationError('Copilot 인증을 확인해 주세요.');
    }
    const session = await client.createSession({
      model,
      availableTools: [],
      excludedTools: ['builtin:*', 'mcp:*', 'custom:*'],
      onPermissionRequest: () => ({ kind: 'reject' }),
      systemMessage: { mode: 'replace', content: systemPrompt },
      mcpServers: {},
      skillDirectories: [],
      enableConfigDiscovery: false,
      enableSkills: false,
      enableSessionTelemetry: false,
      infiniteSessions: { enabled: false },
    });
    const response = await session.sendAndWait({ prompt }, 60_000);
    if (!response?.data.content) throw new AssistantProviderError('AI 추천 서비스가 빈 응답을 반환했습니다.');
    return response.data.content;
  } catch (error) {
    if (error instanceof AssistantConfigurationError || error instanceof AssistantProviderError) throw error;
    throw new AssistantProviderError('Copilot 요청이 실패했습니다. 로그인·모델 접근 권한·사용량을 확인해 주세요.');
  } finally {
    try {
      // Stop the isolated runtime before removing its temporary conversation state.
      if (client) await client.forceStop();
      if (directory) await rm(directory, { recursive: true, force: true });
    } catch {
      console.error('Copilot runtime cleanup failed.');
      throw new AssistantProviderError('AI 임시 상태를 정리하지 못했습니다. 서버 상태를 확인해 주세요.');
    } finally {
      requestPending = false;
    }
  }
}

import { access } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopilotClient } from '@github/copilot-sdk';
import { copilotConfiguration, generateCopilotReply, isLocalAssistantRequest } from '../src/copilot-provider.js';

const runtime = vi.hoisted(() => ({
  start: vi.fn(),
  getAuthStatus: vi.fn(),
  createSession: vi.fn(),
  forceStop: vi.fn(),
  sendAndWait: vi.fn(),
}));

vi.mock('@github/copilot-sdk', () => ({
  RuntimeConnection: { forStdio: () => ({ kind: 'stdio' }) },
  CopilotClient: vi.fn(function () { return runtime; }),
}));

describe('Copilot runtime isolation and authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GYRO_ASSISTANT_PROVIDER', 'copilot');
    vi.stubEnv('COPILOT_MODEL', 'test-model');
    vi.stubEnv('COPILOT_GITHUB_TOKEN', 'github_pat_test');
    runtime.start.mockResolvedValue(undefined);
    runtime.forceStop.mockResolvedValue(undefined);
    runtime.getAuthStatus.mockResolvedValue({ isAuthenticated: true });
    runtime.createSession.mockResolvedValue({ sendAndWait: runtime.sendAndWait });
    runtime.sendAndWait.mockResolvedValue({ data: { content: '{"reply":"ok","recommendations":[]}' } });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('requires explicit server configuration and never accepts classic or ambient tokens', () => {
    vi.stubEnv('COPILOT_GITHUB_TOKEN', '');
    vi.stubEnv('GH_TOKEN', 'ambient-token');
    expect(copilotConfiguration).toThrow('fine-grained');
    vi.stubEnv('COPILOT_GITHUB_TOKEN', 'ghp_test');
    expect(copilotConfiguration).toThrow('fine-grained');
    vi.stubEnv('COPILOT_GITHUB_TOKEN', 'github_pat_test');
    vi.stubEnv('COPILOT_MODEL', '');
    expect(copilotConfiguration).toThrow('COPILOT_MODEL');
  });

  it('only permits local credential discovery in development', () => {
    vi.stubEnv('GYRO_ASSISTANT_PROVIDER', 'copilot-local');
    vi.stubEnv('NODE_ENV', 'production');
    expect(copilotConfiguration).toThrow();
    vi.stubEnv('NODE_ENV', 'development');
    expect(copilotConfiguration()).toEqual({ model: 'test-model', local: true });
  });

  it('allows loopback hosts and origins only', () => {
    expect(isLocalAssistantRequest('::ffff:127.0.0.1', 'localhost:3001', 'http://localhost:3002')).toBe(true);
    expect(isLocalAssistantRequest('127.0.0.1', 'localhost:3001', undefined)).toBe(true);
    expect(isLocalAssistantRequest('192.0.2.1', 'localhost:3001', undefined)).toBe(false);
    expect(isLocalAssistantRequest('127.0.0.1', 'attacker.test', undefined)).toBe(false);
    expect(isLocalAssistantRequest('127.0.0.1', 'localhost:3001', 'null')).toBe(false);
  });

  it('uses explicit PAT, disables tools and discovery, and removes temporary state', async () => {
    await expect(generateCopilotReply('system', 'prompt')).resolves.toContain('"reply"');
    const options = vi.mocked(CopilotClient).mock.calls[0][0]!;
    expect(options).toMatchObject({
      mode: 'empty', gitHubToken: 'github_pat_test', useLoggedInUser: false, logLevel: 'none',
    });
    const config = runtime.createSession.mock.calls[0][0];
    expect(config).toMatchObject({
      availableTools: [], excludedTools: ['builtin:*', 'mcp:*', 'custom:*'],
      enableConfigDiscovery: false, enableSkills: false, mcpServers: {},
    });
    expect(config.onPermissionRequest()).toEqual({ kind: 'reject' });
    expect(runtime.sendAndWait).toHaveBeenCalledWith({ prompt: 'prompt' }, 60_000);
    expect(runtime.forceStop).toHaveBeenCalledOnce();
    await expect(access(options.baseDirectory!)).rejects.toThrow();
  });

  it.each(['authentication', 'timeout', 'empty'])('cleans up after %s failures and redacts raw errors', async (failure) => {
    if (failure === 'authentication') runtime.getAuthStatus.mockResolvedValue({ isAuthenticated: false });
    if (failure === 'timeout') runtime.sendAndWait.mockRejectedValue(new Error('secret-provider-error'));
    if (failure === 'empty') runtime.sendAndWait.mockResolvedValue(undefined);
    await expect(generateCopilotReply('system', 'prompt')).rejects.not.toThrow('secret-provider-error');
    expect(runtime.forceStop).toHaveBeenCalledOnce();
    await expect(access(vi.mocked(CopilotClient).mock.calls[0][0]!.baseDirectory!)).rejects.toThrow();
  });

  it('rejects overlapping requests without launching another runtime', async () => {
    let release!: (response: { data: { content: string } }) => void;
    let started!: () => void;
    const sending = new Promise<void>((resolve) => { started = resolve; });
    runtime.sendAndWait.mockImplementation(() => {
      started();
      return new Promise((resolve) => { release = resolve; });
    });
    const first = generateCopilotReply('system', 'prompt');
    await sending;
    await expect(generateCopilotReply('system', 'prompt')).rejects.toThrow('처리 중');
    release({ data: { content: 'ok' } });
    await expect(first).resolves.toBe('ok');
    expect(CopilotClient).toHaveBeenCalledOnce();
  });
});

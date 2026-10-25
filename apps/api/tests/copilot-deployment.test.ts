import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve(import.meta.dirname, '../../../.github/scripts/configure-copilot.sh');
let directory: string;

describe('Actions Copilot PAT injection', () => {
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'gyro-deploy-test-'));
    writeFileSync(join(directory, 'az'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@" >> "$AZ_RECORD"\n', { mode: 0o700 });
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function run(token = 'github_pat_fixture', model = 'test-model') {
    return spawnSync('bash', [script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        AZ_RECORD: join(directory, 'calls'),
        COPILOT_GITHUB_TOKEN: token,
        COPILOT_MODEL: model,
        API_APP: 'test-api',
        RESOURCE_GROUP: 'test-group',
      },
    });
  }

  it('writes PAT only to API secret and uses a secret reference for runtime', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain('github_pat_fixture');
    const calls = readFileSync(join(directory, 'calls'), 'utf8');
    expect(calls).toContain('copilot-github-token=github_pat_fixture');
    expect(calls).toContain('COPILOT_GITHUB_TOKEN=secretref:copilot-github-token');
    expect(calls).toContain('GYRO_ASSISTANT_PROVIDER=copilot');
    expect(calls).toContain('NODE_ENV=production');
    expect(calls.match(/github_pat_fixture/g)).toHaveLength(1);
    expect(calls).not.toContain('test-web');
  });

  it.each([['', 'test-model'], ['ghp_fixture', 'test-model'], ['github_pat_fixture', '']])(
    'fails before modifying Azure when token/model configuration is invalid',
    (token, model) => {
      const result = run(token, model);
      expect(result.status).not.toBe(0);
      expect(() => readFileSync(join(directory, 'calls'))).toThrow();
      expect(result.stdout + result.stderr).not.toContain('ghp_fixture');
    },
  );
});

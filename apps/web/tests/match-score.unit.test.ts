// @vitest-environment jsdom
// Regression coverage for round composition: after the profile step, rounds
// (BATCH_SIZE cards) must be cut from a deck sorted by how well each service
// matches the selected audience/type and interests, so round 1 is always the
// user's best-matching batch.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtmlPath = join(import.meta.dirname, '..', 'index.html');
const bodyMarkup = readFileSync(indexHtmlPath, 'utf8').match(/<body>([\s\S]*)<\/body>/)![1];

function mountApp() {
  document.body.innerHTML = bodyMarkup;
}

async function loadAppModule() {
  vi.resetModules();
  return import('../src/app.ts');
}

describe('web unit: interest/audience-weighted match scoring', () => {
  beforeEach(() => {
    mountApp();
    vi.restoreAllMocks();
  });

  it('weighs matched interest tags and the selected audience separately', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
    const { matchScore, matchedInterestTags, INTEREST_WEIGHT, AUDIENCE_WEIGHT } = await loadAppModule();

    const service = {
      id: 'svc-1',
      name: '테스트',
      tagline: '',
      description: '',
      imageUrl: '',
      serviceUrl: '',
      tags: ['학습', '협업'],
      audiences: ['teacher'],
    };

    const interests = new Set(['학습']);
    expect(matchedInterestTags(service, interests)).toEqual(['학습']);
    // One matched tag, no audience match.
    expect(matchScore(service, 'student', interests)).toBe(INTEREST_WEIGHT);
    // One matched tag plus an audience match.
    expect(matchScore(service, 'teacher', interests)).toBe(INTEREST_WEIGHT + AUDIENCE_WEIGHT);
    expect(matchScore({ ...service, tasks: ['report-automation'] }, null, new Set(), 'report-automation')).toBe(INTEREST_WEIGHT);
    // No matched tags, no audience match.
    expect(matchScore(service, 'parent', new Set())).toBe(0);
  });

  it('ranks a higher-scoring service ahead of a lower-scoring one for the same audience/interests', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}'))));
    const { matchScore } = await loadAppModule();

    const bestMatch = { id: 'best', name: '', tagline: '', description: '', imageUrl: '', serviceUrl: '', tags: ['학습', 'AI'], audiences: ['teacher'] };
    const partialMatch = { id: 'partial', name: '', tagline: '', description: '', imageUrl: '', serviceUrl: '', tags: ['학습'], audiences: ['student'] };
    const noMatch = { id: 'none', name: '', tagline: '', description: '', imageUrl: '', serviceUrl: '', tags: ['생활'], audiences: ['parent'] };

    const interests = new Set(['학습', 'AI']);
    const scores = [bestMatch, partialMatch, noMatch].map((s) => matchScore(s, 'teacher', interests));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });
});

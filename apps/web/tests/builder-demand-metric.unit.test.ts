import { describe, expect, it } from 'vitest';
import { formatInterestReaction } from '../src/builder-portal-ui.js';

describe('builder interest reaction metric', () => {
  it('shows the interest share and response count, excluding skips', () => {
    expect(formatInterestReaction(3, 2)).toBe('관심 있음 선택 비율: 60% (3/5건, 관심 있음/없음 응답 기준; 건너뛰기 제외)');
  });

  it('shows no data when there are no like or dislike responses', () => {
    expect(formatInterestReaction(0, 0)).toBe('관심 있음 선택 비율: 응답 없음 (0건)');
  });
});

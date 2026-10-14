import { expect, test } from 'vitest';
import { minimumSubjectCorrect, meetsSubjectMinimum } from './passRule';
import { scoreRound } from './scoring';
import type { RoundData } from '../data/types';
test.each([10, 30, 55, 57])('integer threshold matches scoring for %i questions', count => {
  const minimum = minimumSubjectCorrect(count);
  expect(minimum).toBe(Math.ceil(count * 40 / 100));
  expect(meetsSubjectMinimum(minimum, count)).toBe(true);
  expect(meetsSubjectMinimum(minimum - 1, count)).toBe(false);
  const round: RoundData = { formatVersion: 1, round: 1, title: '개발 표본', timeLimitMinutes: 90,
    subjects: [{ id: 1, name: '표본 과목' }], questions: Array.from({ length: count }, (_, i) => ({
      number: i + 1, subject: 1, question: '표본', stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본',
    })) };
  for (const correct of [minimum - 1, minimum]) {
    const result = scoreRound(round, Object.fromEntries(Array.from({ length: correct }, (_, i) => [i + 1, 1])));
    expect(result.subjects[0].failed).toBe(correct < minimum);
  }
  if (count === 55) expect(minimum).toBe(22);
});

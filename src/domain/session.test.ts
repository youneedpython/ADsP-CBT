import { expect, it } from 'vitest';
import { accumulateElapsed, formatRemainingTime, getProgress, getTiming, isTimeWarning, selectExamAnswer, selectPracticeAnswer } from './session';

it('locks practice answers and preserves the initial state', () => {
  const initial = { answers: {}, current: 1 };
  const next = selectPracticeAnswer(initial, 1, 2);
  expect(next.answers).toEqual({ 1: 2 });
  expect(initial.answers).toEqual({});
  expect(selectPracticeAnswer(next, 1, 3)).toBe(next);
});
it('selects, changes and clears exam answers without mutation', () => {
  const initial = { answers: {}, current: 1, startedAt: 'sample' };
  const selected = selectExamAnswer(initial, 1, 2);
  const changed = selectExamAnswer(selected, 1, 3);
  expect(selected.answers).toEqual({ 1: 2 });
  expect(changed.answers).toEqual({ 1: 3 });
  expect(selectExamAnswer(changed, 1, 3)).toEqual(initial);
  expect(initial.answers).toEqual({});
});
it('counts valid answers only for requested questions', () => {
  expect(getProgress({ 1: 2, 3: 4, 4: 9, 99: 1 }, [1, 2, 3, 4])).toEqual({ answeredCount: 2, unanswered: [2, 4] });
});
it.each([[0, 5400, 0], [699000, 4701, 699], [4799000, 601, 4799], [4800000, 600, 4800],
  [5400000, 0, 5400], [5401000, -1, 5401], [6125000, -725, 6125]])('calculates time at %s ms', (now, remainingSeconds, elapsedSeconds) => {
  expect(getTiming(now / 1000, 90)).toEqual({ remainingSeconds, elapsedSeconds, overtimeSeconds: Math.max(0, -remainingSeconds) });
  expect(isTimeWarning(remainingSeconds)).toBe(remainingSeconds <= 600);
});
it.each([[5400, '90:00'], [4701, '78:21'], [5, '0:05'], [0, '0:00'], [-1, '초과 0:01'], [-725, '초과 12:05']])('formats %s seconds', (seconds, expected) => {
  expect(formatRemainingTime(seconds)).toBe(expected);
});

it.each([[1000, 2000, 11], [1000, 6000, 15], [1000, 6001, 10], [2000, 1000, 10], [1000, 2999, 11]])('accumulates a visible interval %s to %s', (start, end, expected) => {
  expect(accumulateElapsed(10, start, end)).toBe(expected);
});

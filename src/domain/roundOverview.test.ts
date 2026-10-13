import { expect, test } from 'vitest';
import { cardRecord, groupRounds, isPracticeInProgress, selectResume, type RoundRecords } from './roundOverview';
import type { RoundSummary } from '../data/types';
const round = (number: number, year = 2026): RoundSummary => ({ round: number, year, title: '개발 표본', questionCount: 4, timeLimitMinutes: 30, file: `${number}.json` });
const empty: RoundRecords = { exam: null, practice: null, result: null };
const practice = { answers: { 1: 2 as const }, current: 2 };
const exam = { ...practice, startedAt: '2026-10-11T00:00:00Z', elapsedSeconds: 10 };
const result = { answers: {}, score: 4, passed: true, subjectCorrect: { 1: 2, 2: 0, 3: 0 }, elapsedSeconds: 30, submittedAt: exam.startedAt, questionCount: 4 };
test('groups years and rounds newest first without changing input', () => {
  const input = [round(46, 2025), round(49), round(47, 2025), round(50)];
  expect(groupRounds(input).map(group => [group.year, group.rounds.map(item => item.round)])).toEqual([[2026, [50, 49]], [2025, [47, 46]]]);
  expect(input.map(item => item.round)).toEqual([46, 49, 47, 50]);
  expect(groupRounds([])).toEqual([]);
});
test.each([
  [{ ...empty, exam }, '시험 1 / 4', 'exam'],
  [{ ...empty, result }, '4점 합격', 'pass'],
  [{ ...empty, result: { ...result, passed: false } }, '4점 불합격', 'fail'],
  [{ ...empty, practice }, '연습 1 / 4', 'practice'],
  [empty, '기록 없음', 'none'],
  [{ ...empty, exam, result, practice }, '시험 1 / 4', 'exam'],
] as const)('card priority %#', (records, text, kind) => expect(cardRecord(round(50), records)).toEqual({ text, kind }));
test('only partial answered practice is in progress and completed results beat practice', () => {
  expect(isPracticeInProgress(null, 4)).toBe(false);
  expect(isPracticeInProgress({ answers: {}, current: 1 }, 4)).toBe(false);
  expect(isPracticeInProgress(practice, 4)).toBe(true);
  const completed = { answers: { 1: 1 as const, 2: 1 as const, 3: 1 as const, 4: 1 as const }, current: 4 };
  expect(isPracticeInProgress(completed, 4)).toBe(false);
  expect(cardRecord(round(50), { ...empty, practice: completed }).text).toBe('기록 없음');
  expect(cardRecord(round(50), { ...empty, practice, result }).kind).toBe('pass');
});
test('resume chooses latest-started exam before highest-number practice; ignores unknown records', () => {
  const rounds = [round(48), round(50), round(49)];
  const records = { 48: { ...empty, exam: { ...exam, startedAt: '2026-10-12T00:00:00Z' } }, 49: { ...empty, exam }, 50: { ...empty, practice }, 99: { ...empty, exam: { ...exam, startedAt: '2026-10-13T00:00:00Z' } } };
  expect(selectResume(rounds, records)?.round.round).toBe(48);
  expect(selectResume(rounds, records)?.mode).toBe('exam');
  expect(selectResume(rounds, { 48: { ...empty, practice }, 50: { ...empty, practice } })?.round.round).toBe(50);
  expect(selectResume(rounds, {})).toBeNull();
  expect(selectResume([], records)).toBeNull();
});

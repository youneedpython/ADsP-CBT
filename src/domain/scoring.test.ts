import { describe, expect, it } from 'vitest';
import type { RoundData, SubjectId } from '../data/types';
import { scoreRound } from './scoring';

function sample(counts = [10, 10, 30]): RoundData {
  let number = 0;
  return { formatVersion: 1, round: 1, title: '개발용 표본', timeLimitMinutes: 90,
    subjects: [1, 2, 3].map(id => ({ id: id as SubjectId, name: `표본 과목 ${id}` })),
    questions: counts.flatMap((count, index) => Array.from({ length: count }, () => ({
      number: ++number, subject: (index + 1) as SubjectId, question: '표본 질문',
      stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설',
    }))) };
}
function answers(counts: number[]) {
  return Object.fromEntries(counts.flatMap((count, index) =>
    Array.from({ length: count }, (_, offset) => [index * 10 + offset + 1, 1])));
}
describe('scoring', () => {
  it('scores all correct, wrong and unanswered without mutating inputs', () => {
    const round = sample();
    const correct = Object.fromEntries(round.questions.map(q => [q.number, 1]));
    const before = JSON.stringify({ round, correct });
    expect(scoreRound(round, correct)).toMatchObject({ score: 100, passed: true, failureReasons: [] });
    for (const input of [Object.fromEntries(round.questions.map(q => [q.number, 2])), {}]) {
      expect(scoreRound(round, input)).toMatchObject({ score: 0, passed: false,
        failureReasons: ['총점 미달', '1과목 과락', '2과목 과락', '3과목 과락'] });
    }
    expect(JSON.stringify({ round, correct })).toBe(before);
  });
  it('preserves mixed answers and supplies missing subject names', () => {
    const round = sample();
    round.subjects = round.subjects.filter(s => s.id !== 2);
    const mixed = { 1: 1, 2: 3, 11: 1, 12: 4 };
    const before = JSON.stringify({ round, mixed });
    expect(scoreRound(round, mixed).subjects[1]).toMatchObject({ name: '2과목', correctCount: 1 });
    expect(JSON.stringify({ round, mixed })).toBe(before);
  });
  it.each([[4, 4, 22, true], [4, 4, 21, false]])('checks 60 point boundary (%s,%s,%s)', (a, b, c, passed) => {
    const result = scoreRound(sample(), answers([a, b, c]));
    expect(result.passed).toBe(passed);
    expect(result.failureReasons).toEqual(passed ? [] : ['총점 미달']);
  });
  it.each([[4, 12, false, false], [3, 11, true, true]])('checks integer subject boundaries', (a, c, first, third) => {
    const result = scoreRound(sample(), answers([a, 10, c]));
    expect(result.subjects[0].failed).toBe(first);
    expect(result.subjects[2].failed).toBe(third);
  });
  it('fails by subject even with 60 points and orders multiple reasons', () => {
    expect(scoreRound(sample(), answers([3, 10, 30])).failureReasons).toEqual(['1과목 과락']);
    const round = sample();
    round.subjects.reverse();
    round.questions.reverse();
    expect(scoreRound(round, answers([3, 3, 12])).failureReasons).toEqual(['총점 미달', '1과목 과락', '2과목 과락']);
  });
  it('ignores invalid answers and unknown question numbers', () => {
    const result = scoreRound(sample(), { 1: 0, 2: 5, 3: 1.5, 4: NaN, 99: 1, 5: 2 });
    expect(result.correctCount).toBe(0);
    expect(result.questions.slice(0, 4).every(q => q.selected === null)).toBe(true);
    expect(result.questions[4]).toMatchObject({ selected: 2, answer: 1, correct: false });
    expect(result.questions[5].selected).toBeNull();
  });
  it('counts nonstandard subject composition from questions', () => {
    const result = scoreRound(sample([5, 15, 20]), {});
    expect(result.questionCount).toBe(40);
    expect(result.subjects.map(s => s.questionCount)).toEqual([5, 15, 20]);
    expect(result.subjects[1].name).toBe('표본 과목 2');
  });
});

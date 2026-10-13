import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import type { RoundData } from '../data/types';
import type { LoadState } from '../components/LoadingState';
import { RecordStoreContext } from '../storage/RecordStoreContext';
import { createRecordStore } from '../storage/records';
import { EXAM_SUBJECTS, PASS_EXAMPLES, PASS_SCORE, POINTS_PER_QUESTION, SUBJECT_PASS_PERCENT, evaluatePassExample } from '../domain/passRule';
import { scoreRound } from '../domain/scoring';
import { HomePage } from './HomePage';

afterEach(cleanup);

function show(state: LoadState) {
  render(<MemoryRouter><RecordStoreContext.Provider value={createRecordStore()}><HomePage state={state} retry={() => {}} /></RecordStoreContext.Provider></MemoryRouter>);
  return within(screen.getByRole('region', { name: '합격 기준' }));
}

test.each<LoadState>([{ status: 'loading' }, { status: 'error' }, { status: 'success', rounds: [] },
  { status: 'success', rounds: [{ round: 1, year: 2026, title: '개발 표본', questionCount: 50, timeLimitMinutes: 90, file: '1.json' }] }])('pass rules remain visible with round state %j', state => {
  const section = show(state);
  expect(section.getByRole('heading', { name: '합격 기준', level: 2 })).toBeTruthy();
  expect(section.getByText('두 조건을 모두 만족해야 합격입니다.')).toBeTruthy();
  expect(section.getByRole('heading', { name: '총점 60점 이상' })).toBeTruthy();
  expect(section.getByRole('heading', { name: '과목마다 40% 이상' })).toBeTruthy();
  expect(section.getByText('문항당 2점입니다. 50문항 중 30문항 이상 맞혀야 합니다.')).toBeTruthy();
  const table = within(section.getByRole('table'));
  expect(table.getAllByRole('columnheader').map(cell => [cell.textContent, cell.getAttribute('scope')])).toEqual([
    ['과목', 'col'], ['문항', 'col'], ['배점', 'col'], ['최소 정답', 'col'],
  ]);
  expect(table.getAllByRole('row').slice(1).map(row => Array.from(row.children).map(cell => cell.textContent))).toEqual([
    ['1과목 데이터 이해', '10', '20점', '4문항'], ['2과목 데이터 분석 기획', '10', '20점', '4문항'], ['3과목 데이터 분석', '30', '60점', '12문항'],
  ]);
  const examples = within(section.getByRole('list')).getAllByRole('listitem');
  expect(examples.map(item => item.querySelector('strong')?.textContent)).toEqual(['8 · 5 · 17문항 → 60점', '9 · 3 · 21문항 → 66점', '4 · 4 · 12문항 → 40점']);
  expect(examples.map(item => item.querySelector('span')?.textContent)).toEqual(['합격', '불합격', '불합격']);
  PASS_EXAMPLES.forEach(example => expect(section.getByText(example.reason)).toBeTruthy());
  expect(section.getByText('숫자는 1과목 · 2과목 · 3과목의 정답 수입니다. 안 푼 문제는 틀린 것으로 채점합니다.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: '이렇게 풉니다' }).compareDocumentPosition(screen.getByRole('region', { name: '합격 기준' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// 새로 만든 표본으로 화면 설명과 실제 채점의 경계값을 대조한다.
const round: RoundData = {
  formatVersion: 1, round: 1, title: '개발용 표본', timeLimitMinutes: 90,
  subjects: EXAM_SUBJECTS.map(subject => ({ id: subject.id, name: subject.name })),
  questions: EXAM_SUBJECTS.flatMap((subject, index) => Array.from({ length: subject.questionCount }, (_, offset) => ({
    number: index * 10 + offset + 1, subject: subject.id, question: '새로 만든 표본 문제',
    stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설',
  }))),
};
function answers(counts: readonly number[]) {
  return Object.fromEntries(counts.flatMap((count, index) => Array.from({ length: count }, (_, offset) => [index * 10 + offset + 1, 1])));
}
test('explanation points and thresholds match scoring at both sides of each boundary', () => {
  expect(scoreRound(round, { 1: 1 }).score).toBe(POINTS_PER_QUESTION);
  expect(scoreRound(round, answers([4, 4, 22]))).toMatchObject({ score: PASS_SCORE, passed: true });
  expect(scoreRound(round, answers([4, 4, 21])).failureReasons).toEqual(['총점 미달']);
  EXAM_SUBJECTS.forEach((subject, index) => {
    const minimum = Math.ceil(subject.questionCount * SUBJECT_PASS_PERCENT / 100);
    const counts = [10, 10, 30]; counts[index] = minimum;
    expect(scoreRound(round, answers(counts)).subjects[index].failed).toBe(false);
    counts[index]--;
    expect(scoreRound(round, answers(counts)).subjects[index].failed).toBe(true);
  });
});
test.each(PASS_EXAMPLES)('example $correctCounts matches actual scoring including reason', example => {
  const result = scoreRound(round, answers(example.correctCounts));
  expect(evaluatePassExample(example.correctCounts)).toEqual({ score: result.score, passed: result.passed });
  const index = PASS_EXAMPLES.indexOf(example);
  expect(result).toMatchObject({ score: [60, 66, 40][index], passed: index === 0,
    failureReasons: [[], ['2과목 과락'], ['총점 미달']][index] });
});

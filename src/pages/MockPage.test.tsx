import '../test/asyncQueries';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../App';
import { exams } from '../domain/exams';
import type { Exam } from '../domain/exams';
import type { RoundData } from '../data/types';

function fixture(exam: Exam): RoundData[] {
  return [49, 50].map(round => ({ formatVersion: 1, round, title: '개발 표본', timeLimitMinutes: 90,
    subjects: exam.subjects.map(({ id, name }) => ({ id, name })),
    questions: exam.subjects.flatMap(s => Array.from({ length: s.questionCount }, () => ({ number: 0, subject: s.id,
      question: '새로 만든 개발 표본', stimulus: [], choices: ['표본 하나', '표본 둘', '표본 셋', '표본 넷'] as [string, string, string, string], answer: 2 as const, explanation: '개발 표본 해설' }))).map((q, i) => ({ ...q, number: i + 1 })) }));
}
function setup(exam: Exam, path = `${exam.path}/mock`, seed?: () => void) {
  localStorage.clear();
  seed?.();
  window.location.hash = `#${path}`;
  const rounds = fixture(exam);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json')
    ? rounds.map(r => ({ round: r.round, year: 2026, title: r.title, questionCount: 50, timeLimitMinutes: 90, file: `${r.round}.json` }))
    : url.endsWith('topics.json') ? { formatVersion: 1, topics: [], questions: {} }
    : rounds.find(r => url.endsWith(`${r.round}.json`)) ?? { formatVersion: 1, rounds: {} } })));
  render(<App />);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
test.each(exams)('$name mock starts, resumes, marks originals, submits and reviews; new sampling requires confirmation', async exam => {
  setup(exam);
  await screen.findByRole('heading', { name: `${exam.name} 실전 모의고사` });
  expect(document.title).toBe(`${exam.name} 실전 모의고사`);
  const facts = screen.getByText('과목별 문항 수').closest('dl')!;
  expect(facts.classList.contains('mock-facts')).toBe(true);
  expect(facts.children).toHaveLength(4);
  expect(within(facts).getByText('49 ~ 50회 100문항')).toBeTruthy();
  expect(within(facts).getByText(exam.subjects.map(s => `${s.id}과목 ${s.questionCount}`).join(' · '))).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 시작' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 시험' });
  expect(screen.getByText(/출처 \d+회 \d+번/)).toBeTruthy();
  expect(screen.queryByText('개발 표본 해설')).toBeNull();
  const key = `${exam.recordPrefix}:mock:exam`;
  const saved = () => JSON.parse(localStorage.getItem(key)!);
  fireEvent.click(screen.getByRole('button', { name: /^2\. 표본 둘/ }));
  fireEvent.click(screen.getByRole('button', { name: /문제 표시/ }));
  const source = saved().sources[0];
  expect(screen.getByRole('button', { name: `${source[0]}회 ${source[1]}번 문제 표시` })).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(`${exam.recordPrefix}:marked`)!)[source.join(':')]).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '실전 모의고사' }));
  await screen.findByRole('button', { name: '새 모의고사 만들기' });
  expect(screen.getByText(/푼 문제 1 \/ 50/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 만들기' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));
  expect(saved().sources[0]).toEqual(source);
  fireEvent.click(screen.getByRole('link', { name: '이어서 풀기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 시험' });
  expect(screen.getByRole('button', { name: /^2\. 표본 둘/ }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '제출하고 채점' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '제출' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 결과' });
  expect(localStorage.getItem(key)).toBeNull();
  expect(screen.getByText('2점')).toBeTruthy();
  expect(screen.getByRole('link', { name: '모의고사 안내로' }).parentElement!.classList.contains('result-actions')).toBe(true);
  expect(JSON.parse(localStorage.getItem(`${exam.recordPrefix}:mock:result`)!).sources).toHaveLength(50);
  fireEvent.click(screen.getByRole('link', { name: '틀린 문제 보기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 다시 보기' });
  expect(screen.getByText('개발 표본 해설')).toBeTruthy();
  expect(screen.getByText('풀지 않음')).toBeTruthy();
  const reviewSource = JSON.parse(localStorage.getItem(`${exam.recordPrefix}:mock:result`)!).sources[1];
  expect(screen.getByRole('button', { name: `${reviewSource[0]}회 ${reviewSource[1]}번 문제 표시` })).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '실전 모의고사' }));
  const recent = await screen.findByText(/최근 결과 2점/);
  expect(recent.textContent).toMatch(/최근 결과 2점 · 불합격 · \d{4}년 \d{1,2}월 \d{1,2}일/);
  fireEvent.click(screen.getByRole('link', { name: '결과 보기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 결과' });
  expect(screen.getByRole('link', { name: '모의고사 안내로' }).getAttribute('href')).toBe(`#${exam.path}/mock`);
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 시작' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 시험' });
  expect(saved().answers).toEqual({});
  fireEvent.click(screen.getByRole('button', { name: /^2\. 표본 둘/ }));
  fireEvent.click(screen.getByRole('link', { name: '실전 모의고사' }));
  await screen.findByRole('link', { name: '결과 보기' });
  const inProgress = saved();
  fireEvent.click(screen.getByRole('link', { name: '결과 보기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 결과' });
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 시작' }));
  expect(screen.getByRole('dialog', { name: '새 모의고사 만들기 확인' })).toBeTruthy();
  expect(saved()).toEqual(inProgress);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(saved()).toEqual(inProgress);
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 시작' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '새 모의고사 만들기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 시험' });
  expect(saved().answers).toEqual({});
  fireEvent.click(screen.getByRole('link', { name: '실전 모의고사' }));
  await screen.findByRole('button', { name: '새 모의고사 만들기' });
  fireEvent.click(screen.getByRole('button', { name: '새 모의고사 만들기' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '새 모의고사 만들기' }));
  await screen.findByRole('heading', { name: '실전 모의고사 · 시험' });
  expect(saved().sources).toHaveLength(50);
  fireEvent.click(screen.getByRole('link', { name: `${exam.name} 홈` }));
  await waitFor(() => expect(screen.getByRole('link', { name: '이어서 풀기' }).getAttribute('href')).toBe(`#${exam.path}/mock/exam`));
});
test.each(exams)('$name wrong collection and note use original sources while statistics and round cards exclude mock results', async exam => {
  setup(exam, `${exam.path}/sets`, () => {
    localStorage.setItem(`${exam.recordPrefix}:mock:result`, JSON.stringify({ sources: [[50, 1], [49, 2]], answers: { 1: 1 },
      score: 0, passed: false, subjectCorrect: Object.fromEntries(exam.subjects.map(s => [s.id, 0])), elapsedSeconds: 5, submittedAt: '2026-11-03T00:00:00Z', questionCount: 2 }));
  });
  await screen.findByRole('link', { name: '틀린 문제 풀기' });
  expect(screen.getByText('2문항')).toBeTruthy();
  expect(screen.getByText(/내 풀이 기록 0문항 기준/)).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '오답 노트 ›' }));
  await screen.findByRole('heading', { name: `${exam.name} 오답 노트` });
  fireEvent.click(screen.getByRole('button', { name: '회차순' }));
  expect(document.querySelectorAll('.wrong-note-question')).toHaveLength(2);
  expect(screen.getAllByText('내 답')).toHaveLength(1);
  expect(screen.getAllByText('안 푼 문제')).toHaveLength(1);
  expect(screen.getByText(new RegExp(`50회 1번 · 1과목`))).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기로' }));
  fireEvent.click(await screen.findByRole('link', { name: '틀린 문제 풀기' }));
  await screen.findByRole('heading', { name: '모아 풀기 · 틀린 문제' });
  expect(screen.getByText('50회 1번')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^2\. 표본 둘/ }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기' }));
  await screen.findByText('1문항');
  fireEvent.click(screen.getByRole('link', { name: '회차' }));
  await screen.findByRole('heading', { name: '회차 고르기' });
  expect(screen.getAllByText('기록 없음')).toHaveLength(2);
  fireEvent.click(screen.getByRole('link', { name: '회차를 섞어 풀고 싶다면 실전 모의고사 ›' }));
  await screen.findByRole('heading', { name: `${exam.name} 실전 모의고사` });
});
test.each([false, true])('hub resumes most recently started round or mock exam (mock newer: %s)', async mockNewer => {
  const exam = exams[0];
  setup(exam, '/', () => {
    localStorage.setItem(`${exam.recordPrefix}:50:exam`, JSON.stringify({ answers: {}, current: 1,
      startedAt: mockNewer ? '2026-11-01T00:00:00Z' : '2026-11-03T00:00:00Z', elapsedSeconds: 0 }));
    localStorage.setItem(`${exam.recordPrefix}:mock:exam`, JSON.stringify({ sources: [[50, 1]], answers: {}, current: 1,
      startedAt: '2026-11-02T00:00:00Z', elapsedSeconds: 30 }));
  });
  await waitFor(() => expect(screen.getByRole('link', { name: '이어서 풀기' }).getAttribute('href')).toBe(mockNewer ? '#/adsp/mock/exam' : '#/adsp/rounds/50/exam'));
});
test('missing saved source discards record and direct exam entry returns to guide', async () => {
  setup(exams[0], '/adsp/mock/exam', () => localStorage.setItem('adsp-cbt:v1:mock:exam', JSON.stringify({ sources: [[999, 1]], answers: {}, current: 1, startedAt: '2026-11-03T00:00:00Z', elapsedSeconds: 0 })));
  await screen.findByRole('button', { name: '새 모의고사 시작' });
  expect(localStorage.getItem('adsp-cbt:v1:mock:exam')).toBeNull();
  expect(window.location.hash).toBe('#/adsp/mock');
});

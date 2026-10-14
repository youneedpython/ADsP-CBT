vi.mock('./data/loadDownloads', () => ({ loadDownloads: async () => ({ formatVersion: 1, rounds: {} }) }));
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { recordKey } from './storage/records';
import type { RoundData } from './data/types';
const sample = (round = 50, year = 2026, questionCount = 4) => ({ round, year, title: '개발 표본', questionCount, timeLimitMinutes: 30, file: `${round}.json` });
const data: RoundData = { formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 30, subjects: [{ id: 1, name: '표본 하나' }, { id: 2, name: '표본 둘' }, { id: 3, name: '표본 셋' }], questions: [1, 2, 3, 4].map(number => ({ number, subject: number === 1 ? 1 : number === 2 ? 2 : 3, question: `새로 만든 표본 문제 ${number}`, stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설' })) };
const fetchMock = vi.fn();
const respond = (value: unknown) => ({ ok: true, json: async () => value });
const practice = { answers: { 1: 2 }, current: 2 };
const exam = { ...practice, startedAt: '2026-10-11T00:00:00Z', elapsedSeconds: 60 };
const result = { answers: { 1: 1 }, score: 2, passed: false, subjectCorrect: { 1: 1, 2: 0, 3: 0 }, elapsedSeconds: 61, submittedAt: exam.startedAt, questionCount: 4 };
const save = (round: number, kind: 'practice' | 'exam' | 'result', value: unknown) => localStorage.setItem(recordKey(round, kind), JSON.stringify(value));
beforeEach(() => {
  localStorage.clear(); window.location.hash = '#/'; fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => respond(url.endsWith('rounds.json') ? [sample()] : structuredClone(data)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function footer() {
  const content = within(screen.getByRole('contentinfo'));
  expect(content.getByText('복원 문제입니다. 실제 시험과 다를 수 있습니다.')).toBeTruthy();
  expect(content.getByText('© 2026 youneedpython')).toBeTruthy();
}
test('home computes range, counts and latest from data, with no resume when records are absent', async () => {
  fetchMock.mockResolvedValue(respond([sample(37, 2024, 7), sample(53, 2026, 12)])); render(<App />);
  expect(await screen.findByText('19문항')).toBeTruthy(); expect(screen.getByText('2개')).toBeTruthy();
  expect(screen.getByText('데이터분석 준전문가(ADsP) 37회부터 53회까지의 복원 문제를 실제 시험처럼 풀고, 정답과 해설을 바로 확인합니다. 가입 없이 무료로 씁니다.')).toBeTruthy();
  expect(screen.getByRole('link', { name: '최신 53회 풀기' }).getAttribute('href')).toBe('#/rounds/53');
  expect(screen.queryByRole('heading', { name: '이어 풀기' })).toBeNull();
  const logo = screen.getByRole('link', { name: 'ADsP 기출 복원 문제' }).querySelector('img');
  expect(logo?.getAttribute('alt')).toBe(''); expect(logo?.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}favicon.svg`);
  expect(logo?.getAttribute('width')).toBe('28'); expect(logo?.getAttribute('height')).toBe('28');
  expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBe('page'); footer();
});
test('home prefers the latest started exam to practice and displays saved time without ticking', async () => {
  fetchMock.mockResolvedValue(respond([sample(48), sample(49), sample(50)]));
  save(50, 'practice', practice); save(49, 'exam', exam); save(48, 'exam', { ...exam, startedAt: '2026-10-12T00:00:00Z' });
  render(<App />); await screen.findByRole('heading', { name: '이어 풀기' });
  expect(screen.getByText('48회 · 시험')).toBeTruthy();
  expect(screen.getByText('푼 문제 1 / 4 · 남은 시간 29:00')).toBeTruthy();
  expect(screen.getByRole('link', { name: '이어서 풀기' }).getAttribute('href')).toBe('#/rounds/48/exam');
  expect(screen.getByRole('progressbar', { name: '이어 풀기 진행' }).getAttribute('value')).toBe('1');
  vi.useFakeTimers(); vi.advanceTimersByTime(60000);
  expect(screen.getByText('푼 문제 1 / 4 · 남은 시간 29:00')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(recordKey(48, 'exam'))!).elapsedSeconds).toBe(60);
});
test.each([1800, 1860])('home shows expired exam at saved elapsed %i seconds without remaining-time prefix', async elapsedSeconds => {
  save(50, 'exam', { ...exam, elapsedSeconds });
  render(<App />); await screen.findByRole('heading', { name: '이어 풀기' });
  expect(screen.getByText('푼 문제 1 / 4 · 시간 초과')).toBeTruthy();
  expect(screen.queryByText(/남은 시간/)).toBeNull();
  expect(screen.getByRole('link', { name: '이어서 풀기' }).getAttribute('href')).toBe('#/rounds/50/exam');
  expect(JSON.parse(localStorage.getItem(recordKey(50, 'exam'))!).elapsedSeconds).toBe(elapsedSeconds);
});

test('home resumes highest numbered partial practice', async () => {
  fetchMock.mockResolvedValue(respond([sample(48), sample(50)])); save(48, 'practice', practice); save(50, 'practice', practice);
  render(<App />); await screen.findByText('50회 · 연습');
  expect(screen.getByRole('link', { name: '이어서 풀기' }).getAttribute('href')).toBe('#/rounds/50/practice');
});
test('loading keeps introduction and instructions', () => {
  fetchMock.mockReturnValue(new Promise(() => {})); render(<App />);
  expect(screen.getByRole('status').textContent).toBe('문제를 불러오는 중입니다.');
  expect(screen.getByRole('heading', { name: '이렇게 풉니다' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /최신/ })).toBeNull();
  expect(screen.getByText('가입 없이 무료로 씁니다.')).toBeTruthy();
  expect(screen.queryByText(/데이터분석 준전문가/)).toBeNull();
});
test('failed home request retries successfully', async () => {
  fetchMock.mockRejectedValueOnce(new Error('표본 실패')); render(<App />);
  await screen.findByText('문제를 불러오지 못했습니다.');
  expect(screen.getByText('가입 없이 무료로 씁니다.')).toBeTruthy();
  expect(screen.queryByText(/데이터분석 준전문가/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('link', { name: '최신 50회 풀기' }); expect(fetchMock).toHaveBeenCalledTimes(2);
});
test.each(['#/', '#/rounds'])('empty %s omits latest/range and shows empty message', async hash => {
  window.location.hash = hash; fetchMock.mockResolvedValue(respond([])); render(<App />);
  await screen.findByText('아직 등록된 회차가 없습니다.'); expect(screen.queryByRole('link', { name: /최신/ })).toBeNull(); expect(screen.queryByText(/회부터/)).toBeNull(); footer();
  if (hash === '#/') {
    expect(screen.getByText('가입 없이 무료로 씁니다.')).toBeTruthy();
    expect(screen.queryByText(/데이터분석 준전문가/)).toBeNull();
  }
});
test('round list groups newest years and cards, uses full card links and removes notice box', async () => {
  window.location.hash = '#/rounds'; fetchMock.mockImplementation(async (url: string) => respond(url.endsWith('rounds.json') ? [sample(47, 2025), sample(49), sample(46, 2025), sample(50)] : structuredClone(data)));
  render(<App />); await screen.findByRole('heading', { name: '2026년' });
  expect(screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual(['2026년', '2025년']);
  expect(screen.getAllByRole('listitem').map(node => within(node).getByRole('link').getAttribute('href'))).toEqual(['#/rounds/50', '#/rounds/49', '#/rounds/47', '#/rounds/46']);
  expect(screen.getByRole('link', { name: '50회, 4문항 30분, 기록 없음' })).toBeTruthy(); expect(screen.queryByRole('complementary')).toBeNull();
  expect(screen.getByText('풀이 기록은 이 브라우저에만 저장됩니다.')).toBeTruthy();
  expect(screen.getByRole('link', { name: '회차' }).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('link', { name: '50회, 4문항 30분, 기록 없음' })); await screen.findByRole('heading', { name: 'ADsP 50회 복원 문제' }); footer();
});
test('round info defaults to practice, switches radio/start link, and derives subject counts and thresholds', async () => {
  window.location.hash = '#/rounds/50'; render(<App />); await screen.findByRole('heading', { name: 'ADsP 50회 복원 문제' });
  expect((screen.getByRole('radio', { name: /^연습/ }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('link', { name: '연습 시작' }).getAttribute('href')).toBe('#/rounds/50/practice');
  expect(screen.getByText('아직 기록이 없습니다.')).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /^시험/ }));
  expect(screen.getByRole('link', { name: '시험 시작' }).getAttribute('href')).toBe('#/rounds/50/exam');
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  expect(rows.map(row => Array.from(row.children).map(cell => cell.textContent))).toEqual([['1과목 표본 하나', '1', '1문항'], ['2과목 표본 둘', '1', '1문항'], ['3과목 표본 셋', '2', '1문항']]);
  footer();
});
test.each(['practice', 'exam', 'result'] as const)('round info renders %s record and appropriate start', async kind => {
  save(50, kind, kind === 'practice' ? practice : kind === 'exam' ? exam : result);
  window.location.hash = '#/rounds/50'; render(<App />); await screen.findByRole('heading', { name: '내 기록' });
  if (kind === 'practice') { expect(screen.getByText('연습 1 / 4')).toBeTruthy(); expect(screen.getByRole('link', { name: '연습 이어 풀기' }).getAttribute('href')).toBe('#/rounds/50/practice'); }
  if (kind === 'exam') { expect((screen.getByRole('radio', { name: /^시험/ }) as HTMLInputElement).checked).toBe(true); expect(screen.getByText('시험 1 / 4 진행 중 · 남은 시간 29:00')).toBeTruthy(); expect(screen.getByRole('link', { name: '시험 이어 풀기' }).getAttribute('href')).toBe('#/rounds/50/exam'); fireEvent.click(screen.getByRole('radio', { name: /^연습/ })); expect(screen.getByRole('link', { name: '연습 시작' })).toBeTruthy(); }
  if (kind === 'result') { expect(screen.getByText('2점')).toBeTruthy(); expect(screen.getByText('불합격')).toBeTruthy(); expect(screen.getByText('최근 시험 · 걸린 시간 1:01 · 1과목 1 / 1 · 2과목 0 / 1 · 3과목 0 / 2')).toBeTruthy(); expect(screen.getByRole('link', { name: '틀린 문제 다시 보기' }).getAttribute('href')).toBe('#/rounds/50/review?filter=wrong'); expect(screen.getByRole('link', { name: '결과 보기' }).getAttribute('href')).toBe('#/rounds/50/result'); }
});
test('round info shows simultaneous records, overtime, saved subject results and perfect review link', async () => {
  save(50, 'exam', { ...exam, elapsedSeconds: 1800 }); save(50, 'practice', practice); save(50, 'result', { ...result, answers: { 1: 1, 2: 1, 3: 1, 4: 1 }, passed: true, score: 8, subjectCorrect: { 1: 0, 2: 1, 3: 2 } });
  window.location.hash = '#/rounds/50'; render(<App />); await screen.findByText('8점');
  expect(screen.getByText('합격')).toBeTruthy();
  expect(screen.getByText('시험 1 / 4 진행 중 · 시간 초과')).toBeTruthy(); expect(screen.getByText('연습 1 / 4')).toBeTruthy();
  expect(screen.getByText(/1과목 0 \/ 1/)).toBeTruthy(); expect(screen.getByRole('link', { name: '다시 보기' }).getAttribute('href')).toBe('#/rounds/50/review');
});
test.each(['practice', 'exam', 'result', 'review'])('existing %s screen keeps footer and main navigation', async page => {
  window.location.hash = `#/rounds/50/${page}`; render(<App />);
  if (page === 'exam' || page === 'practice') { await screen.findByRole('heading', { name: `50회 · ${page === 'exam' ? '시험' : '연습'}` }); await waitFor(() => expect(window.location.hash).toContain('q=1')); }
  else await screen.findByText('시험 기록이 없습니다.');
  footer(); expect(screen.getByRole('link', { name: '회차' }).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('link', { name: 'ADsP 기출 복원 문제' })); await screen.findByRole('link', { name: '최신 50회 풀기' });
});
test.each(['#/rounds/999', '#/rounds/999/practice'])('unknown round %s provides rounds link and footer', async hash => {
  window.location.hash = hash; render(<App />); await screen.findByText('없는 회차입니다.');
  expect(screen.getByRole('link', { name: '회차 목록으로' }).getAttribute('href')).toBe('#/rounds'); footer();
});
test('unknown routes redirect to home', async () => {
  window.location.hash = '#/unknown'; render(<App />); await screen.findByRole('link', { name: '최신 50회 풀기' }); await waitFor(() => expect(window.location.hash).toBe('#/'));
});

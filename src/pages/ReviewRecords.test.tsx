vi.mock('../data/loadDownloads', () => ({ loadDownloads: async () => ({ formatVersion: 1, rounds: {} }) }));
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import type { Question, RoundData } from '../data/types';
import { recordKey } from '../storage/records';

vi.mock('katex', () => ({ default: { renderToString: (text: string) =>
  `<span>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` } }));
const data: RoundData = { formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 90,
  subjects: [{ id: 1, name: '표본 과목' }],
  questions: [1, 2, 3, 4].map((number): Question => ({ number, subject: 1,
    question: `표본 문제 ${number} <b>글</b>`, stimulus: [], choices: ['가', '나', '다', '라'],
    answer: 2, explanation: `표본 해설 ${number} <script>글</script>` })) };
const summary = (round: number) => ({ round, year: 2026, title: '개발 표본', questionCount: 4, timeLimitMinutes: 90, file: `${round}.json` });
const result = (answers: Record<number, number> = { 1: 2, 2: 1, 4: 2 }, passed = false) => ({
  answers, score: passed ? 8 : 4, passed, subjectCorrect: { 1: 2, 2: 0, 3: 0 },
  elapsedSeconds: 30, submittedAt: '2026-10-11T00:00:00Z', questionCount: 4 });
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear(); window.location.hash = '#/rounds/50/review';
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () =>
    url.endsWith('rounds.json') ? [summary(50)] : structuredClone(data) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function ready(answers?: Record<number, number>) {
  localStorage.setItem(recordKey(50, 'result'), JSON.stringify(result(answers)));
  render(<App />); await screen.findByRole('heading', { name: '50회 · 다시 보기' });
  await waitFor(() => expect(window.location.hash).toMatch(/q=\d+/));
}
test('missing result offers an exam', async () => {
  render(<App />);
  expect(await screen.findByText('시험 기록이 없습니다.')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('link', { name: '시험 시작' }).getAttribute('href')).toBe('#/rounds/50/exam'));
});
test('review keyboard ignores numbers and stays within wrong scope with pressed state', async () => {
  await ready();
  const all = screen.getByRole('button', { name: '전체 4' });
  const wrong = screen.getByRole('button', { name: '틀린 문제 2' });
  await waitFor(() => expect(all.getAttribute('aria-pressed')).toBe('true'));
  expect(fireEvent.keyDown(window, { key: '1' })).toBe(true);
  expect(await screen.findByRole('button', { name: '2. 나 정답 내 답' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'ArrowLeft' }); await waitFor(() => expect(window.location.hash).toContain('q=1'));
  fireEvent.keyDown(window, { key: 'ArrowRight' }); await waitFor(() => expect(window.location.hash).toContain('q=2'));
  fireEvent.click(wrong);
  await waitFor(() => expect(wrong.getAttribute('aria-pressed')).toBe('true')); await waitFor(() => expect(all.getAttribute('aria-pressed')).toBe('false'));
  fireEvent.keyDown(window, { key: 'ArrowLeft' }); await waitFor(() => expect(window.location.hash).toContain('q=2'));
  fireEvent.keyDown(window, { key: 'ArrowRight' }); await waitFor(() => expect(window.location.hash).toContain('q=3'));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^3\. 표본 문제/ })));
  fireEvent.keyDown(window, { key: 'ArrowRight' }); await waitFor(() => expect(window.location.hash).toContain('q=3'));
});
test('all scope shows correct and own answers, explanations and unanswered questions safely', async () => {
  await ready();
  expect(await screen.findByText('전체 1 / 4')).toBeTruthy();
  expect(await screen.findByRole('button', { name: '전체 4' })).toBeTruthy();
  expect(await screen.findByRole('button', { name: '틀린 문제 2' })).toBeTruthy();
  expect(await screen.findByRole('button', { name: '2. 나 정답 내 답' })).toBeTruthy();
  const article = screen.getByRole('article');
  await waitFor(() => expect(article.querySelector('b, script')).toBeNull());
  await waitFor(() => expect(article.textContent).toContain('<b>글</b>'));
  expect(await screen.findByRole('heading', { name: '해설' })).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true));
  for (const button of within(article).getAllByRole('button', { name: /^[1-4]\./ })) await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: '1. 가' }));
  expect(await screen.findByRole('button', { name: '2. 나 정답 내 답' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(await screen.findByRole('button', { name: '1. 가 내 답' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(await screen.findByText('풀지 않음')).toBeTruthy();
  expect(await screen.findByRole('button', { name: '2. 나 정답' })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('link', { name: '결과로' }).getAttribute('href')).toBe('#/rounds/50/result'));
});
test.each([
  ['', 2], ['&q=2', 2], ['&q=3', 3], ['&q=1', 2], ['&q=999', 2], ['&q=abc', 2],
])('wrong scope normalizes query %s', async (query, expected) => {
  window.location.hash = `#/rounds/50/review?filter=wrong${query}`;
  await ready();
  expect(await screen.findByText(`틀린 문제 ${expected === 2 ? 1 : 2} / 2`)).toBeTruthy();
  await waitFor(() => expect(window.location.hash).toBe(`#/rounds/50/review?filter=wrong&q=${expected}`));
});
test('scope switching resets to first and navigation stays in scope', async () => {
  window.location.hash = '#/rounds/50/review?q=4'; await ready();
  fireEvent.click(screen.getByRole('button', { name: '틀린 문제 2' }));
  expect(await screen.findByText('틀린 문제 1 / 2')).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(window.location.hash).toContain('filter=wrong&q=3'));
  await waitFor(() => expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: '이전' }));
  expect(await screen.findByText('틀린 문제 1 / 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '전체 4' }));
  await waitFor(() => expect(window.location.hash).toBe('#/rounds/50/review?q=1'));
});
test('all correct disables wrong scope and falls back to all', async () => {
  window.location.hash = '#/rounds/50/review?filter=wrong';
  await ready({ 1: 2, 2: 2, 3: 2, 4: 2 });
  expect(await screen.findByText('전체 1 / 4')).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', { name: '틀린 문제 0' }) as HTMLButtonElement).disabled).toBe(true));
  await waitFor(() => expect(window.location.hash).toBe('#/rounds/50/review?q=1'));
});
test('list displays independent records and uses summaries without loading round files', async () => {
  window.location.hash = '#/rounds';
  fetchMock.mockResolvedValue({ ok: true, json: async () => [50, 49, 48, 47, 46, 45].map(summary) });
  localStorage.setItem(recordKey(49, 'exam'), JSON.stringify({ answers: { 1: 2, 3: 1 }, current: 3, elapsedSeconds: 1800, startedAt: '2026-10-11T00:00:00Z' }));
  localStorage.setItem(recordKey(48, 'result'), JSON.stringify(result({}, true)));
  localStorage.setItem(recordKey(47, 'result'), JSON.stringify(result()));
  localStorage.setItem(recordKey(46, 'exam'), JSON.stringify({ answers: { 1: 1 }, current: 2, elapsedSeconds: 5400, startedAt: '2026-10-11T00:00:00Z' }));
  localStorage.setItem(recordKey(46, 'result'), JSON.stringify(result()));
  localStorage.setItem(recordKey(45, 'result'), 'invalid');
  render(<App />); await screen.findByRole('link', { name: '50회, 4문항 90분, 기록 없음' });
  await screen.findByRole('link', { name: '49회, 4문항 90분, 시험 2 / 4' });
  const cards = screen.getAllByRole('listitem');
  await waitFor(() => expect(within(cards[0]).getByText('기록 없음')).toBeTruthy());
  await waitFor(() => expect(within(cards[0]).queryByText('결과 보기')).toBeNull());
  await waitFor(() => expect(within(cards[1]).getByText('시험 2 / 4')).toBeTruthy());
  await waitFor(() => expect(within(cards[2]).getByText('8점 합격')).toBeTruthy());
  await waitFor(() => expect(within(cards[3]).getByText('4점 불합격')).toBeTruthy());
  await waitFor(() => expect(within(cards[4]).getByText('시험 1 / 4')).toBeTruthy());
  await waitFor(() => expect(screen.getByRole('link', { name: '46회, 4문항 90분, 시험 1 / 4' }).getAttribute('href')).toBe('#/rounds/46'));
  expect(await screen.findByRole('link', { name: '48회, 4문항 90분, 8점 합격' })).toBeTruthy();
  await waitFor(() => expect(within(cards[5]).getByText('기록 없음')).toBeTruthy());
  await waitFor(() => expect(localStorage.getItem(recordKey(45, 'result'))).toBeNull());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
});

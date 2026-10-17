import '../test/asyncQueries';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { rounds, summaries, topics } from '../test/setFixtures';

const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json') ? summaries : url.endsWith('topics.json') ? topics : rounds.find(round => url.endsWith(`${round.round}.json`)) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open(path: string) {
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
  await screen.findByRole('heading', { name: /^1\. 표본|^3\. 표본/ });
}
function confirm() {
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
}
test('practice reveals related questions after confirmation and reuses topics across round and set navigation', async () => {
  localStorage.setItem('adsp-cbt:v1:49:practice', JSON.stringify({ current: 2, answers: {} }));
  await open('/rounds/50/practice?q=1');
  expect(screen.queryByRole('region', { name: /^관련 문제/ })).toBeNull();
  confirm();
  const panel = await screen.findByRole('region', { name: '관련 문제 · 표본 주제 하나' });
  expect(within(panel).getByText('출제 빈도 높음')).toBeTruthy();
  const details = within(panel).getByText('2개 회차 중 2회 · 2문항');
  expect(details.tagName).toBe('P');
  expect(details.previousElementSibling?.textContent).toBe('출제 빈도 높음');
  expect(within(panel).getByRole('img', { name: '2개 회차 중 2회 출제' })).toBeTruthy();
  const current = within(panel).getByRole('button', { name: '50회 1번' }) as HTMLButtonElement;
  expect(current.disabled).toBe(true);
  expect(current.getAttribute('aria-current')).toBe('true');
  expect(within(panel).getByRole('link', { name: '49회 1번' }).getAttribute('href')).toBe('#/rounds/49/practice?q=1');
  expect(within(panel).getByRole('link', { name: '이 주제 2문항 모아 풀기' }).getAttribute('href')).toBe('#/sets/topic/T101');
  fireEvent.click(within(panel).getByRole('link', { name: '49회 1번' }));
  await screen.findByRole('heading', { name: '1. 표본 49-1' });
  await waitFor(() => expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:49:practice')!).current).toBe(1));
  confirm();
  const next = await screen.findByRole('region', { name: '관련 문제 · 표본 주제 하나' });
  fireEvent.click(within(next).getByRole('link', { name: '이 주제 2문항 모아 풀기' }));
  await screen.findByRole('heading', { name: '모아 풀기 · 표본 주제 하나' });
  confirm();
  await screen.findByRole('region', { name: /^관련 문제/ });
  expect(screen.queryByRole('link', { name: /^이 주제/ })).toBeNull();
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('topics.json'))).toHaveLength(1);
});
test('review shows the panel for an unanswered question; exam never requests topics', async () => {
  localStorage.setItem('adsp-cbt:v1:50:result', JSON.stringify({ answers: {}, score: 0, subjectCorrect: { 1: 0, 2: 0, 3: 0 }, passed: false, elapsedSeconds: 5, submittedAt: '2026-10-14T00:00:00Z', questionCount: 3 }));
  await open('/rounds/50/review?q=1');
  await screen.findByRole('region', { name: /^관련 문제/ });
  expect(screen.getByText('풀지 않음')).toBeTruthy();
  cleanup();
  fetchMock.mockClear();
  await open('/rounds/50/exam?q=1');
  expect(screen.queryByRole('region', { name: /^관련 문제/ })).toBeNull();
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith('topics.json'))).toBe(false);
});
test('topic failure hides only the panel and practice can continue', async () => {
  const successful = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string) => url.endsWith('topics.json') ? Promise.reject(Error('sample topic failure')) : successful(url));
  await open('/rounds/50/practice?q=1');
  confirm();
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith('topics.json'))).toBe(true));
  expect(screen.queryByRole('region', { name: /^관련 문제/ })).toBeNull();
  expect(screen.getByText('맞았습니다.')).toBeTruthy();
  expect(screen.getByRole('link', { name: '50회 1번 문제 오류 신고' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByRole('heading', { name: '2. 표본 50-2' });
});
test('explicit set retry can recover a failed shared topic request', async () => {
  const successful = fetchMock.getMockImplementation()!;
  let failed = false;
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('topics.json') && !failed) { failed = true; return Promise.reject(Error('sample topic failure')); }
    return successful(url);
  });
  window.history.replaceState(null, '', '#/sets');
  render(<App />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('자주 나오는 주제부터');
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('topics.json'))).toHaveLength(2);
});
test('a single-question topic still shows its current question and subject sets offer topic practice', async () => {
  await open('/sets/subject/1');
  confirm();
  await screen.findByRole('link', { name: '이 주제 2문항 모아 풀기' });
  cleanup();
  window.history.replaceState(null, '', '#/rounds/50/practice?q=2');
  render(<App />);
  await screen.findByRole('heading', { name: '2. 표본 50-2' });
  confirm();
  const panel = await screen.findByRole('region', { name: '관련 문제 · 표본 주제 둘' });
  expect(within(panel).getAllByRole('button')).toHaveLength(1);
  expect(within(panel).getByText('출제 빈도 보통')).toBeTruthy();
  expect(within(panel).getByText('2개 회차 중 1회 · 1문항')).toBeTruthy();
});

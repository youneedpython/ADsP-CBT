import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { rounds, summaries, topics } from '../test/setFixtures';
const time = '2026-10-14T00:00:00Z';
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json') ? summaries : url.endsWith('topics.json') ? topics : rounds.find(round => url.endsWith(`${round.round}.json`)) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function ready(path: string) {
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
  await screen.findByRole('button', { name: '50회 1번 문제 표시' });
  await waitFor(() => expect(window.location.hash).toContain('q=1'));
}
test.each(['practice', 'exam', 'review'])('marks toggle, persist and never alter answers in %s', async mode => {
  if (mode === 'review') localStorage.setItem('adsp-cbt:v1:50:result', JSON.stringify({ answers: { 1: 2 }, score: 2, subjectCorrect: { 1: 1, 2: 0, 3: 0 }, passed: false, elapsedSeconds: 1, submittedAt: time, questionCount: 3 }));
  await ready(`/rounds/50/${mode}`);
  const before = localStorage.getItem(`adsp-cbt:v1:50:${mode === 'review' ? 'result' : mode}`);
  const button = screen.getByRole('button', { name: '50회 1번 문제 표시' });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(button);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.textContent).toBe('★ 표시함');
  expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:marked')!)['50:1']).toEqual(expect.any(String));
  if (mode !== 'review') {
    const board = screen.getByRole('button', { name: '1번, 안 푼 문제, 현재 문제, 표시한 문제' });
    expect(board.querySelector('.board-star')?.textContent).toBe('★');
    expect(screen.getByText('표시한 문제')).toBeTruthy();
    expect(screen.queryByText('정답')).toBeNull();
    expect(screen.queryByRole('heading', { name: '해설' })).toBeNull();
  }
  fireEvent.keyDown(window, { key: 'S' });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:marked')!)).toEqual({});
  fireEvent.keyDown(window, { key: 's' });
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem(`adsp-cbt:v1:50:${mode === 'review' ? 'result' : mode}`)).toBe(before);
  cleanup();
  await ready(`/rounds/50/${mode}`);
  expect(screen.getByRole('button', { name: '50회 1번 문제 표시' }).getAttribute('aria-pressed')).toBe('true');
});
test('S ignores inputs, modifiers and an open question board', async () => {
  await ready('/rounds/50/practice');
  const button = screen.getByRole('button', { name: '50회 1번 문제 표시' });
  const input = document.createElement('input');
  document.body.append(input);
  fireEvent.keyDown(input, { key: 's' });
  input.remove();
  fireEvent.keyDown(window, { key: 's', ctrlKey: true });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: '문항 번호판' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.keyDown(within(dialog).getByRole('button', { name: '닫기' }), { key: 's' });
  expect(localStorage.getItem('adsp-cbt:v1:marked')).toBeNull();
});
test('marked set is sorted and frozen after unmarking, and excludes removed marks on reopening', async () => {
  localStorage.setItem('adsp-cbt:v1:marked', JSON.stringify({ '49:1': time, '50:2': time, '50:1': time }));
  window.history.replaceState(null, '', '#/sets');
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: '표시한 문제 풀기' }));
  await screen.findByText('50회 1번');
  expect(screen.getByText('1 / 3')).toBeTruthy();
  fireEvent.keyDown(window, { key: 's' });
  expect(screen.getByRole('button', { name: '50회 1번 문제 표시' }).getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  expect((await screen.findByRole('status')).textContent).toBe('맞았습니다.');
  expect(screen.getByText('1 / 3')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByText('50회 2번');
  await waitFor(() => expect(window.location.hash).toContain('q=2'));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByText('49회 1번');
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기로' }));
  fireEvent.click(await screen.findByRole('link', { name: '표시한 문제 풀기' }));
  await screen.findByText('50회 2번');
  expect(screen.getByText('1 / 2')).toBeTruthy();
});
test('zero marks disables the card and direct navigation offers a return link', async () => {
  window.history.replaceState(null, '', '#/sets');
  render(<App />);
  expect((await screen.findByRole('button', { name: '표시한 문제 풀기' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('표시한 문제가 없습니다.')).toBeTruthy();
  expect(screen.getByText('문제를 더 풀면 먼저 공부할 주제를 알려 드립니다. 주제별로 3문항 이상 풀어야 정답률이 나옵니다.')).toBeTruthy();
  expect(within(screen.getByRole('table')).getAllByText('아직 안 풂')).toHaveLength(3);
  cleanup();
  window.history.replaceState(null, '', '#/sets/marked');
  render(<App />);
  await screen.findByText('풀 문제가 없습니다.');
  expect(screen.getByRole('link', { name: '모아 풀기로' })).toBeTruthy();
});
test('weak topic card and table include rounded accuracy, counts and red low accuracy', async () => {
  localStorage.setItem('adsp-cbt:v1:49:practice', JSON.stringify({ current: 1, answers: { 1: 2, 2: 1, 3: 2 } }));
  localStorage.setItem('adsp-cbt:v1:50:practice', JSON.stringify({ current: 1, answers: { 3: 1 } }));
  window.history.replaceState(null, '', '#/sets');
  render(<App />);
  await screen.findByText('33%');
  expect(screen.getByText('풀어 본 3문항 중 1문항 정답')).toBeTruthy();
  expect(screen.getByText(/내 풀이 기록 4문항 기준/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '3문항 모아 풀기' }).getAttribute('href')).toBe('#/sets/topic/T301');
  const table = screen.getByRole('table');
  expect(within(table).getByText('33% (3문항 풂)').className).toBe('low-accuracy');
  expect(within(table).getByText('1문항 풂')).toBeTruthy();
});
test('blocked persistence keeps marks while navigating and reports memory-only saving', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
  await ready('/rounds/50/practice');
  fireEvent.keyDown(window, { key: 's' });
  await screen.findByText('이 브라우저에서는 풀이 기록을 저장할 수 없습니다.');
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기' }));
  fireEvent.click(await screen.findByRole('link', { name: '표시한 문제 풀기' }));
  expect((await screen.findByRole('button', { name: '50회 1번 문제 표시' })).getAttribute('aria-pressed')).toBe('true');
});
test('marked set accepts its ordinal q address and clamps invalid positions', async () => {
  localStorage.setItem('adsp-cbt:v1:marked', JSON.stringify({ '50:1': time, '49:1': time }));
  window.history.replaceState(null, '', '#/sets/marked?q=2');
  render(<App />);
  await screen.findByText('49회 1번');
  expect(screen.getByText('2 / 2')).toBeTruthy();
  cleanup();
  window.history.replaceState(null, '', '#/sets/marked?q=999');
  render(<App />);
  await screen.findByText('50회 1번');
  await waitFor(() => expect(window.location.hash).toBe('#/sets/marked?q=1'));
});
test('table accuracy at and above 50 percent uses the secondary text color', async () => {
  localStorage.setItem('adsp-cbt:v1:49:practice', JSON.stringify({ current: 1, answers: { 2: 2, 3: 2 } }));
  localStorage.setItem('adsp-cbt:v1:50:practice', JSON.stringify({ current: 1, answers: { 3: 1 } }));
  window.history.replaceState(null, '', '#/sets');
  render(<App />);
  const accuracy = await screen.findByText('66% (3문항 풂)');
  expect(accuracy.classList.contains('low-accuracy')).toBe(false);
});

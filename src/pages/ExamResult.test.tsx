import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import type { Question, RoundData } from '../data/types';
import { recordKey } from '../storage/records';

vi.mock('katex', () => ({ default: { renderToString: (text: string) => `<span>${text}</span>` } }));
const data: RoundData = {
  formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 90,
  subjects: [{ id: 1, name: '데이터 이해' }, { id: 2, name: '데이터 분석 기획' }, { id: 3, name: '데이터 분석' }],
  questions: Array.from({ length: 50 }, (_, index): Question => ({ number: index + 1, subject: index < 10 ? 1 : index < 20 ? 2 : 3,
    question: `개발 표본 문제 ${index + 1}`, stimulus: [], choices: ['표본 하나', '표본 둘', '표본 셋', '표본 넷'], answer: 2, explanation: '숨겨야 하는 표본 해설' })),
};
const startedAt = '2026-10-11T03:00:00.000Z';
function exam(answers: Record<number, number> = {}, current = 1, start = startedAt) {
  localStorage.setItem(recordKey(50, 'exam'), JSON.stringify({ answers, current, startedAt: start }));
}
function result(answers: Record<number, number>, elapsedSeconds = 3667) {
  // Deliberately stale aggregates prove that the screen scores the saved answers again.
  localStorage.setItem(recordKey(50, 'result'), JSON.stringify({ answers, score: 0, passed: false, subjectCorrect: { 1: 0, 2: 0, 3: 0 }, elapsedSeconds, submittedAt: startedAt, questionCount: 50 }));
}
const answersFor = (numbers: number[]) => Object.fromEntries(numbers.map(number => [number, 2]));
const all = Array.from({ length: 50 }, (_, i) => i + 1);
beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/rounds/50/exam';
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json')
    ? [{ round: 50, title: '개발 표본', questionCount: 50, timeLimitMinutes: 90, file: '50.json' }] : structuredClone(data) })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function ready() {
  render(<App />);
  await screen.findByRole('heading', { name: '50회 · 시험' });
  await waitFor(() => expect(window.location.hash).toMatch(/q=\d+/));
}
const readExam = () => JSON.parse(localStorage.getItem(recordKey(50, 'exam'))!);
const choice = (number: number) => screen.getByRole('button', { name: new RegExp(`^${number}\\. 표본`) });
const openSubmit = () => fireEvent.click(screen.getByRole('button', { name: '제출하고 채점' }));

test('exam keyboard toggles choices and submit dialog traps and restores focus', async () => {
  await ready();
  fireEvent.keyDown(window, { key: '2', code: 'Numpad2' });
  await waitFor(() => expect(readExam().answers).toEqual({ 1: 2 }));
  fireEvent.keyDown(window, { key: '2' });
  await waitFor(() => expect(readExam().answers).toEqual({}));
  fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: '3' });
  await waitFor(() => expect(readExam().answers).toEqual({ 1: 3 }));
  fireEvent.keyDown(window, { key: 'ArrowLeft' }); await waitFor(() => expect(readExam().current).toBe(1));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: '2. 개발 표본 문제 2' })));
  const opener = screen.getByRole('button', { name: '제출하고 채점' });
  opener.focus(); openSubmit();
  const buttons = within(await screen.findByRole('dialog')).getAllByRole('button');
  await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  const dialog = await screen.findByRole('dialog');
  dialog.setAttribute('tabindex', '-1');
  dialog.focus();
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  await waitFor(() => expect(document.activeElement).toBe(buttons.at(-1)));
  dialog.focus();
  fireEvent.keyDown(dialog, { key: 'Tab' });
  await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  fireEvent.keyDown(buttons[0], { key: 'Tab' }); await waitFor(() => expect(document.activeElement).toBe(buttons[1]));
  fireEvent.keyDown(buttons[1], { key: 'Tab' }); await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  fireEvent.keyDown(buttons[0], { key: 'Tab', shiftKey: true }); await waitFor(() => expect(document.activeElement).toBe(buttons[1]));
  fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: 'ArrowRight' });
  await waitFor(() => expect(readExam().current).toBe(2)); await waitFor(() => expect(readExam().answers).toEqual({ 1: 3 }));
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => expect(document.activeElement).toBe(opener));
});
test('creates a record and saves choice, change, deselection without answer leakage', async () => {
  await ready();
  await waitFor(() => expect(readExam().current).toBe(1));
  await waitFor(() => expect(Number.isFinite(Date.parse(readExam().startedAt))).toBe(true));
  fireEvent.click(choice(1));
  await waitFor(() => expect(readExam().answers).toEqual({ 1: 1 }));
  await waitFor(() => expect(choice(1).getAttribute('aria-pressed')).toBe('true'));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: '1. 표본 하나' })).toBe(choice(1));
    expect(choice(1).textContent).toBe('1. 표본 하나');
    expect(screen.queryByText('선택됨')).toBeNull();
    for (const number of [2, 3, 4]) expect(choice(number).getAttribute('aria-pressed')).toBe('false');
  });
  fireEvent.click(choice(2));
  await waitFor(() => expect(readExam().answers).toEqual({ 1: 2 }));
  await waitFor(() => {
    expect(choice(1).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: '2. 표본 둘' }).getAttribute('aria-pressed')).toBe('true');
  });
  expect(await screen.findByText('푼 문제 1 / 50')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('progressbar', { name: '푼 문제 진행' }).getAttribute('value')).toBe('1'));
  expect(await screen.findByRole('button', { name: '1번, 푼 문제, 현재 문제' })).toBeTruthy();
  await waitFor(() => expect(screen.queryByText('정답')).toBeNull());
  await waitFor(() => expect(screen.queryByText('내 답')).toBeNull());
  await waitFor(() => expect(screen.queryByText('숨겨야 하는 표본 해설')).toBeNull());
  await waitFor(() => expect(screen.queryByRole('heading', { name: '해설' })).toBeNull());
  fireEvent.click(choice(2));
  await waitFor(() => expect(readExam().answers).toEqual({}));
  await waitFor(() => expect(choice(2).getAttribute('aria-pressed')).toBe('false'));
});
test('zero seconds exposes the warning in text', async () => {
  exam();
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(startedAt) + 90 * 60 * 1000);
  await ready();
  expect(await screen.findByText('남은 시간 0:00 · 10분 이하')).toBeTruthy();
  expect((await screen.findByRole('alert')).textContent).toContain('시간이 끝났습니다.');
});
test('resumes answers, current question and start; explicit query wins and movement persists', async () => {
  exam({ 2: 3 }, 2);
  await ready();
  await waitFor(() => expect(window.location.hash).toContain('q=2'));
  await waitFor(() => expect(choice(3).getAttribute('aria-pressed')).toBe('true'));
  await waitFor(() => expect(readExam().startedAt).toBe(startedAt));
  fireEvent.click(screen.getByRole('button', { name: '50번, 안 푼 문제' }));
  await waitFor(() => expect(readExam().current).toBe(50));
  await waitFor(() => expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: '이전' }));
  await waitFor(() => expect(readExam().current).toBe(49));
  fireEvent.click(screen.getByRole('button', { name: '1번, 안 푼 문제' }));
  await waitFor(() => expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true));
  cleanup();
  window.location.hash = '#/rounds/50/exam?q=3';
  await ready();
  await waitFor(() => expect(readExam().current).toBe(3));
});
test('ticks, warns, alerts once, shows overtime, never auto submits and clears timer', async () => {
  exam({}, 1, new Date(Date.now() - (80 * 60 - 1) * 1000).toISOString());
  await ready();
  vi.useFakeTimers();
  // Remount so the interval itself belongs to the fake clock.
  cleanup();
  render(<App />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('남은 시간 10:01')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.getByText('남은 시간 10:00 · 10분 이하')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(600000); });
  expect(screen.getByRole('alert').textContent).toContain('시간이 끝났습니다. 계속 풀거나 제출할 수 있습니다.');
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '닫기' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('초과 0:01')).toBeTruthy();
  expect(screen.queryByText(/10분 이하/)).toBeNull();
  expect(screen.queryByLabelText('남은 시간, 10분 이하')).toBeNull();
  expect(localStorage.getItem(recordKey(50, 'result'))).toBeNull();
  expect(vi.getTimerCount()).toBe(1);
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
});
test('already expired exam alerts once on entry', async () => {
  exam({}, 1, new Date(Date.now() - 91 * 60 * 1000).toISOString());
  await ready();
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '닫기' }));
  fireEvent.click(choice(2));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
test('confirmation supports cancel, Escape and both prompts', async () => {
  await ready();
  openSubmit();
  await waitFor(() => expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true'));
  expect(await screen.findByText('안 푼 문제가 50개 있습니다. 제출할까요?')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  openSubmit();
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  cleanup(); exam(answersFor(all)); await ready(); openSubmit();
  expect(await screen.findByText('제출하고 채점할까요?')).toBeTruthy();
});
test('submission saves all result fields, deletes exam and replaces history', async () => {
  exam(answersFor(all));
  const submissionTime = Date.parse(startedAt) + 3667000;
  vi.spyOn(Date, 'now').mockReturnValue(submissionTime);
  const replace = vi.spyOn(window.history, 'replaceState');
  await ready();
  const before = Date.now();
  openSubmit(); fireEvent.click(screen.getByRole('button', { name: '제출' }));
  await screen.findByText('100점');
  const saved = JSON.parse(localStorage.getItem(recordKey(50, 'result'))!);
  expect(saved).toMatchObject({ answers: answersFor(all), score: 100, passed: true, subjectCorrect: { 1: 10, 2: 10, 3: 30 }, questionCount: 50 });
  expect(saved.elapsedSeconds).toBe(3667);
  expect(Date.parse(saved.submittedAt)).toBeGreaterThanOrEqual(before);
  await waitFor(() => expect(localStorage.getItem(recordKey(50, 'exam'))).toBeNull());
  await waitFor(() => expect(window.location.hash).toBe('#/rounds/50/result'));
  await waitFor(() => expect(replace.mock.calls.some(call => String(call[2]).includes('/result'))).toBe(true));
});
test.each(['access', 'write'])('unavailable %s storage still submits and renders memory result', async failure => {
  if (failure === 'access') vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
  else vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  window.location.hash = '#/rounds/50/exam?q=1';
  await ready();
  expect(await screen.findByText('이 브라우저에서는 풀이 기록을 저장할 수 없습니다.')).toBeTruthy();
  fireEvent.click(choice(2)); openSubmit(); fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(await screen.findByText('2점')).toBeTruthy();
  expect(await screen.findByText('틀린 문제 49')).toBeTruthy();
});
test('missing result offers start', async () => {
  window.location.hash = '#/rounds/50/result'; render(<App />);
  expect(await screen.findByText('시험 기록이 없습니다.')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('link', { name: '시험 시작' }).getAttribute('href')).toBe('#/rounds/50/exam'));
});
test.each([
  [all, '합격', []],
  [[1, 2, 3, 4, 11, 12, 13, 14, ...all.slice(20, 32)], '불합격', ['총점 미달']],
  [[1, 2, 3, 4, ...all.slice(20)], '불합격', ['2과목 과락']],
  [[...all.slice(0, 10), ...all.slice(20, 32)], '불합격', ['총점 미달', '2과목 과락']],
] as const)('rescoring shows verdict and reasons for %s', async (numbers, verdict, reasons) => {
  result(answersFor([...numbers])); window.location.hash = '#/rounds/50/result'; render(<App />);
  await screen.findByRole('heading', { name: '50회 · 결과' });
  expect(await screen.findByText(`${numbers.length * 2}점`)).toBeTruthy();
  expect(await screen.findByText(verdict, { exact: true })).toBeTruthy();
  for (const reason of reasons) expect(await screen.findByText(reason, { exact: true })).toBeTruthy();
  await waitFor(() => expect(screen.queryAllByText('· 과락').length).toBe(reasons.some(reason => reason === '2과목 과락') ? 1 : 0));
  expect(await screen.findByText('걸린 시간 61:07')).toBeTruthy();
});
test.each([false, true])('question result links, counts and review action, perfect=%s', async perfect => {
  result(answersFor(perfect ? all : [1])); window.location.hash = '#/rounds/50/result'; render(<App />);
  await screen.findByRole('heading', { name: '50회 · 결과' });
  await waitFor(() => expect(screen.getByRole('link', { name: '1번, 맞은 문제' }).getAttribute('href')).toBe('#/rounds/50/review?q=1'));
  await waitFor(() => expect(screen.getByRole('link', { name: `3번, ${perfect ? '맞은 문제' : '틀린 문제'}` }).getAttribute('href')).toBe('#/rounds/50/review?q=3'));
  expect(await screen.findByText(`틀린 문제 ${perfect ? 0 : 49}`)).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('link', { name: perfect ? '전체 문제 보기' : '틀린 문제 보기' }).getAttribute('href')).toBe(`#/rounds/50/review${perfect ? '' : '?filter=wrong'}`));
  await waitFor(() => expect(screen.getByRole('progressbar', { name: '1과목 맞은 문제' }).getAttribute('value')).toBe(perfect ? '10' : '1'));
});

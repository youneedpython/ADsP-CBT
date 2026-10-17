import '../test/asyncQueries';
vi.mock('../data/loadDownloads', () => ({ loadDownloads: async () => ({ formatVersion: 1, rounds: {} }) }));
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import type { Question, RoundData } from '../data/types';
// Screen role queries cannot inspect jsdom's KaTeX MathML. Real rendering is tested in MathText.test.tsx.
vi.mock('katex', () => ({ default: { renderToString: (text: string) =>
  `<span>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` } }));
const data: RoundData = {
  formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 90,
  subjects: [{ id: 1, name: '표본 과목' }],
  questions: [1, 2].map((number): Question => ({ number, subject: 1, question: `표본 ${number} <b>문제</b> $x$`,
    stimulus: [{ type: 'text', text: '글 $y$' }, { type: 'code', text: '  code $z$\n line' },
      { type: 'table', rows: [['머리 $a$', '열'], ['칸 $b$', '값']] }, { type: 'image', src: '50/sample.png', alt: '표본 그림' }],
    choices: ['표본 보기 하나', '표본 보기 둘', '표본 보기 셋', '표본 보기 넷'], answer: 2, explanation: '표본 해설 $c$' })),
};
const mock = vi.fn();
beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '#/rounds/50/practice';
  mock.mockReset();
  mock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json') ? [{ round: 50, year: 2026, title: '개발 표본', questionCount: 2, timeLimitMinutes: 90, file: '50.json' }] : structuredClone(data) }));
  vi.stubGlobal('fetch', mock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const ready = async () => {
  render(<App />);
  await screen.findByRole('heading', { name: '50회 · 연습' });
  await waitFor(() => expect(window.location.hash).toMatch(/q=\d+$/));
};
test('renders all stimuli safely and hides answers before selection', async () => {
  await ready();
  const article = screen.getByRole('article');
  await waitFor(() => expect(article.textContent).toContain('1과목 표본 과목'));
  await waitFor(() => expect(article.textContent).toContain('<b>문제</b>'));
  await waitFor(() => expect(article.querySelector('b')).toBeNull());
  await waitFor(() => expect(article.querySelector('pre')?.textContent).toBe('  code $z$\n line'));
  await waitFor(() => expect(screen.getAllByRole('columnheader').length).toBe(2));
  await waitFor(() => expect(screen.getByRole('img', { name: '표본 그림' }).getAttribute('src')).toBe(`${import.meta.env.BASE_URL}data/50/sample.png`));
  await waitFor(() => expect(screen.queryByText('정답')).toBeNull());
  await waitFor(() => expect(screen.queryByRole('heading', { name: '해설' })).toBeNull());
  await waitFor(() => expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true));
});
test('drafts toggle and change without grading or saving, survive navigation but not reopening', async () => {
  await ready();
  const confirm = screen.getByRole('button', { name: '정답 확인' });
  const nav = confirm.closest('nav')!;
  const buttonsPresent = () => expect(within(nav).getAllByRole('button').length).toBe(3);
  buttonsPresent();
  expect(confirm.getAttribute('aria-disabled')).toBe('true');
  expect((confirm as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(confirm);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  for (const [key, selected] of [['1', '1'], ['2', '2'], ['2', undefined], ['3', '3']]) {
    fireEvent.keyDown(window, { key });
    await waitFor(() => {
      const choices = within(screen.getByRole('article')).getAllByRole('button', { name: /^[1-4]\./ });
      choices.forEach((choice, index) => expect(choice.getAttribute('aria-pressed')).toBe(String(String(index + 1) === selected)));
    });
  }
  await waitFor(() => expect(screen.getByRole('button', { name: /3\. 표본 보기 셋/ }).getAttribute('aria-pressed')).toBe('true'));
  buttonsPresent();
  expect(confirm.className).toBe('');
  expect(screen.queryByText('정답')).toBeNull();
  expect(screen.queryByText('내 답')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('heading', { name: '해설' })).toBeNull();
  expect(localStorage.getItem('adsp-cbt:v1:50:practice')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByRole('heading', { name: /^2\. 표본/ });
  expect(await screen.findByRole('button', { name: '1번, 안 푼 문제' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '이전' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '3. 표본 보기 셋' }).getAttribute('aria-pressed')).toBe('true'));
  await waitFor(() => expect(screen.queryByText('선택됨')).toBeNull());
  expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:50:practice')!).answers).toEqual({});
  cleanup();
  await ready();
  await waitFor(() => within(screen.getByRole('article')).getAllByRole('button', { name: /^[1-4]\./ }).forEach(button => expect(button.getAttribute('aria-pressed')).toBe('false')));
});
test('click selection can change and clear, and interactive Enter only activates its own control', async () => {
  await ready();
  const one = screen.getByRole('button', { name: '1. 표본 보기 하나' });
  const two = screen.getByRole('button', { name: '2. 표본 보기 둘' });
  fireEvent.click(one);
  await waitFor(() => expect(one.getAttribute('aria-pressed')).toBe('true'));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: '1. 표본 보기 하나' })).toBe(one);
    expect(screen.queryByText('선택됨')).toBeNull();
    expect(two.getAttribute('aria-pressed')).toBe('false');
  });
  fireEvent.click(two);
  await waitFor(() => expect(one.getAttribute('aria-pressed')).toBe('false'));
  await waitFor(() => expect(screen.getByRole('button', { name: '2. 표본 보기 둘' }).getAttribute('aria-pressed')).toBe('true'));
  fireEvent.click(two);
  await waitFor(() => expect(two.getAttribute('aria-pressed')).toBe('false'));
  fireEvent.click(two);
  await waitFor(() => expect(two.getAttribute('aria-pressed')).toBe('true'));
  two.focus();
  expect(fireEvent.keyDown(two, { key: 'Enter' })).toBe(true);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  const confirm = screen.getByRole('button', { name: '정답 확인' });
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  confirm.focus();
  expect(fireEvent.keyDown(confirm, { key: 'Enter' })).toBe(true);
  fireEvent.click(confirm);
  const result = await screen.findByRole('status');
  await waitFor(() => expect(document.activeElement).toBe(result));
  expect(writes).toHaveBeenCalledTimes(1);
  expect(confirm.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByRole('button', { name: '다음' }).className).toBe('');
  expect(within(confirm.closest('nav')!).getAllByRole('button').length).toBe(3);
  fireEvent.keyDown(window, { key: '1' });
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.click(confirm);
  await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
  writes.mockRestore();
  expect(screen.getByRole('button', { name: '문항 번호판' }).closest('.practice-heading')).toBeTruthy();
});
test('keyboard choices lock while remaining focusable and arrows focus the new question', async () => {
  await ready();
  fireEvent.keyDown(window, { key: '2', code: 'Numpad2' });
  await waitFor(() => expect(screen.getByRole('button', { name: /2\. 표본 보기 둘/ }).getAttribute('aria-pressed')).toBe('true'));
  fireEvent.keyDown(window, { key: 'Enter' });
  const chosen = screen.getByRole('button', { name: /2\. 표본 보기 둘/ });
  await waitFor(() => expect(chosen.getAttribute('aria-disabled')).toBe('true'));
  await waitFor(() => expect((chosen as HTMLButtonElement).disabled).toBe(false));
  chosen.focus(); await waitFor(() => expect(document.activeElement).toBe(chosen));
  fireEvent.keyDown(chosen, { key: '1' });
  fireEvent.click(screen.getByRole('button', { name: /1\. 표본 보기 하나/ }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('맞았습니다.'));
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  await waitFor(() => expect(window.location.hash).toContain('q=1'));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^2\. 표본/ })));
  await waitFor(() => expect(screen.getByRole('button', { name: '2번, 안 푼 문제, 현재 문제' }).getAttribute('aria-current')).toBe('step'));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  await waitFor(() => expect(window.location.hash).toContain('q=2'));
});
test('practice board traps focus, blocks shortcuts, closes on Escape and restores opener', async () => {
  await ready();
  const opener = screen.getByRole('button', { name: '문항 번호판' });
  opener.focus(); fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog');
  const buttons = within(dialog).getAllByRole('button');
  await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  dialog.setAttribute('tabindex', '-1');
  dialog.focus();
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
  await waitFor(() => expect(document.activeElement).toBe(buttons.at(-1)));
  dialog.focus();
  fireEvent.keyDown(dialog, { key: 'Tab' });
  await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  await waitFor(() => expect(opener.closest('main')?.parentElement?.parentElement?.inert ?? (document.body.firstElementChild as HTMLElement).inert).toBe(true));
  fireEvent.keyDown(buttons[0], { key: 'Tab', shiftKey: true });
  await waitFor(() => expect(document.activeElement).toBe(buttons.at(-1)));
  fireEvent.keyDown(buttons.at(-1)!, { key: 'Tab' });
  await waitFor(() => expect(document.activeElement).toBe(buttons[0]));
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: '2' });
  await waitFor(() => expect(window.location.hash).toContain('q=1'));
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(opener));
});
test('widening to desktop closes the board and focuses the question', async () => {
  let listener: (() => void) | undefined;
  const media = { matches: false, addEventListener: vi.fn((_event, callback) => { listener = callback; }), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  await ready();
  const opener = screen.getByRole('button', { name: '문항 번호판' });
  opener.focus(); fireEvent.click(opener);
  expect(await screen.findByRole('dialog')).toBeTruthy();
  media.matches = true;
  fireEvent(window, new Event('resize'));
  listener?.();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^1\. 표본/ })));
  await waitFor(() => expect(media.removeEventListener).toHaveBeenCalled());
});
test('restart from second question removes the record and navigation writes once', async () => {
  await ready();
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
  await screen.findByRole('heading', { name: /^2\. 표본/ });
  expect(writes).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
  await waitFor(() => expect(window.location.hash).toContain('q=1'));
  await waitFor(() => expect(localStorage.getItem('adsp-cbt:v1:50:practice')).toBeNull());
  writes.mockRestore();
});
test.each([1, 2])('grades selection %s once and preserves state through navigation', async answer => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: answer === 1 ? '1. 표본 보기 하나' : '2. 표본 보기 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe(answer === 2 ? '맞았습니다.' : '틀렸습니다. 정답은 ②번입니다.'));
  expect(await screen.findByText('정답')).toBeTruthy();
  await waitFor(() => expect(Boolean(screen.queryByText('내 답'))).toBe(answer === 1));
  expect(await screen.findByRole('button', { name: `1번, ${answer === 2 ? '맞은 문제' : '틀린 문제'}, 현재 문제` })).toBeTruthy();
  expect(await screen.findByRole('heading', { name: '해설' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /3\. 표본 보기 셋/ }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe(answer === 2 ? '맞았습니다.' : '틀렸습니다. 정답은 ②번입니다.'));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(window.location.hash).toContain('q=2'));
  expect(await screen.findByRole('link', { name: '회차 정보로' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '회차 정보로' }).getAttribute('href')).toBe('#/rounds/50');
  await waitFor(() => expect(screen.queryByRole('button', { name: '다음' })).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: '이전' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain(answer === 2 ? '맞았습니다' : '틀렸습니다'));
});
test('board opens, moves, closes and restarts without confirmation', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '문항 번호판' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '2번, 안 푼 문제' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await screen.findByRole('heading', { name: /^2\. 표본/ });
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 보기 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  expect(await screen.findByRole('button', { name: '2번, 맞은 문제, 현재 문제' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
  await waitFor(() => expect(window.location.hash).toContain('q=1'));
  await waitFor(() => expect(screen.queryByRole('heading', { name: '해설' })).toBeNull());
  expect(await screen.findByRole('button', { name: '2번, 안 푼 문제' })).toBeTruthy();
});
test.each(['0', '999', '1.5', 'abc', '2'])('handles query %s', async q => {
  window.location.hash = `#/rounds/50/practice?q=${q}`;
  await ready();
  expect(await screen.findByText(q === '2' ? '2 / 2' : '1 / 2')).toBeTruthy();
});
test('round request failure can be retried', async () => {
  mock.mockImplementationOnce(async () => ({ ok: true, json: async () => [{ round: 50, year: 2026, title: '표본', questionCount: 2, timeLimitMinutes: 90, file: '50.json' }] })).mockRejectedValueOnce(new Error('표본 오류'));
  render(<App />);
  await screen.findByText('문제를 불러오지 못했습니다.');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByRole('heading', { name: '50회 · 연습' })).toBeTruthy();
});
test('reopening practice resumes answers and current question', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 보기 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:50:practice')!)).toEqual({ answers: { 1: 2 }, current: 2 }));
  fireEvent.click(screen.getByRole('link', { name: 'ADsP 기출 복원 문제' }));
  fireEvent.click(await screen.findByRole('link', { name: '이어서 풀기' }));
  await screen.findByRole('heading', { name: '50회 · 연습' });
  expect(await screen.findByText('2 / 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '이전' }));
  expect(await screen.findByRole('heading', { name: '해설' })).toBeTruthy();
});
test('a new app instance restores saved answers and position', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByRole('heading', { name: /^2\. 표본/ });
  fireEvent.click(screen.getByRole('button', { name: '1. 표본 보기 하나' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('adsp-cbt:v1:50:practice')!)).toEqual({ answers: { 2: 1 }, current: 2 }));
  cleanup();
  window.location.hash = '#/rounds/50/practice';
  await ready();
  expect(await screen.findByText('2 / 2')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('틀렸습니다. 정답은 ②번입니다.'));
});
test('explicit query overrides the saved position and restart removes the record', async () => {
  localStorage.setItem('adsp-cbt:v1:50:practice', JSON.stringify({ answers: { 2: 2 }, current: 2 }));
  window.location.hash = '#/rounds/50/practice?q=1';
  await ready();
  expect(await screen.findByText('1 / 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
  await waitFor(() => expect(localStorage.getItem('adsp-cbt:v1:50:practice')).toBeNull());
});
test('failed persistence shows a notice while practice continues', async () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  try {
    await ready();
    fireEvent.click(screen.getByRole('button', { name: '2. 표본 보기 둘' }));
    fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
    expect(await screen.findByText('이 브라우저에서는 풀이 기록을 저장할 수 없습니다.')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('맞았습니다.'));
  } finally { spy.mockRestore(); }
});

import '../test/asyncQueries';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { exams } from '../domain/exams';
import { scoreRound } from '../domain/scoring';
import { createRecordStore, recordKey } from '../storage/records';
import type { RoundData } from '../data/types';
import { loadRound } from '../data/loadRound';
import { readFileSync } from 'node:fs';
vi.mock('../data/loadDownloads', () => ({ loadDownloads: async () => ({ formatVersion: 1, rounds: {} }) }));
const sql = exams[1];
const summary = (round: number, sqld = true) => ({ round, year: 2026, title: '새로 만든 개발용 표본', questionCount: 50, timeLimitMinutes: 90, file: `${sqld ? 'sqld/' : ''}${round}.json` });
const data: RoundData = { formatVersion: 1, round: 900, title: '새로 만든 개발용 표본', timeLimitMinutes: 90,
  subjects: sql.subjects.map(s => ({ id: s.id, name: s.name })),
  questions: Array.from({ length: 50 }, (_, i) => ({ number: i + 1, subject: i < 10 ? 1 : 2,
    question: `개발용 SQL 문제 ${i + 1} $literal$`, stimulus: [{ type: 'text', text: '개발용 지문 $text$' }],
    choices: ['개발용 보기 $choice$', '개발용 둘', '개발용 셋', '개발용 넷'], answer: 1, explanation: '개발용 해설 $answer$' })) };
const fetchMock = vi.fn();
const response = (value: unknown) => ({ ok: true, json: async () => structuredClone(value) });
const topics = { formatVersion: 1, topics: [{ id: 'S101', name: '개발용 SQL 주제', subject: 1 }], questions: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [900 + i, Object.fromEntries(Array.from({ length: 50 }, (_, j) => [j + 1, 'S101']))])) };
beforeEach(() => {
  localStorage.clear(); window.location.hash = '#/sqld';
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => response(url.endsWith('sqld/topics.json') ? topics : url.endsWith('sqld/rounds.json') ? Array.from({ length: 11 }, (_, i) => summary(900 + i)) : url.endsWith('rounds.json') ? [summary(900, false)] : { ...data, round: Number(/\/(\d+)\.json$/.exec(url)?.[1] ?? 900) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const savedResult = () => ({ answers: { 1: 1 }, score: 2, passed: false, subjectCorrect: { 1: 1, 2: 0 }, elapsedSeconds: 1, submittedAt: '2026-11-02T00:00:00Z', questionCount: 50 });
test.each([
  ['/sqld', 'SQLD 기출 복원 문제를 회차별로 풀어 보세요'],
  ['/sqld/rounds', '회차 고르기'],
  ['/sqld/rounds/900', 'SQLD 900회 복원 문제'],
  ['/sqld/rounds/900/practice', '900회 · 연습'],
  ['/sqld/rounds/900/exam', '900회 · 시험'],
  ['/sqld/rounds/900/result', '900회 · 결과'],
  ['/sqld/rounds/900/review', '900회 · 다시 보기'],
])('SQLD route %s keeps screen links and navigation within the exam', async (path, heading) => {
  localStorage.setItem(recordKey(900, 'result', sql), JSON.stringify(savedResult()));
  window.location.hash = `#${path}`; render(<App />);
  await screen.findByRole('heading', { name: heading });
  if (path.endsWith('/practice') || path.endsWith('/exam')) {
    const bar = screen.getByRole('progressbar');
    expect(bar.classList.contains('sqld-progress')).toBe(true);
    expect(bar.getAttribute('max')).toBe('50');
    expect(bar.getAttribute('value')).toBe(path.endsWith('/exam') ? '0' : '1');
  }
  if (path.endsWith('/result')) {
    expect(screen.getAllByRole('progressbar').every(bar => !bar.classList.contains('sqld-progress'))).toBe(true);
  }
  expect(document.title).toBe('SQLD 기출 복원 문제');
  const nav = within(screen.getByRole('navigation', { name: '주요 화면' }));
  expect(nav.getAllByRole('link').map(a => a.textContent)).toEqual(['SQLD 홈', '회차', '모아 풀기']);
  expect(screen.getByRole('navigation', { name: '시험 전환' }).querySelector('[aria-current="page"]')?.textContent).toBe('SQLD');
  expect(within(screen.getByRole('main')).queryAllByRole('link').every(a => !a.getAttribute('href')?.startsWith('#/adsp'))).toBe(true);
  expect(screen.queryByText('PDF 자료')).toBeNull();
});
test('SQLD practice and review preserve dollars and never request ADsP topics', async () => {
  window.location.hash = '#/sqld/rounds/900/practice'; render(<App />);
  await screen.findByText('1. 개발용 SQL 문제 1 $literal$');
  expect(screen.getByText('개발용 지문 $text$')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '1. 개발용 보기 $choice$' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  expect(await screen.findByText('개발용 해설 $answer$')).toBeTruthy();
  expect(document.querySelector('.formula')).toBeNull();
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('data/topics.json'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '900회 1번 문제 표시' }));
  expect(JSON.parse(localStorage.getItem('cbt:v1:sqld:marked')!)).toHaveProperty('900:1');
  expect(localStorage.getItem('adsp-cbt:v1:marked')).toBeNull();
});
test('SQLD exam submission stores exactly two subject keys and opens result/review', async () => {
  window.location.hash = '#/sqld/rounds/900/exam'; render(<App />);
  await screen.findByRole('heading', { name: '900회 · 시험' });
  fireEvent.click(screen.getByRole('button', { name: '1. 개발용 보기 $choice$' }));
  expect(screen.queryByText('개발용 해설 $answer$')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '제출하고 채점' }));
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  await screen.findByRole('heading', { name: '900회 · 결과' });
  const record = JSON.parse(localStorage.getItem('cbt:v1:sqld:900:result')!);
  expect(record.subjectCorrect).toEqual({ 1: 1, 2: 0 }); expect(record.score).toBe(2);
  expect(localStorage.getItem('adsp-cbt:v1:900:result')).toBeNull();
  expect(localStorage.getItem('cbt:v1:sqld:900:exam')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '틀린 문제 보기' }));
  await screen.findByRole('heading', { name: '900회 · 다시 보기' });
});
test.each(['/sqld/notes', '/sqld/notes/1', '/sqld/missing'])('unsupported route %s returns to SQLD home', async path => {
  window.location.hash = `#${path}`; render(<App />);
  await screen.findByRole('heading', { name: 'SQLD 기출 복원 문제를 회차별로 풀어 보세요' });
  await waitFor(() => expect(window.location.hash).toBe('#/sqld'));
});
test('unknown SQLD round redirects to SQLD rounds', async () => {
  window.location.hash = '#/sqld/rounds/123'; render(<App />);
  await waitFor(() => expect(window.location.hash).toBe('#/sqld/rounds'));
});
test('hub computes SQLD facts and shows one resume heading for two independent records', async () => {
  const progress = { answers: { 1: 2 }, current: 2 };
  localStorage.setItem(recordKey(900, 'practice'), JSON.stringify(progress));
  localStorage.setItem(recordKey(900, 'practice', sql), JSON.stringify(progress));
  window.location.hash = '#/'; render(<App />);
  const card = within(screen.getAllByRole('article')[1]);
  expect(await card.findByText('900 ~ 910회')).toBeTruthy(); expect(card.getByText('550문항')).toBeTruthy();
  await waitFor(() => expect(screen.getAllByRole('link', { name: '이어서 풀기' })).toHaveLength(2));
  expect(screen.getAllByRole('heading', { name: '이어 풀기' })).toHaveLength(1);
  expect(screen.getAllByRole('link', { name: '이어서 풀기' }).map(a => a.getAttribute('href'))).toEqual(['#/adsp/rounds/900/practice', '#/sqld/rounds/900/practice']);
  const bars = screen.getAllByRole('progressbar', { name: '이어 풀기 진행' });
  expect(bars.map(bar => bar.classList.contains('sqld-progress'))).toEqual([false, true]);
});
test.each(['sqld', 'adsp'])('hub card failure for %s leaves the other card usable and retries independently', async failed => {
  let failing = true;
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('rounds.json') && (url.includes('/sqld/') === (failed === 'sqld')) && failing) throw new Error('sample failure');
    return response([summary(900)]);
  });
  window.location.hash = '#/'; render(<App />);
  await screen.findByText('문제를 불러오지 못했습니다.');
  expect(await screen.findByText('900 ~ 900회')).toBeTruthy();
  failing = false; fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(screen.getAllByText('900 ~ 900회')).toHaveLength(2));
});
test('SQLD grading enforces both subject minimums and keeps storage isolated', () => {
  const answers = (first: number, second: number) => Object.fromEntries([...Array.from({ length: first }, (_, i) => i + 1), ...Array.from({ length: second }, (_, i) => i + 11)].map(n => [n, 1]));
  expect(scoreRound(data, answers(5, 25)).passed).toBe(true);
  expect(scoreRound(data, answers(3, 30)).failureReasons).toEqual(['1과목 과락']);
  expect(scoreRound(data, answers(10, 15)).failureReasons).toContain('2과목 과락');
  const store = createRecordStore(localStorage, sql), adsp = createRecordStore(localStorage);
  store.write(900, 'result', savedResult()); expect(store.read(900, 'result', 50)).toEqual(savedResult());
  expect(adsp.read(900, 'result', 50)).toBeNull();
  localStorage.setItem(recordKey(900, 'result', sql), JSON.stringify({ ...savedResult(), subjectCorrect: { 1: 1, 2: 0, 3: 0 } }));
  expect(store.read(900, 'result', 50)).toBeNull();
  localStorage.setItem(recordKey(900, 'result', sql), JSON.stringify({ ...savedResult(), score: 101 }));
  expect(store.read(900, 'result', 50)).toBeNull();
  store.writeSet('sample', { signature: 'sample', answers: { '900:1': 1 }, current: 1 });
  store.writeResolved({ '900:1': '2026-11-02T00:00:00Z' });
  expect(localStorage.getItem('cbt:v1:sqld:set:sample')).toBeTruthy();
  expect(adsp.readSet('sample', 'sample', ['900:1'])).toBeNull(); expect(adsp.readResolved()).toEqual({});
});

test('a three-question sample stores and reloads a rounded integer score', () => {
  const sample = { ...data, questions: data.questions.slice(0, 3) };
  const result = scoreRound(sample, { 1: 1 });
  expect(result.score).toBe(33);
  const store = createRecordStore(localStorage, sql);
  store.write(999, 'result', { ...savedResult(), score: result.score, questionCount: 3 });
  expect(createRecordStore(localStorage, sql).read(999, 'result', 3)?.score).toBe(33);
});

test.each(['/sqld/sets', '/sqld/sets/wrong', '/sqld/sets/marked', '/sqld/sets/subject/1', '/sqld/sets/subject/2', '/sqld/sets/topic/S101'])('SQLD collection %s uses SQLD data and records', async path => {
  localStorage.setItem('adsp-cbt:v1:marked', JSON.stringify({ '900:2': '2026-11-02T00:00:00Z' }));
  localStorage.setItem('cbt:v1:sqld:marked', JSON.stringify({ '900:1': '2026-11-02T00:00:00Z' }));
  localStorage.setItem(recordKey(900, 'result', sql), JSON.stringify(savedResult()));
  window.location.hash = `#${path}`; render(<App />);
  if (path === '/sqld/sets') {
    await screen.findByText('자주 나오는 주제부터');
    expect(screen.queryByRole('button', { name: /^3과목/ })).toBeNull();
    expect(screen.getByRole('link', { name: '개발용 SQL 주제 풀기 ›' }).getAttribute('href')).toBe('#/sqld/sets/topic/S101');
  } else {
    await screen.findByRole('heading', { name: /^모아 풀기 ·/ });
    expect(screen.getByRole('progressbar', { name: '현재 문제 위치' }).classList.contains('sqld-progress')).toBe(true);
    if (path.endsWith('/marked')) expect(screen.getByText('1 / 1')).toBeTruthy();
  }
  expect(document.querySelector('main')?.closest('.exam-sqld')).toBeTruthy();
  expect(within(screen.getByRole('main')).queryAllByRole('link').every(link => !link.getAttribute('href')?.startsWith('#/adsp'))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('data/topics.json'))).toBe(false);
});

test('SQLD related questions stay in SQLD and show frequency', async () => {
  window.location.hash = '#/sqld/rounds/900/practice'; render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: '1. 개발용 보기 $choice$' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  const panel = await screen.findByRole('region', { name: '관련 문제 · 개발용 SQL 주제' });
  expect(within(panel).getByRole('link', { name: '901회 1번' }).getAttribute('href')).toBe('#/sqld/rounds/901/practice?q=1');
  expect(within(panel).getByText(/11개 회차 중 11회/)).toBeTruthy();
});

test('SQLD hub card and resume buttons receive the SQLD theme', async () => {
  localStorage.setItem(recordKey(900, 'practice', sql), JSON.stringify({ current: 2, answers: { 1: 1 } }));
  window.location.hash = '#/'; render(<App />);
  const button = await screen.findByRole('link', { name: 'SQLD 풀기 ›' });
  expect(button.closest('.exam-sqld')).toBeTruthy();
  expect((await screen.findByRole('link', { name: '이어서 풀기' })).closest('.exam-sqld')).toBeTruthy();
});

test('hub separates introduction sentences and renders exam descriptions as lists', async () => {
  window.location.hash = '#/'; render(<App />);
  const cards = screen.getAllByRole('article');
  await within(cards[0]).findByText('900 ~ 900회');
  await within(cards[1]).findByText('900 ~ 910회');
  const lead = document.querySelector('.page-lead')!;
  expect(Array.from(lead.childNodes).map(node => node.nodeName)).toEqual(['#text', 'BR', '#text']);
  expect(lead.childNodes[0].textContent).toBe('시험을 고르면 회차별 시험·연습과 주제별 모아 풀기를 할 수 있습니다.');
  expect(lead.childNodes[2].textContent).toBe('풀이 기록은 이 브라우저에만 저장됩니다.');
  const passing = '90분 · 총점 60점 이상, 과목별 40% 이상이면 합격';
  expect(within(within(cards[0]).getByRole('list')).getAllByRole('listitem').map(li => li.textContent)).toEqual([passing, 'PDF 자료와 핵심 요약 제공']);
  expect(within(within(cards[1]).getByRole('list')).getAllByRole('listitem').map(li => li.textContent)).toEqual([passing, '회차별 PDF 문제지 제공']);
});

test('body uses Pretendard first while controls inherit and code stays monospace', () => {
  const styles = readFileSync('src/styles/main.css', 'utf8');
  expect(styles).toMatch(/:root\s*\{[^}]*font-family: 'Pretendard Variable', Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif;/);
  expect(styles).toMatch(/input, select, textarea\s*\{ font-family: inherit; \}/);
  expect(styles).toMatch(/\.button, button\s*\{[^}]*font: inherit;/);
  expect(styles).toMatch(/pre\s*\{ margin: 0; font: 15px\/1\.6 monospace; \}/);
  // Inline code retains the browser monospace default; code passages and notes use pre.
  expect(styles).not.toMatch(/(?:^|\n)(?:code|\.stimulus-code|\.notes-code)\s*\{[^}]*(?:font-family|font):/);
});

test('hub hides latest shortcuts when both round lists fail', async () => {
  fetchMock.mockRejectedValue(new Error('sample failure'));
  window.location.hash = '#/'; render(<App />);
  await waitFor(() => expect(screen.getAllByRole('alert').length).toBe(2));
  expect(screen.queryByRole('link', { name: /^최신/ })).toBeNull();
});

test('hub cards keep their final action in the shared desktop bottom-alignment structure', async () => {
  window.location.hash = '#/'; render(<App />);
  await screen.findByText('900 ~ 910회');
  expect(within(screen.getAllByRole('article')[0]).getByRole('link', { name: '최신 900회 풀기' }).getAttribute('href')).toBe('#/adsp/rounds/900');
  expect(within(screen.getAllByRole('article')[1]).getByRole('link', { name: '최신 910회 풀기' }).getAttribute('href')).toBe('#/sqld/rounds/910');
  for (const name of ['ADsP', 'SQLD']) {
    const action = screen.getByRole('link', { name: `${name} 풀기 ›` }).parentElement!;
    expect(action.classList.contains('exam-card-action')).toBe(true);
    expect(action.parentElement?.classList.contains('exam-card')).toBe(true);
    expect(action.parentElement?.lastElementChild).toBe(action);
    expect(action.previousElementSibling?.classList.contains('exam-description')).toBe(true);
  }
  // jsdom cannot measure layout: verify the responsive rules wired to this structure.
  const styles = readFileSync('src/styles/main.css', 'utf8');
  expect(styles).toMatch(/@media \(min-width: 768px\)\s*\{\s*\.exam-grid\s*\{ align-items: stretch; \}\s*\.exam-card\s*\{ display: flex; flex-direction: column; \}\s*\.exam-card-action\s*\{ margin-top: auto; align-self: flex-start; \}/);
  expect(styles).toMatch(/\.exam-card \.button, \.hub-resume \.button\s*\{ border-color: var\(--exam-button-bg, var\(--exam-color\)\);/);
  expect(styles).toMatch(/\.button, button\s*\{[^}]*border: 1px solid var\(--button-bg\)/);
  expect(styles).toMatch(/\.secondary\s*\{[^}]*border-color: var\(--accent\)/);
});

test('board legend samples share the answered and unanswered button colors', () => {
  // jsdom does not resolve CSS variables: compare the rules used by both elements.
  const styles = readFileSync('src/styles/main.css', 'utf8');
  const rule = (selector: string) => {
    const body = styles.split(`${selector} {`)[1]?.split('}')[0];
    expect(body).toBeDefined();
    return body!;
  };
  for (const selector of ['.button, button', '.legend-sample']) {
    expect(rule(selector)).toContain('border: 1px solid var(--button-bg);');
    expect(rule(selector)).toContain('background: var(--button-bg);');
  }
  for (const selector of ['.secondary', '.legend-sample.secondary']) {
    expect(rule(selector)).toContain('border-color: var(--accent);');
    expect(rule(selector)).toContain('background: var(--surface);');
  }
  expect(rule(':root')).toContain('--button-bg: var(--accent);');
  expect(rule('.exam-sqld')).toContain('--button-bg: #f2c200;');
  expect(rule('.legend-sample.correct')).toContain('background: #eaf7ef; border-color: #16633c;');
  expect(rule('.legend-sample.wrong')).toContain('background: #fff0f0; border-color: #a52a30;');
});

test('outline review and mobile notes buttons preserve the dark accent border', () => {
  const styles = readFileSync('src/styles/main.css', 'utf8');
  expect(styles).toMatch(/\.round-actions \[aria-pressed="false"\]\s*\{[^}]*background: var\(--surface\);[^}]*border-color: var\(--accent\)/);
  expect(styles).toMatch(/\.notes-toc-toggle\s*\{[^}]*background: white;[^}]*border-color: var\(--accent\)/);
});
test.each(['third subject', 'missing subject', 'wrong name'])('SQLD loader rejects %s', async variant => {
  const value = structuredClone(data);
  if (variant === 'third subject') value.subjects.push({ id: 3, name: '개발용' });
  if (variant === 'missing subject') value.subjects.pop();
  if (variant === 'wrong name') value.subjects[0].name = '개발용';
  fetchMock.mockResolvedValue(response(value));
  await expect(loadRound(summary(900), undefined, sql)).rejects.toThrow();
});

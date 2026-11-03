import '../test/asyncQueries';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { rounds, summaries, topics } from '../test/setFixtures';
import { exams } from '../domain/exams';

function responseData(url: string, source = rounds) {
  const sql = url.includes('/sqld/');
  if (url.endsWith('downloads.json')) return { formatVersion: 1, rounds: {} };
  if (url.endsWith('rounds.json')) return summaries.map(summary => ({ ...summary, file: `${sql ? 'sqld/' : ''}${summary.round}.json` }));
  if (url.endsWith('topics.json')) return sql ? JSON.parse(JSON.stringify(topics).replaceAll('T10', 'S10').replaceAll('T20', 'S20').replaceAll('T30', 'S30').replaceAll('"subject":3', '"subject":2')) : topics;
  const round = structuredClone(source.find(round => url.endsWith(`${round.round}.json`))!);
  if (sql) { round.subjects = exams[1].subjects.map(({ id, name }) => ({ id, name })); round.questions.forEach(q => { if (q.subject === 3) q.subject = 2; }); }
  return round;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => structuredClone(
    responseData(url)) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const prefix = (exam: string) => exam === 'adsp' ? 'adsp-cbt:v1' : 'cbt:v1:sqld';
function seed(exam = 'adsp') {
  localStorage.setItem(`${prefix(exam)}:50:result`, JSON.stringify({ answers: { 1: 1, 2: 2 }, score: 2, subjectCorrect: exam === 'sqld' ? { 1: 0, 2: 1 } : { 1: 0, 2: 1, 3: 0 }, passed: false, elapsedSeconds: 5, submittedAt: '2026-11-02T00:00:00Z', questionCount: 3 }));
  localStorage.setItem(`${prefix(exam)}:49:practice`, JSON.stringify({ current: 2, answers: { 2: 1 } }));
}
async function open(path: string) {
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
}
test.each(['adsp', 'sqld'])('%s note link is disabled when empty and links to its own exam when populated', async exam => {
  await open(`/${exam}/sets`);
  expect((await screen.findByRole('button', { name: '오답 노트 ›' })).getAttribute('aria-disabled')).toBe('true');
  cleanup(); seed(exam);
  await open(`/${exam}/sets`);
  expect((await screen.findByRole('link', { name: '오답 노트 ›' })).getAttribute('href')).toBe(`#/${exam}/sets/wrong/note`);
});
test('note groups, source headers, answer labels, query persistence, print and title restoration', async () => {
  seed();
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  await open('/adsp/sets/wrong/note');
  await screen.findByRole('heading', { name: 'ADsP 오답 노트' });
  expect(document.title).toBe('ADsP 오답 노트 · 독특한 CBT');
  expect(screen.getByText(/· 틀린 문제 3문항/)).toBeTruthy();
  expect(screen.getByText('50회 1번 · 1과목 데이터 이해 · 표본 주제 하나')).toBeTruthy();
  expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['표본 주제 셋 · 2문항', '표본 주제 하나 · 1문항']);
  expect(screen.getAllByText('정답')).toHaveLength(3);
  expect(screen.getAllByText('내 답')).toHaveLength(2);
  expect(screen.getByText('안 푼 문제')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '회차순' }));
  expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['50회 · 2문항', '49회 · 1문항']);
  expect([...document.querySelectorAll('.wrong-note-question-heading > .question-subject')].map(p => p.textContent?.split(' · ')[0])).toEqual(['50회 1번', '50회 3번', '49회 2번']);
  fireEvent.click(screen.getByRole('button', { name: '해설 포함' }));
  expect(screen.queryByText('개발용 표본 해설')).toBeNull();
  expect(window.location.hash).toBe('#/adsp/sets/wrong/note?sort=round&explain=0');
  cleanup(); await open('/adsp/sets/wrong/note?sort=round&explain=0');
  await screen.findByRole('heading', { name: '50회 · 2문항' });
  expect(screen.queryByText('개발용 표본 해설')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '인쇄 / PDF로 저장' }));
  expect(print).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '주제순' }));
  fireEvent.click(screen.getByRole('button', { name: '해설 포함' }));
  expect(window.location.hash).toBe('#/adsp/sets/wrong/note');
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기로' }));
  await waitFor(() => expect(document.title).toBe('ADsP 기출 복원 문제'));
});
test('resolved questions are excluded and empty note has only a return link', async () => {
  localStorage.setItem('adsp-cbt:v1:50:practice', JSON.stringify({ current: 1, answers: { 1: 1 } }));
  localStorage.setItem('adsp-cbt:v1:set-resolved', JSON.stringify({ '50:1': '2026-11-02T00:00:00Z' }));
  await open('/adsp/sets/wrong/note');
  await screen.findByText('틀린 문제가 없습니다.');
  expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: '인쇄 / PDF로 저장' })).toBeNull();
});
test('SQLD note keeps dollar text and shares stimulus labels, code and tables', async () => {
  seed('sqld');
  const sqlRounds = structuredClone(rounds);
  sqlRounds[1].questions[0].question = '개발용 $literal$';
  sqlRounds[1].questions[0].stimulus = [{ type: 'text', text: '<개발용 지문>' }, { type: 'text', text: '표본 $text$' }, { type: 'code', text: 'SELECT $code$' }, { type: 'table', rows: [['머리'], ['$cell$']] }];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => responseData(url, sqlRounds) })));
  await open('/sqld/sets/wrong/note');
  await screen.findByRole('heading', { name: 'SQLD 오답 노트' });
  expect(document.title).toBe('SQLD 오답 노트 · 독특한 CBT');
  expect(screen.getByText('개발용 $literal$')).toBeTruthy();
  expect(screen.getByText('개발용 지문').className).toBe('stimulus-label');
  expect(screen.getByText('표본 $text$')).toBeTruthy();
  expect(screen.getByText('SELECT $code$')).toBeTruthy();
  expect(screen.getByRole('cell', { name: '$cell$' })).toBeTruthy();
  expect(document.querySelector('.katex')).toBeNull();
});

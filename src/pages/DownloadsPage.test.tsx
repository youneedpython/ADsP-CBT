import '../test/asyncQueries';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
const files = { type1: { file: 'pdf/900-type1.pdf', bytes: 286627 }, type2: { file: 'pdf/900-type2.pdf', bytes: 1048576 } };
let downloads: unknown;
const fetchMock = vi.fn();
const round = { formatVersion: 1, round: 900, title: '개발용 표본', timeLimitMinutes: 90, subjects: [1, 2, 3].map(id => ({ id, name: `표본 ${id}` })), questions: [{ number: 1, subject: 1, question: '개발용 표본 문제', choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설', stimulus: [] }] };
beforeEach(() => {
  localStorage.clear(); window.location.hash = '#/downloads';
  downloads = { formatVersion: 1, rounds: { 900: files } };
  fetchMock.mockReset().mockImplementation(async (url: string) => {
    if (url.endsWith('downloads.json') && downloads instanceof Error) throw downloads;
    return { ok: true, json: async () => url.endsWith('downloads.json') ? downloads : url.endsWith('rounds.json') ? [899, 900].map(n => ({ round: n, year: 2026, title: '개발용 표본', questionCount: 1, timeLimitMinutes: 90, file: `${n}.json` })) : round };
  }); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const downloadCalls = () => fetchMock.mock.calls.filter(([url]) => url.endsWith('downloads.json'));
test('rows newest first, current nav, base URLs, names, sizes and pending types', async () => {
  render(<App />);
  const link = await screen.findByRole('link', { name: '900회 풀이용 PDF 내려받기, 280 KB' });
  expect(link.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}pdf/900-type1.pdf`);
  expect(link.getAttribute('download')).toBe('ADsP_900회_풀이용.pdf');
  const explanation = screen.getByRole('link', { name: '900회 해설용 PDF 내려받기, 1.0 MB' });
  expect(explanation.getAttribute('download')).toBe('ADsP_900회_해설용.pdf');
  expect(screen.getByRole('link', { name: 'PDF' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getAllByRole('listitem').map(row => within(row).getByRole('heading').textContent)).toEqual(['900회', '899회']);
  expect(screen.getByRole('heading', { name: '회차별 문제지', level: 2 })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '900회', level: 3 })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '899회', level: 3 })).toBeTruthy();
  expect(screen.getByText('풀이용 PDF · 준비 중')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '홈' }));
  await screen.findByRole('link', { name: 'PDF로 공부하고 싶다면 PDF 자료 ›' });
  fireEvent.click(screen.getByRole('link', { name: '최신 900회 풀기' }));
  await screen.findByRole('heading', { name: 'PDF 자료' });
  expect(downloadCalls()).toHaveLength(1);
});
test.each([true, false])('round info section with both / one types: %s', async both => {
  downloads = { formatVersion: 1, rounds: { 900: both ? files : { type1: files.type1 } } };
  window.location.hash = '#/rounds/900'; render(<App />);
  await screen.findByRole('heading', { name: 'PDF 자료' });
  expect(screen.getByRole('link', { name: /900회 풀이용 PDF 내려받기/ })).toBeTruthy();
  expect(!!screen.queryByRole('link', { name: /900회 해설용 PDF 내려받기/ })).toBe(both);
  const actions = screen.getByRole('link', { name: /900회 풀이용 PDF 내려받기/ }).closest('.download-actions')!;
  expect(within(actions as HTMLElement).getAllByRole('link')).toHaveLength(both ? 4 : 2);
  expect(actions.children).toHaveLength(both ? 2 : 1);
  expect(downloadCalls()).toHaveLength(1);
});
test('no PDFs hides home link, header link and info section', async () => {
  downloads = { formatVersion: 1, rounds: {} }; window.location.hash = '#/'; render(<App />);
  await screen.findByRole('link', { name: '최신 900회 풀기' });
  await waitFor(() => expect(downloadCalls()).toHaveLength(1));
  expect(screen.queryByRole('link', { name: 'PDF' })).toBeNull();
  expect(screen.queryByText('PDF로 공부하고 싶다면 PDF 자료 ›')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '최신 900회 풀기' }));
  await screen.findByRole('heading', { name: '내 기록' });
  expect(screen.queryByRole('heading', { name: 'PDF 자료' })).toBeNull();
});
test('failed list hides PDF links while keeping home and info; download screen retries', async () => {
  downloads = new Error('표본 실패'); window.location.hash = '#/'; render(<App />);
  await screen.findByRole('link', { name: '최신 900회 풀기' });
  expect(screen.queryByRole('link', { name: 'PDF' })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '최신 900회 풀기' }));
  await screen.findByRole('heading', { name: '내 기록' });
  expect(screen.queryByRole('heading', { name: 'PDF 자료' })).toBeNull();
  window.location.hash = '#/downloads';
  await screen.findByText('PDF 목록을 불러오지 못했습니다.');
  downloads = { formatVersion: 1, rounds: { 900: files } };
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('link', { name: /900회 풀이용 PDF 내려받기/ });
  expect(downloadCalls()).toHaveLength(2);
});

const subject = { id: '3-2', label: '3과목 2장', name: '개발용 표본 통계', questionCount: 94,
  summary: { file: 'pdf/subject-3-2-summary.pdf', bytes: 1048576 }, solutions: { file: 'pdf/subject-3-2-solutions.pdf', bytes: 2048 } };
test('subject and round groups have viewing and download actions', async () => {
  downloads = { formatVersion: 1, rounds: { 900: files }, subjects: [subject] }; render(<App />);
  await screen.findByRole('heading', { name: '과목별 공부 자료' });
  expect(screen.getByRole('heading', { name: '회차별 문제지' })).toBeTruthy();
  expect(screen.getByText('풀이 모음 · 94문항')).toBeTruthy();
  for (const [label, file, filename, size] of [
    ['쉬운 설명', subject.summary.file, 'ADsP_3과목_2장_쉬운설명.pdf', '1.0 MB'],
    ['풀이 모음', subject.solutions.file, 'ADsP_3과목_2장_풀이모음.pdf', '2 KB'],
  ]) {
    const view = screen.getByRole('link', { name: `3과목 2장 ${label} PDF 새 탭에서 보기` });
    expect(view.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}${file}`);
    expect(view.getAttribute('target')).toBe('_blank'); expect(view.getAttribute('rel')).toBe('noopener');
    expect(view.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
    const save = screen.getByRole('link', { name: `3과목 2장 ${label} PDF 내려받기, ${size}` });
    expect(save.getAttribute('href')).toBe(view.getAttribute('href')); expect(save.getAttribute('download')).toBe(filename);
  }
});
test('subject-only PDFs expose home and header links', async () => {
  downloads = { formatVersion: 1, rounds: {}, subjects: [subject] }; window.location.hash = '#/'; render(<App />);
  await screen.findByRole('link', { name: 'PDF로 공부하고 싶다면 PDF 자료 ›' });
  expect(screen.getByRole('link', { name: 'PDF' })).toBeTruthy();
});
test.each([undefined, []])('absent or empty subjects omit their group', async subjects => {
  downloads = { formatVersion: 1, rounds: { 900: files }, ...(subjects ? { subjects } : {}) }; render(<App />);
  await screen.findByRole('heading', { name: '회차별 문제지' });
  expect(screen.queryByRole('heading', { name: '과목별 공부 자료' })).toBeNull();
});

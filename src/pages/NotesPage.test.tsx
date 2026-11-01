import '../test/asyncQueries';
import { Profiler } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { notesFixture } from '../test/notesFixture';
import { Bold } from './NotesPage';
let notes: unknown, topicError: boolean, subjects: any[];
const summary = { file: 'pdf/sample.pdf', pages: 2, bytes: 100 };
beforeEach(() => {
  notes = notesFixture(); topicError = false;
  subjects = [{ id: '1', subject: 1, subjectName: '표본', name: '개발용 표본', questionCount: 1, notes: 'notes/1.json', summary }];
  window.location.hash = '#/notes/1';
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('topics.json') && topicError) throw new Error('sample');
    if (url.endsWith('notes/1.json') && notes instanceof Error) throw notes;
    return { ok: true, json: async () => url.endsWith('downloads.json') ? { formatVersion: 1, rounds: {}, subjects }
      : url.endsWith('rounds.json') ? [{ round: 900, year: 2026, title: '개발용 표본', questionCount: 1, timeLimitMinutes: 90, file: '900.json' }]
      : url.endsWith('topics.json') ? { formatVersion: 1, topics: [{ id: 'T101', name: '표본 주제', subject: 1 }], questions: { 900: { 1: 'T101' } } } : notes };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('unpaired and empty bold markers remain literal text', () => {
  const { container, rerender } = render(<Bold text="" />);
  for (const text of ['**', '****', '*plain*', '**unfinished']) {
    rerender(<Bold text={text} />);
    expect(container.textContent).toBe(text);
    expect(container.querySelector('strong')).toBeNull();
  }
  rerender(<Bold text="**bold**" />);
  expect(container.textContent).toBe('bold');
  expect(container.querySelectorAll('strong')).toHaveLength(1);
});
test('all blocks, safe bold text, topic statistics, links and current PDF nav', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: '1과목 개발용 표본' });
  expect(screen.getByText('굵은 글').tagName).toBe('STRONG');
  expect(screen.getByText(/<img src=x>/).querySelector('img')).toBeNull();
  expect(screen.getByRole('columnheader', { name: '열' })).toBeTruthy();
  expect(screen.getByRole('cell', { name: '칸' })).toBeTruthy();
  expect(screen.getByText('안쪽')).toBeTruthy();
  expect(screen.getByText('참고 글')).toBeTruthy();
  expect(screen.getByText('시험 글')).toBeTruthy();
  expect(screen.getByRole('img', { name: '표본 그림' })).toBeTruthy();
  await screen.findByRole('img', { name: '1개 회차 중 1회 출제' });
  expect(screen.getByText(/1회 중 1회 · 1문항/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '풀기 ›' }).getAttribute('href')).toBe('#/sets/topic/T101');
  expect(screen.getByRole('link', { name: 'PDF' }).getAttribute('aria-current')).toBe('page');
  const pdf = screen.getByRole('link', { name: 'PDF로 보기' });
  expect(pdf.getAttribute('target')).toBe('_blank');
  expect(pdf.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  expect(pdf.textContent).not.toContain('↗');
  expect(screen.getByRole('button', { name: '표본 그림 크게 보기' }).style.maxWidth).toBe('50px');
  expect(document.title).toBe('1과목 핵심 요약 · ADsP 기출 복원 문제');
  expect(screen.queryByRole('navigation', { name: '핵심 요약 과목' })).toBeNull();
});
test('TOC toggle, query navigation, previous / next, invalid query fallback', async () => {
  window.location.hash = '#/notes/1?unit=bad'; render(<App />);
  const toggle = await screen.findByRole('button', { name: /목차 · 1단원/ });
  expect(toggle.getAttribute('aria-expanded')).toBe('false'); fireEvent.click(toggle);
  await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'));
  fireEvent.click(screen.getByRole('link', { name: '2단원 다음 단원 ›' }));
  await screen.findByText('다음 글'); expect(window.location.hash).toBe('#/notes/1?unit=2');
  await waitFor(() => expect(screen.getByRole('button', { name: /목차 · 2단원/ }).getAttribute('aria-expanded')).toBe('false'));
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('link', { name: '2단원 다음 단원 ›' })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '‹ 1단원 첫 단원' }));
  await screen.findByText('참고 글');
  expect(window.location.hash).toBe('#/notes/1?unit=1');
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(2));
});

test('TOC opened in the first data commit stays expanded after initial effects', async () => {
  let clicked = false;
  render(<Profiler id="initial-notes" onRender={() => {
    const toggle = document.querySelector<HTMLButtonElement>('.notes-toc-toggle');
    if (toggle && !clicked) {
      clicked = true;
      // Click during the first visible commit, before passive effects run.
      toggle.click();
    }
  }}><App /></Profiler>);
  const toggle = await screen.findByRole('button', { name: /목차 · 1단원/ });
  await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'));
  expect(clicked).toBe(true);
  expect(window.scrollTo).not.toHaveBeenCalled();
});
test('figure modal closes with Esc and restores focus; backdrop closes', async () => {
  render(<App />);
  const opener = await screen.findByRole('button', { name: '표본 그림 크게 보기' });
  fireEvent.click(opener);
  await screen.findByRole('dialog', { name: '표본 그림' });
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(opener); });
  fireEvent.click(opener); fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  await waitFor(() => expect(document.activeElement).toBe(opener));
  fireEvent.click(opener);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('img'));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByRole('dialog').querySelector('.notes-lightbox')!);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
test('topic failure hides only practice section', async () => {
  topicError = true; render(<App />); await screen.findByText('참고 글');
  expect(screen.queryByRole('heading', { name: '이 단원의 기출 문제 풀기' })).toBeNull();
});
test('multiple web subjects show subject navigation', async () => {
  subjects.push({ ...subjects[0], id: '2', subject: 2, notes: 'notes/2.json' });
  render(<App />); const nav = await screen.findByRole('navigation', { name: '핵심 요약 과목' });
  expect(within(nav).getAllByRole('link')).toHaveLength(2);
  expect(within(nav).getByRole('link', { name: '2과목' }).getAttribute('href')).toBe('#/notes/2');
});
test('unknown id does not fetch notes', async () => {
  window.location.hash = '#/notes/9'; render(<App />); await screen.findByText('없는 핵심 요약입니다.');
  expect(screen.getByRole('link', { name: 'PDF 자료로' })).toBeTruthy();
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('notes/9'))).toBe(false);
});
test('failure retries and loading state is shown', async () => {
  notes = new Error('sample'); render(<App />);
  expect(screen.getByText('핵심 요약을 불러오는 중입니다.')).toBeTruthy();
  await screen.findByText('핵심 요약을 불러오지 못했습니다.');
  notes = notesFixture(); fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('참고 글');
});
test('PDF cards expose web link only for configured subject', async () => {
  subjects.push({ ...subjects[0], id: '2', subject: 2, notes: undefined });
  delete subjects[1].notes;
  window.location.hash = '#/downloads'; render(<App />);
  const link = await screen.findByRole('link', { name: '핵심 요약 웹으로 읽기 ›' });
  expect(link.getAttribute('href')).toBe('#/notes/1');
  expect(screen.getAllByRole('link', { name: '핵심 요약 웹으로 읽기 ›' })).toHaveLength(1);
  const open = screen.getByRole('link', { name: '1과목 핵심 요약 PDF 새 탭에서 보기' });
  expect(open.closest('.pdf-heading')?.querySelector('strong')?.textContent).toBe('핵심 요약');
  expect(open.getAttribute('rel')).toBe('noopener');
  expect(screen.getByRole('tab', { name: '회차별 문제지' }).hasAttribute('aria-controls')).toBe(false);
});

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';

const sample = (round = 50) => ({ round, title: '표본 회차', questionCount: 12, timeLimitMinutes: 30, file: `${round}.json` });
const fetchMock = vi.fn();
const respond = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '#/';
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respond([sample()]));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('renders exact notices, metadata, and both hash links', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'ADsP 기출 복원 문제' })).toBeTruthy();
  expect(screen.getByRole('contentinfo').textContent).toBe(
    '복원 문제입니다. 실제 시험과 다를 수 있습니다.',
  );
  expect(screen.getByRole('complementary').textContent).toBe('복원 문제 안내공식 기출문제가 아니라 응시자의 기억으로 복원한 문제입니다. 실제 시험의 문제, 보기, 정답과 다를 수 있습니다.');
  expect(screen.getByText('풀이 기록은 이 브라우저에만 저장됩니다.')).toBeTruthy();
  expect(await screen.findByRole('heading', { name: '50회' })).toBeTruthy();
  expect(screen.getByText('12문항 · 30분')).toBeTruthy();
  expect(screen.getByText('기록 없음')).toBeTruthy();
  expect(screen.getByRole('link', { name: '50회 연습' }).getAttribute('href')).toBe('#/rounds/50/practice');
  expect(screen.getByRole('link', { name: '50회 시험' }).getAttribute('href')).toBe('#/rounds/50/exam');
});

test('shows loading while fetch is pending', () => {
  fetchMock.mockReturnValue(new Promise(() => {}));
  render(<App />);
  expect(screen.getByRole('status').textContent).toBe('문제를 불러오는 중입니다.');
});
test('retries a failed request successfully', async () => {
  fetchMock.mockRejectedValueOnce(new Error('표본 실패'));
  render(<App />);
  expect(await screen.findByText('문제를 불러오지 못했습니다.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByRole('heading', { name: '50회' })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
test('shows an empty list message', async () => {
  fetchMock.mockResolvedValue(respond([]));
  render(<App />);
  expect(await screen.findByText('아직 등록된 회차가 없습니다.')).toBeTruthy();
});
test('orders rounds by descending number', async () => {
  fetchMock.mockResolvedValue(respond([sample(2), sample(11), sample(5)]));
  render(<App />);
  const list = await screen.findByRole('list');
  expect(within(list).getAllByRole('heading').map(node => node.textContent)).toEqual(['11회', '5회', '2회']);
});
test.each(['exam', 'result', 'review'])('shows implemented %s with footer and list navigation', async page => {
  const roundData = { formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 90,
    subjects: [{ id: 1, name: '표본 과목' }], questions: [{ number: 1, subject: 1,
      question: '새로 만든 표본 문제', stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설' }] };
  fetchMock.mockImplementation(async (url: string) => respond(url.endsWith('rounds.json') ? [sample()] : roundData));
  window.location.hash = `#/rounds/50/${page}`;
  render(<App />);
  if (page === 'exam') {
    await screen.findByRole('heading', { name: '50회 · 시험' });
    await waitFor(() => expect(window.location.hash).toContain('q=1'));
  }
  else await screen.findByText('시험 기록이 없습니다.');
  expect(screen.getByRole('contentinfo').textContent).toBe('복원 문제입니다. 실제 시험과 다를 수 있습니다.');
  fireEvent.click(screen.getByRole('link', { name: 'ADsP 기출 복원 문제' }));
  expect(await screen.findByRole('heading', { name: '50회' })).toBeTruthy();
});
test('shows unknown round and keeps the footer', async () => {
  window.location.hash = '#/rounds/999/practice';
  render(<App />);
  expect(await screen.findByText('없는 회차입니다.')).toBeTruthy();
  expect(screen.getByRole('link', { name: '회차 목록으로' }).getAttribute('href')).toBe('#/');
  expect(screen.getByRole('contentinfo').textContent).toBe('복원 문제입니다. 실제 시험과 다를 수 있습니다.');
});
test('redirects unknown routes to the list', async () => {
  window.location.hash = '#/unknown';
  render(<App />);
  expect(await screen.findByRole('heading', { name: '50회' })).toBeTruthy();
  await waitFor(() => expect(window.location.hash).toBe('#/'));
});

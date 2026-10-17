import '../test/asyncQueries';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RoundInfoPage } from './RoundInfoPage';
import { loadRound } from '../data/loadRound';
import type { LoadState } from '../components/LoadingState';
import { RecordStoreContext } from '../storage/RecordStoreContext';
import { createRecordStore } from '../storage/records';
vi.mock('../data/loadRound', () => ({ loadRound: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function show(state: LoadState) {
  render(<MemoryRouter initialEntries={['/rounds/50']}><RecordStoreContext.Provider value={createRecordStore()}><Routes><Route path="/rounds/:round" element={<RoundInfoPage state={state} retry={() => {}} />} /></Routes></RecordStoreContext.Provider></MemoryRouter>);
}
test.each(['loading', 'error'] as const)('round list %s has a single h1', status => {
  show({ status });
  expect(screen.getAllByRole('heading', { level: 1 }).map(el => el.textContent)).toEqual(['50회']);
});
test('missing round has a single h1', () => {
  show({ status: 'success', rounds: [] });
  expect(screen.getAllByRole('heading', { level: 1 }).map(el => el.textContent)).toEqual(['없는 회차']);
});
test('round file loading and failure retain a single h1', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(loadRound).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  show({ status: 'success', rounds: [{ round: 50, year: 2026, title: '개발 표본', questionCount: 55, timeLimitMinutes: 90, file: '50.json' }] });
  expect(screen.getAllByRole('heading', { level: 1 }).map(el => el.textContent)).toEqual(['50회']);
  reject(new Error('sample failure'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getAllByRole('heading', { level: 1 }).map(el => el.textContent)).toEqual(['50회']);
});
test('loaded round keeps its original title and integer minimum for 55 questions', async () => {
  vi.mocked(loadRound).mockResolvedValue({ formatVersion: 1, round: 50, title: '개발 표본', timeLimitMinutes: 90,
    subjects: [{ id: 1, name: '표본 과목' }], questions: Array.from({ length: 55 }, (_, i) => ({
      number: i + 1, subject: 1, question: '개발 표본', stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본',
    })) });
  show({ status: 'success', rounds: [{ round: 50, year: 2026, title: '개발 표본', questionCount: 55, timeLimitMinutes: 90, file: '50.json' }] });
  await screen.findByRole('heading', { name: 'ADsP 50회 복원 문제', level: 1 });
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('cell', { name: '22문항' })).toBeTruthy();
});

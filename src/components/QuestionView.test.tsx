import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { QuestionView } from './QuestionView';
import { QuestionBoard } from './QuestionBoard';
import type { Question, RoundData, Stimulus } from '../data/types';
vi.mock('katex', () => ({ default: { renderToString: (text: string) => `<span>${text}</span>` } }));
afterEach(cleanup);
const question: Question = { number: 1, subject: 1, question: '개발 표본 문제', stimulus: [], choices: ['가', '나', '다', '라'], answer: 1, explanation: '표본 해설' };
const subjects: RoundData['subjects'] = [{ id: 1, name: '표본 과목' }];
const text = (value: string): Stimulus => ({ type: 'text', text: value });
test.each([
  ['practice', false, false], ['practice', true, true], ['review', false, true], ['exam', true, false],
] as const)('report visibility in %s confirmed=%s', (mode, confirmed, visible) => {
  render(<QuestionView round={50} question={{ ...question, number: 12 }} subjects={subjects} selected={1} confirmed={confirmed} mode={mode} choose={() => {}} />);
  const link = screen.queryByRole('link', { name: '50회 12번 문제 오류 신고' });
  expect(Boolean(link)).toBe(visible);
  if (link) {
    expect(link.textContent).toBe('문제 오류 신고');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('표본 해설').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});
test.each(['practice', 'exam', 'review'] as const)('groups text safely in %s', async mode => {
  const { container } = render(<QuestionView question={{ ...question, stimulus: [text('가. <b>표본</b>'), text('나. $x$'), text('다. 마지막')] }} subjects={subjects} mode={mode} choose={() => {}} />);
  await waitFor(() => expect(container.querySelector('.formula')).not.toBeNull());
  const paragraphs = container.querySelectorAll('.stimulus p');
  expect([...paragraphs].map(p => p.textContent)).toEqual(['가. <b>표본</b>', '나. x', '다. 마지막']);
  expect(container.querySelector('b')).toBeNull();
  expect(paragraphs[1].querySelector('.formula')).not.toBeNull();
});
test('non-text stimuli break groups and a single text retains its box', async () => {
  const { container, rerender } = render(<QuestionView question={{ ...question, stimulus: [text('가'), text('나'), { type: 'code', text: 'code' }, text('다')] }} subjects={subjects} choose={() => {}} />);
  await waitFor(() => expect(container.querySelectorAll('.stimulus').length).toBe(3));
  expect([...container.querySelectorAll('.stimulus')].map(box => box.textContent)).toEqual(['가나', 'code', '다']);
  rerender(<QuestionView question={{ ...question, stimulus: [text('하나')] }} subjects={subjects} choose={() => {}} />);
  expect(container.querySelectorAll('.stimulus').length).toBe(1);
  expect(container.querySelectorAll('.stimulus p').length).toBe(1);
});
test.each(['exam', 'practice'] as const)('legend explains %s states with hidden samples', async mode => {
  const data: RoundData = { formatVersion: 1, round: 1, title: '개발 표본', timeLimitMinutes: 90, subjects, questions: [question] };
  const { container } = render(<QuestionBoard data={data} mode={mode} current={1} answers={{}} move={() => {}} />);
  const labels = mode === 'exam' ? ['푼 문제', '안 푼 문제', '현재 문제'] : ['맞은 문제', '틀린 문제', '안 푼 문제', '현재 문제'];
  await waitFor(() => expect([...container.querySelectorAll('.board-legend > span')].map(item => item.textContent)).toEqual(labels));
  expect(container.querySelectorAll('.legend-sample[aria-hidden="true"]').length).toBe(labels.length);
});

import { expect, test } from 'vitest';
import { collectQuestions, frequency, questionKey, subjectQuestions, topicQuestions, topicStatistics, topicSummary, wrongQuestions, type RoundRecords } from './practiceSets';
import { rounds, summaries, topics } from '../test/setFixtures';
import type { ResultRecord } from '../storage/records';
const items = collectQuestions(summaries, rounds);
const result = (answers: ResultRecord['answers'], submittedAt = '2026-10-14T00:00:00Z'): ResultRecord => ({ answers, submittedAt, score: 0, subjectCorrect: { 1: 0, 2: 0, 3: 0 }, elapsedSeconds: 0, passed: false, questionCount: 3 });
test('collects only registered rounds newest first with question number order', () => {
  expect(items.map(questionKey)).toEqual(['50:1', '50:2', '50:3', '49:1', '49:2', '49:3']);
  expect(collectQuestions(summaries.slice(0, 1), rounds).map(questionKey)).toEqual(['49:1', '49:2', '49:3']);
});
test('wrong union includes exam wrong/unanswered and confirmed practice wrong once', () => {
  const records: Record<number, RoundRecords> = { 50: { practice: { answers: { 1: 1, 3: 2 }, current: 1 }, result: result({ 1: 1, 3: 2 }) }, 49: { practice: { answers: { 2: 1 }, current: 2 }, result: null } };
  expect(wrongQuestions(items, records, {}).map(questionKey)).toEqual(['50:1', '50:2', '49:2']);
  const resolved = { '50:1': '2026-10-14T01:00:00Z', '50:2': '2026-10-14T01:00:00Z', '49:2': '2026-10-14T01:00:00Z' };
  expect(wrongQuestions(items, records, resolved)).toEqual([]);
  records[50].result = result({ 1: 1, 2: 2, 3: 2 }, '2026-10-14T02:00:00Z');
  expect(wrongQuestions(items, records, resolved).map(questionKey)).toEqual(['50:1']);
});
test('no records or confirmed correct practice answers produce no wrong questions', () => {
  expect(wrongQuestions(items, {}, {})).toEqual([]);
  expect(wrongQuestions(items, { 50: { practice: { current: 1, answers: { 1: 2 } }, result: null } }, {})).toEqual([]);
});
test('counts by question subject, but filters topics by their representative subject', () => {
  expect(subjectQuestions(items, 2).map(questionKey)).toEqual(['50:2', '49:2']);
  expect(topicQuestions(items, topics, 'T301').map(questionKey)).toEqual(['50:3', '49:2', '49:3']);
  const stats = topicStatistics(topics, summaries);
  expect(stats.map(topic => topic.id)).toEqual(['T301', 'T101', 'T201']);
  expect(stats[0]).toMatchObject({ questionCount: 3, roundCount: 2, rounds: [true, true], frequency: '높음' });
  expect(stats[2]).toMatchObject({ questionCount: 1, roundCount: 1, rounds: [true, false], frequency: '보통' });
});
test('topic summaries match practice order and ignore unregistered rounds', () => {
  const source = { ...topics, questions: { ...topics.questions, 99: { 1: 'T301' } } };
  for (const registered of [summaries, summaries.slice(0, 1)]) {
    const collected = collectQuestions(registered, rounds);
    for (const topic of topics.topics) {
      const summary = topicSummary(source, registered, topic.id);
      expect(summary.questions.map(item => `${item.round}:${item.number}`)).toEqual(topicQuestions(collected, source, topic.id).map(questionKey));
    }
  }
  expect(topicSummary(source, summaries, 'T301')).toEqual({
    questions: [{ round: 50, number: 3 }, { round: 49, number: 2 }, { round: 49, number: 3 }],
    questionCount: 3, roundCount: 2, rounds: [true, true],
  });
  expect(topicSummary(source, summaries, 'missing')).toEqual({ questions: [], questionCount: 0, roundCount: 0, rounds: [false, false] });
  expect(topicSummary(source, [], 'T301')).toEqual({ questions: [], questionCount: 0, roundCount: 0, rounds: [] });
});
test.each([[7, 7, '높음'], [6, 7, '높음'], [5, 7, '보통'], [4, 7, '보통'], [3, 7, '낮음'], [0, 0, '낮음'], [8, 10, '높음'], [5, 10, '보통']])('frequency %s/%s is %s', (count, total, label) => expect(frequency(Number(count), Number(total))).toBe(label));

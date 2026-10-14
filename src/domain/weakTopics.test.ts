import { expect, test } from 'vitest';
import { collectQuestions, type RoundRecords } from './practiceSets';
import { studyStatistics } from './weakTopics';
import { rounds, summaries, topics } from '../test/setFixtures';
import type { ResultRecord } from '../storage/records';
const items = collectQuestions(summaries, rounds);
const result = (answers: ResultRecord['answers'], submittedAt = '2026-10-14T00:00:00Z'): ResultRecord => ({ answers, submittedAt, score: 0, passed: false, subjectCorrect: { 1: 0, 2: 0, 3: 0 }, elapsedSeconds: 0, questionCount: 3 });
test('latest submitted exam answers count without practice; unanswered exam entries stay out of solved totals', () => {
  const stats = studyStatistics(items, topics, summaries, { 50: { practice: null, result: result({ 1: 2, 3: 1 }) } }, {}, []);
  expect(stats.solvedCount).toBe(2);
  expect(stats.statistics.find(topic => topic.id === 'T101')).toMatchObject({ solvedCount: 1, correctCount: 1 });
  expect(stats.statistics.find(topic => topic.id === 'T201')?.solvedCount).toBe(0);
  expect(stats.statistics.find(topic => topic.id === 'T301')).toMatchObject({ solvedCount: 1, correctCount: 0 });
});
test('answers are deduplicated; unanswered exam questions do not count; resolved wrong answers count as correct', () => {
  const records: Record<number, RoundRecords> = {
    50: { practice: { current: 1, answers: { 1: 1, 2: 2 } }, result: result({ 1: 1 }) },
    49: { practice: { current: 1, answers: { 2: 2 } }, result: null },
  };
  const stats = studyStatistics(items, topics, summaries, records, { '50:1': '2026-10-15T00:00:00Z' }, [{ '50:1': 2, '50:3': 1, '49:3': 2 }]);
  expect(stats.solvedCount).toBe(5);
  expect(stats.statistics.find(topic => topic.id === 'T101')).toMatchObject({ solvedCount: 1, correctCount: 1, accuracy: null });
  expect(stats.statistics.find(topic => topic.id === 'T301')).toMatchObject({ solvedCount: 3, correctCount: 2, accuracy: 66 });
  expect(stats.weakest.map(topic => topic.id)).toEqual(['T301']);
  const newer = studyStatistics(items, topics, summaries, { ...records, 50: { ...records[50], result: result({ 1: 1 }, '2026-10-16T00:00:00Z') } }, { '50:1': '2026-10-15T00:00:00Z' }, []);
  expect(newer.statistics.find(topic => topic.id === 'T101')?.correctCount).toBe(0);
});
test('wrong round answers still count as wrong after correct set answers, except resolved wrong-set answers', () => {
  const stats = studyStatistics(items, topics, summaries, { 50: { practice: { current: 1, answers: { 3: 1 } }, result: null } }, {}, [{ '50:3': 2, '49:2': 1, '49:3': 2 }]);
  expect(stats.statistics.find(topic => topic.id === 'T301')).toMatchObject({ solvedCount: 3, correctCount: 1, accuracy: 33 });
});
test('empty history and fewer than three solved questions offer no weak topics', () => {
  expect(studyStatistics(items, topics, summaries, {}, {}, []).weakest).toEqual([]);
  const stats = studyStatistics(items, topics, summaries, {}, {}, [{ '50:1': 1, '49:1': 1 }]);
  expect(stats.statistics.find(topic => topic.id === 'T101')).toMatchObject({ solvedCount: 2, accuracy: null });
  expect(stats.weakest).toEqual([]);
});
test('ranking uses accuracy, round count, question count and limits to three; low frequency and perfect topics are excluded', () => {
  const expanded = { ...topics, topics: ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id, name: id, subject: 3 as const })), questions: {} as Record<number, Record<number, string>> };
  const all = [] as typeof items;
  const answers: Record<string, 1 | 2> = {};
  for (const [index, topic] of expanded.topics.entries()) {
    const count = topic.id === 'C' ? 4 : 3;
    for (let n = 0; n < count; n++) {
      const round = topic.id === 'E' ? 50 : topic.id === 'B' ? 50 - n % 2 : 50 - n % 3;
      const number = index * 10 + n + 1;
      expanded.questions[round] ??= {};
      expanded.questions[round][number] = topic.id;
      all.push({ ...items[0], round, question: { ...items[0].question, number } });
      answers[`${round}:${number}`] = topic.id === 'F' ? 2 : 1;
    }
  }
  const registered = [50, 49, 48].map(round => ({ ...summaries[0], round }));
  const stats = studyStatistics(all, expanded, registered, {}, {}, [answers]);
  expect(stats.weakest.map(topic => topic.id)).toEqual(['C', 'A', 'D']);
  expect(stats.statistics.find(topic => topic.id === 'E')?.frequency).toBe('낮음');
  expect(stats.statistics.find(topic => topic.id === 'F')?.accuracy).toBe(100);
  answers['50:21'] = 2;
  expect(studyStatistics(all, expanded, registered, {}, {}, [answers]).weakest[0].id).toBe('A');
});

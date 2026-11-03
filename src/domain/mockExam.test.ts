import { expect, test } from 'vitest';
import { createMock, restoreMock } from './mockExam';
import { exams } from './exams';
import type { Question, RoundData } from '../data/types';
import { createRecordStore } from '../storage/records';
import { collectQuestions, wrongQuestions } from './practiceSets';
import { studyStatistics } from './weakTopics';

export function sampleRounds(exam = exams[0]): RoundData[] {
  return [49, 50].map(round => ({ formatVersion: 1, round, title: '개발 표본', timeLimitMinutes: 90,
    subjects: exam.subjects.map(({ id, name }) => ({ id, name })),
    questions: exam.subjects.flatMap(s => Array.from({ length: s.questionCount }, (): Question => ({
      number: 0, subject: s.id, question: '새로 만든 개발 표본', stimulus: [], choices: ['표본 하나', '표본 둘', '표본 셋', '표본 넷'], answer: 2, explanation: '개발 표본 해설',
    }))).map((q, i) => ({ ...q, number: i + 1 })) }));
}
test.each(exams)('$name mock samples without replacement in subject order and preserves content', exam => {
  const rounds = sampleRounds(exam);
  const mock = createMock(rounds, exam, () => .37);
  expect(mock).toEqual(createMock(rounds, exam, () => .37));
  expect(mock.questions).toHaveLength(50);
  expect(new Set(mock.questions.map(q => q.source.join(':'))).size).toBe(50);
  expect(mock.questions.map(q => q.subject)).toEqual(exam.subjects.flatMap(s => Array(s.questionCount).fill(s.id)));
  mock.questions.forEach((q, index) => {
    const original = rounds.find(r => r.round === q.source[0])!.questions[q.source[1] - 1];
    expect(q).toEqual({ ...original, number: index + 1, source: q.source });
  });
  expect(mock.timeLimitMinutes).toBe(90);
});
test('short pools reduce question count and missing and duplicate sources cannot restore', () => {
  const rounds = sampleRounds().map(r => ({ ...r, questions: r.questions.slice(0, 2) }));
  expect(createMock(rounds, exams[0]).questions).toHaveLength(4);
  expect(restoreMock(rounds, [[999, 1]], exams[0])).toBeNull();
  expect(restoreMock(rounds, [[49, 1], [49, 1]], exams[0])).toBeNull();
});
test.each(exams)('$name mock storage validates sources, uses isolated keys and discards malformed records', exam => {
  const memory = new Map<string, string>();
  const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } };
  const store = createRecordStore(storage, exam);
  const rounds = sampleRounds(exam);
  const sources = createMock(rounds, exam, () => .5).questions.map(q => q.source);
  const record = { answers: { 1: 2 }, current: 2, startedAt: '2026-11-03T00:00:00Z', elapsedSeconds: 5, sources };
  store.writeMock('exam', record);
  expect(memory.has(`${exam.recordPrefix}:mock:exam`)).toBe(true);
  expect(createRecordStore(storage, exam).readMock('exam', rounds)).toEqual(record);
  const result = { answers: {}, score: 0, subjectCorrect: Object.fromEntries(exam.subjects.map(s => [s.id, 0])), passed: false, elapsedSeconds: 5, submittedAt: record.startedAt, questionCount: 50, sources };
  store.writeMock('result', result);
  expect(memory.has(`${exam.recordPrefix}:mock:result`)).toBe(true);
  expect(store.readMock('result', rounds)).toEqual(result);
  expect(store.readMock('exam', [])).toBeNull();
  expect(memory.has(`${exam.recordPrefix}:mock:exam`)).toBe(false);
  for (const invalid of [{ ...record, sources: [[999, 1]] }, { ...record, sources: [[49, '1']] }, { ...record, current: 51 }, { ...record, answers: { 51: 2 } }, { ...record, sources: [sources[0], sources[0]] }]) {
    storage.setItem(`${exam.recordPrefix}:mock:exam`, JSON.stringify(invalid));
    expect(store.readMock('exam', rounds)).toBeNull();
  }
});
test('mock mistakes include unanswered originals, resolve by timestamp, and leave study statistics unchanged', () => {
  const rounds = sampleRounds();
  const items = collectQuestions(rounds.map(r => ({ ...r, year: 2026, questionCount: 50, file: '' })), rounds);
  const sources: [number, number][] = [[50, 1], [49, 2], [50, 3]];
  const mock = { sources, answers: { 1: 2, 2: 1 }, score: 33, passed: false, subjectCorrect: { 1: 1, 2: 0, 3: 0 }, elapsedSeconds: 0, submittedAt: '2026-11-03T00:00:00Z', questionCount: 3 };
  expect(wrongQuestions(items, {}, {}, mock).map(i => [i.round, i.question.number])).toEqual([[50, 3], [49, 2]]);
  expect(wrongQuestions(items, {}, { '50:3': '2026-11-03T01:00:00Z' }, mock)).toHaveLength(1);
  expect(wrongQuestions(items, {}, { '50:3': '2026-11-02T00:00:00Z' }, mock)).toHaveLength(2);
  const topics = { formatVersion: 1 as const, topics: [], questions: {} };
  expect(studyStatistics(items, topics, [], {}, {}, []).solvedCount).toBe(0);
});

import type { Question, RoundData } from '../data/types';
import type { Exam } from './exams';

export type QuestionSource = [number, number];
export interface MockQuestion extends Question { source: QuestionSource }
export interface MockData extends RoundData { questions: MockQuestion[] }
export function restoreMock(rounds: RoundData[], sources: QuestionSource[], exam: Exam): MockData | null {
  const questions: MockQuestion[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const original = rounds.find(r => r.round === source[0])?.questions.find(q => q.number === source[1]);
    if (!original || seen.has(source.join(':'))) return null;
    seen.add(source.join(':'));
    questions.push({ ...original, number: questions.length + 1, source });
  }
  return { formatVersion: 1, round: 0, title: '실전 모의고사', timeLimitMinutes: 90,
    subjects: exam.subjects.map(({ id, name }) => ({ id, name })), questions };
}
export function createMock(rounds: RoundData[], exam: Exam, random = Math.random): MockData {
  const sources = exam.subjects.flatMap(subject => {
    const pool = rounds.flatMap(r => r.questions.filter(q => q.subject === subject.id).map(q => [r.round, q.number] as QuestionSource));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, subject.questionCount);
  });
  return restoreMock(rounds, sources, exam)!;
}

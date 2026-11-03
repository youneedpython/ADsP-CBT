import { exams, type Exam } from '../domain/exams';
import { restoreMock, type QuestionSource } from '../domain/mockExam';
import type { RoundData } from '../data/types';
import type { Answers } from '../domain/scoring';
import { isAnswer } from '../domain/scoring';
import { validResolved, validSetRecord, type SetRecord } from './setRecords';
import type { ResolvedQuestions } from '../domain/practiceSets';
import { validMarked, type MarkedQuestions } from './marked';

export interface PracticeRecord { answers: Answers; current: number }
export interface ExamRecord extends PracticeRecord { startedAt: string; elapsedSeconds: number }
export interface ResultRecord {
  answers: Answers;
  score: number;
  subjectCorrect: Record<number, number>;
  passed: boolean;
  elapsedSeconds: number;
  submittedAt: string;
  questionCount: number;
}
export interface RecordTypes { practice: PracticeRecord; exam: ExamRecord; result: ResultRecord }
export type MockRecord<K extends 'exam' | 'result'> = RecordTypes[K] & { sources: QuestionSource[] };
export type RecordKind = keyof RecordTypes;
export type RecordStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function recordKey(round: number, kind: RecordKind, exam: Exam = exams[0]): string {
  return `${exam.recordPrefix}:${round}:${kind}`;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}
function date(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}
function valid(value: unknown, kind: RecordKind, count: number, exam: Exam): boolean {
  if (!integer(count, 1) || !object(value) || !object(value.answers)) return false;
  if (!Object.entries(value.answers).every(([key, answer]) =>
    /^[1-9]\d*$/.test(key) && integer(Number(key), 1, count) && isAnswer(answer))) return false;
  if (kind !== 'result') return integer(value.current, 1, count) && (kind !== 'exam' || (date(value.startedAt) && integer(value.elapsedSeconds, 0)));
  return value.questionCount === count && integer(value.score, 0, 100)
    && typeof value.passed === 'boolean' && integer(value.elapsedSeconds, 0) && date(value.submittedAt)
    && object(value.subjectCorrect) && exam.subjects.map(s => String(s.id)).every(key => Object.hasOwn(value.subjectCorrect as object, key))
    && Object.entries(value.subjectCorrect).every(([key, correct]) => exam.subjects.some(s => String(s.id) === key) && integer(correct, 0, count));
}

/** Keep this instance for the browser session so unavailable persistence retains records in memory. */
export function createRecordStore(provided?: RecordStorage | (() => RecordStorage), exam: Exam = exams[0]) {
  const memory = new Map<string, string>();
  let storage: RecordStorage | undefined;
  try { storage = typeof provided === 'function' ? provided() : provided ?? window.localStorage; }
  catch { /* Access can be blocked before any method is called. */ }
  let persistent = storage !== undefined;

  function readExtra<T>(key: string, validate: (value: unknown) => value is T): T | null {
    let raw = memory.get(key) ?? null;
    if (persistent) {
      try { raw = storage!.getItem(key); } catch { persistent = false; }
    }
    if (raw !== null) {
      try {
        const value: unknown = JSON.parse(raw);
        if (validate(value)) { memory.set(key, raw); return value; }
      } catch { /* Invalid records are discarded. */ }
    }
    memory.delete(key);
    if (storage && raw !== null) { try { storage.removeItem(key); } catch { persistent = false; } }
    return null;
  }
  function writeExtra(key: string, value: unknown) {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    if (persistent) { try { storage!.setItem(key, raw); } catch { persistent = false; } }
  }

  function remove(round: number, kind: RecordKind): void {
    const key = recordKey(round, kind, exam);
    memory.delete(key);
    if (storage) {
      try { storage!.removeItem(key); } catch { persistent = false; }
    }
  }
  return {
    readMock<K extends 'exam' | 'result'>(kind: K, rounds?: RoundData[]): MockRecord<K> | null {
      return readExtra(`${exam.recordPrefix}:mock:${kind}`, (value): value is MockRecord<K> => {
        if (!object(value) || !Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 50
          || !value.sources.every(s => Array.isArray(s) && s.length === 2 && s.every(n => integer(n, 1)))
          || new Set(value.sources.map(s => s.join(':'))).size !== value.sources.length) return false;
        return valid(value, kind, value.sources.length, exam) && (!rounds || restoreMock(rounds, value.sources, exam) !== null);
      });
    },
    writeMock<K extends 'exam' | 'result'>(kind: K, value: MockRecord<K>) { writeExtra(`${exam.recordPrefix}:mock:${kind}`, value); },
    removeMock(kind: 'exam' | 'result') {
      const key = `${exam.recordPrefix}:mock:${kind}`;
      memory.delete(key);
      if (storage) { try { storage.removeItem(key); } catch { persistent = false; } }
    },
    readMarked: () => readExtra(`${exam.recordPrefix}:marked`, validMarked) ?? {},
    writeMarked: (value: MarkedQuestions) => writeExtra(`${exam.recordPrefix}:marked`, value),
    readSetAnswers: (ids: string[], keys: string[]) => ids.flatMap(id => {
      const value = readExtra(`${exam.recordPrefix}:set:${id}`, (value): value is SetRecord => object(value)
        && typeof value.signature === 'string' && validSetRecord(value, value.signature, keys));
      return value ? [value.answers] : [];
    }),
    readSet: (id: string, signature: string, keys: string[]) => readExtra(`${exam.recordPrefix}:set:${id}`, (value): value is SetRecord => validSetRecord(value, signature, keys)),
    writeSet: (id: string, value: SetRecord) => writeExtra(`${exam.recordPrefix}:set:${id}`, value),
    readResolved: () => readExtra(`${exam.recordPrefix}:set-resolved`, validResolved) ?? {},
    writeResolved: (value: ResolvedQuestions) => writeExtra(`${exam.recordPrefix}:set-resolved`, value),
    canPersist: () => persistent,
    read<K extends RecordKind>(round: number, kind: K, questionCount: number): RecordTypes[K] | null {
      const key = recordKey(round, kind, exam);
      let raw = memory.get(key) ?? null;
      if (persistent) {
        try { raw = storage!.getItem(key); } catch { persistent = false; }
      }
      if (raw === null) { memory.delete(key); return null; }
      try {
        const value: unknown = JSON.parse(raw);
        if (valid(value, kind, questionCount, exam)) {
          memory.set(key, raw);
          return value as RecordTypes[K];
        }
      } catch { /* Malformed JSON is discarded like an invalid record. */ }
      remove(round, kind);
      return null;
    },
    write<K extends RecordKind>(round: number, kind: K, value: RecordTypes[K]): void {
      const key = recordKey(round, kind, exam);
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      if (persistent) {
        try { storage!.setItem(key, raw); } catch { persistent = false; }
      }
    },
    remove,
  };
}

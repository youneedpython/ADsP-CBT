import type { Answers } from '../domain/scoring';
import { isAnswer } from '../domain/scoring';
import { validResolved, validSetRecord, type SetRecord } from './setRecords';
import type { ResolvedQuestions } from '../domain/practiceSets';

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
export type RecordKind = keyof RecordTypes;
export type RecordStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function recordKey(round: number, kind: RecordKind): string {
  return `adsp-cbt:v1:${round}:${kind}`;
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
function valid(value: unknown, kind: RecordKind, count: number): boolean {
  if (!integer(count, 1) || !object(value) || !object(value.answers)) return false;
  if (!Object.entries(value.answers).every(([key, answer]) =>
    /^[1-9]\d*$/.test(key) && integer(Number(key), 1, count) && isAnswer(answer))) return false;
  if (kind !== 'result') return integer(value.current, 1, count) && (kind !== 'exam' || (date(value.startedAt) && integer(value.elapsedSeconds, 0)));
  return value.questionCount === count && integer(value.score, 0, count * 2)
    && typeof value.passed === 'boolean' && integer(value.elapsedSeconds, 0) && date(value.submittedAt)
    && object(value.subjectCorrect) && ['1', '2', '3'].every(key => Object.hasOwn(value.subjectCorrect as object, key))
    && Object.entries(value.subjectCorrect).every(([key, correct]) => /^[1-3]$/.test(key) && integer(correct, 0, count));
}

/** Keep this instance for the browser session so unavailable persistence retains records in memory. */
export function createRecordStore(provided?: RecordStorage | (() => RecordStorage)) {
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
    const key = recordKey(round, kind);
    memory.delete(key);
    if (storage) {
      try { storage!.removeItem(key); } catch { persistent = false; }
    }
  }
  return {
    readSet: (id: string, signature: string, keys: string[]) => readExtra(`adsp-cbt:v1:set:${id}`, (value): value is SetRecord => validSetRecord(value, signature, keys)),
    writeSet: (id: string, value: SetRecord) => writeExtra(`adsp-cbt:v1:set:${id}`, value),
    readResolved: () => readExtra('adsp-cbt:v1:set-resolved', validResolved) ?? {},
    writeResolved: (value: ResolvedQuestions) => writeExtra('adsp-cbt:v1:set-resolved', value),
    canPersist: () => persistent,
    read<K extends RecordKind>(round: number, kind: K, questionCount: number): RecordTypes[K] | null {
      const key = recordKey(round, kind);
      let raw = memory.get(key) ?? null;
      if (persistent) {
        try { raw = storage!.getItem(key); } catch { persistent = false; }
      }
      if (raw === null) { memory.delete(key); return null; }
      try {
        const value: unknown = JSON.parse(raw);
        if (valid(value, kind, questionCount)) {
          memory.set(key, raw);
          return value as RecordTypes[K];
        }
      } catch { /* Malformed JSON is discarded like an invalid record. */ }
      remove(round, kind);
      return null;
    },
    write<K extends RecordKind>(round: number, kind: K, value: RecordTypes[K]): void {
      const key = recordKey(round, kind);
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      if (persistent) {
        try { storage!.setItem(key, raw); } catch { persistent = false; }
      }
    },
    remove,
  };
}

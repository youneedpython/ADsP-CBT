import type { Answer } from '../data/types';
import type { ResolvedQuestions } from '../domain/practiceSets';
import { isAnswer } from '../domain/scoring';

export interface SetRecord { signature: string; current: number; answers: Record<string, Answer> }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const ref = (key: string) => /^[1-9]\d*:[1-9]\d*$/.test(key);
export function validSetRecord(value: unknown, signature: string, keys: string[]): value is SetRecord {
  return object(value) && value.signature === signature && Number.isSafeInteger(value.current)
    && Number(value.current) >= 1 && Number(value.current) <= keys.length && object(value.answers)
    && Object.entries(value.answers).every(([key, answer]) => keys.includes(key) && isAnswer(answer));
}
export function validResolved(value: unknown): value is ResolvedQuestions {
  return object(value) && Object.entries(value).every(([key, time]) => ref(key) && typeof time === 'string' && time.trim() !== '' && Number.isFinite(Date.parse(time)));
}

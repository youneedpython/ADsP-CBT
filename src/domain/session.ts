import type { Answer } from '../data/types';
import { isAnswer, type Answers } from './scoring';

export interface SessionState { answers: Answers; current: number }

export function selectPracticeAnswer<T extends SessionState>(state: T, question: number, answer: Answer): T {
  if (Object.hasOwn(state.answers, question)) return state;
  return { ...state, answers: { ...state.answers, [question]: answer } };
}

export function selectExamAnswer<T extends SessionState>(state: T, question: number, answer: Answer): T {
  const answers = { ...state.answers };
  if (answers[question] === answer) delete answers[question];
  else answers[question] = answer;
  return { ...state, answers };
}

export function getProgress(answers: Answers, questionNumbers: readonly number[]) {
  const unanswered = questionNumbers.filter(number => !Object.hasOwn(answers, number) || !isAnswer(answers[number]));
  return { answeredCount: questionNumbers.length - unanswered.length, unanswered };
}

/** Ignore clock rollback and suspended updates; timestamps are milliseconds. */
export function accumulateElapsed(elapsedSeconds: number, start: number, end: number): number {
  const gap = end - start;
  return elapsedSeconds + (gap > 5000 ? 0 : Math.max(0, Math.floor(gap / 1000)));
}

export function getTiming(elapsedSeconds: number, timeLimitMinutes: number) {
  const remainingSeconds = timeLimitMinutes * 60 - elapsedSeconds;
  return { elapsedSeconds, remainingSeconds, overtimeSeconds: Math.max(0, -remainingSeconds) };
}

export function formatRemainingTime(remainingSeconds: number): string {
  const seconds = Math.floor(Math.abs(remainingSeconds));
  return `${remainingSeconds < 0 ? '초과 ' : ''}${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function isTimeWarning(remainingSeconds: number): boolean {
  return remainingSeconds <= 600;
}

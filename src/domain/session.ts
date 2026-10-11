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

/** Times are milliseconds since the Unix epoch; remainingSeconds is signed. */
export function getTiming(startedAt: number, now: number, timeLimitMinutes: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
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

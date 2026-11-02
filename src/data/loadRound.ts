import { exams, type Exam } from '../domain/exams';
import type { RoundData, RoundSummary } from './types';
export const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;
export async function loadRound(summary: RoundSummary, signal?: AbortSignal, exam: Exam = exams[0]): Promise<RoundData> {
  const response = await fetch(dataUrl(summary.file), { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('회차 HTTP 오류');
  const data = await response.json() as RoundData;
  if (!data || data.formatVersion !== 1 || !Array.isArray(data.questions) || !data.questions.length
    || !Array.isArray(data.subjects) || data.round !== summary.round) throw new Error('회차 형식 오류');
  if (data.subjects.length !== exam.subjects.length || data.subjects.some((s, i) => s.id !== exam.subjects[i].id || s.name !== exam.subjects[i].name)) throw new Error('시험 과목 형식 오류');
  return data;
}

import type { RoundData, RoundSummary } from './types';
export const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;
export async function loadRound(summary: RoundSummary, signal?: AbortSignal): Promise<RoundData> {
  const response = await fetch(dataUrl(summary.file), { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('회차 HTTP 오류');
  const data = await response.json() as RoundData;
  if (!data || data.formatVersion !== 1 || !Array.isArray(data.questions) || !data.questions.length
    || !Array.isArray(data.subjects) || data.round !== summary.round) throw new Error('회차 형식 오류');
  return data;
}

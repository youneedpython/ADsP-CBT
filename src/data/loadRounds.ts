import type { RoundSummary } from './types';

function isRound(value: unknown): value is RoundSummary {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return ['round', 'questionCount', 'timeLimitMinutes'].every(
    key => typeof item[key] === 'number' && Number.isInteger(item[key]) && (item[key] as number) > 0,
  ) && typeof item.title === 'string' && item.title.trim() !== ''
    && typeof item.file === 'string' && item.file.trim() !== '';
}
export async function loadRounds(signal?: AbortSignal): Promise<RoundSummary[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/rounds.json`, { signal });
  if (!response.ok) throw new Error('회차 목록 HTTP 오류');
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isRound)) throw new Error('회차 목록 형식 오류');
  return [...data].sort((a, b) => b.round - a.round);
}

import type { TopicsData } from './types';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const positive = (value: string) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));

export function isTopicsData(value: unknown): value is TopicsData {
  if (!object(value) || !keys(value, ['formatVersion', 'topics', 'questions']) || value.formatVersion !== 1
    || !Array.isArray(value.topics) || !object(value.questions)) return false;
  const ids = new Set<string>(), used = new Set<string>();
  for (const topic of value.topics) {
    if (!object(topic) || !keys(topic, ['id', 'name', 'subject']) || typeof topic.id !== 'string'
      || !/^T\d{3}$/.test(topic.id) || ids.has(topic.id) || typeof topic.name !== 'string' || !topic.name.trim()
      || ![1, 2, 3].includes(topic.subject as number)) return false;
    ids.add(topic.id);
  }
  for (const [round, questions] of Object.entries(value.questions)) {
    if (!positive(round) || !object(questions)) return false;
    for (const [number, id] of Object.entries(questions)) {
      if (!positive(number) || typeof id !== 'string' || !ids.has(id)) return false;
      used.add(id);
    }
  }
  return [...ids].every(id => used.has(id));
}

export async function loadTopics(signal?: AbortSignal): Promise<TopicsData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/topics.json`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('주제 목록 HTTP 오류');
  const data: unknown = await response.json();
  if (!isTopicsData(data)) throw new Error('주제 목록 형식 오류');
  return data;
}

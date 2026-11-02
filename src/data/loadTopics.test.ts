import { afterEach, expect, test, vi } from 'vitest';
import { loadTopics } from './loadTopics';
import { exams } from '../domain/exams';

test.each(['valid', 'ADsP ID', 'third subject'])('SQLD topic loading: %s', async variant => {
  const exam = exams.find(item => item.id === 'sqld')!;
  const id = variant === 'ADsP ID' ? 'T101' : 'S101';
  const data = { formatVersion: 1, topics: [{ id, name: '새 개발용 주제', subject: variant === 'third subject' ? 3 : 2 }], questions: { 900: { 1: id } } };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetchMock);
  if (variant === 'valid') expect(await loadTopics(undefined, exam)).toEqual(data);
  else await expect(loadTopics(undefined, exam)).rejects.toThrow('형식');
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/sqld/topics.json`, { signal: undefined, cache: 'no-cache' });
});

afterEach(() => vi.unstubAllGlobals());
const sample = () => ({ formatVersion: 1, topics: [{ id: 'T101', name: '개발용 표본 주제', subject: 1 }], questions: { '900': { '1': 'T101' } } });

test.each([undefined, new AbortController().signal])('loads topics with no-cache and signal %s', async signal => {
  const data = sample();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetchMock);
  expect(await loadTopics(signal)).toEqual(data);
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/topics.json`, { signal, cache: 'no-cache' });
});

test.each([
  null, [], {},
  { ...sample(), formatVersion: 2 },
  { ...sample(), extra: true },
  { ...sample(), topics: null },
  { ...sample(), topics: [null] },
  { ...sample(), topics: [{ id: 'T1', name: '표본', subject: 1 }] },
  { ...sample(), topics: [{ id: 'T101', name: ' ', subject: 1 }] },
  { ...sample(), topics: [{ id: 'T101', name: '표본', subject: '1' }] },
  { ...sample(), topics: [{ id: 'T101', name: '표본', subject: 4 }] },
  { ...sample(), topics: [{ ...sample().topics[0], extra: true }] },
  { ...sample(), topics: [...sample().topics, ...sample().topics] },
  { ...sample(), topics: [...sample().topics, { id: 'T201', name: '미사용 표본', subject: 2 }] },
  { ...sample(), questions: null },
  { ...sample(), questions: [] },
  { ...sample(), questions: { '0': { '1': 'T101' } } },
  { ...sample(), questions: { '900': [] } },
  { ...sample(), questions: { '900': { '01': 'T101' } } },
  { ...sample(), questions: { '900': { '1': 'T999' } } },
  { ...sample(), questions: { '900': { '1': ['T101'] } } },
])('rejects malformed topics %j', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  await expect(loadTopics()).rejects.toThrow('형식');
});

test('rejects HTTP errors without parsing JSON', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(loadTopics()).rejects.toThrow('HTTP');
  expect(json).not.toHaveBeenCalled();
});

test('propagates malformed JSON and fetch cancellation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('JSON'); } }));
  await expect(loadTopics()).rejects.toThrow(SyntaxError);
  const error = new DOMException('Cancelled', 'AbortError');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(loadTopics()).rejects.toBe(error);
});

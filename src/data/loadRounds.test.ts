import { afterEach, expect, test, vi } from 'vitest';
import { loadRounds } from './loadRounds';

afterEach(() => vi.unstubAllGlobals());
const summary = { round: 50, year: 2026, title: '표본', questionCount: 50, timeLimitMinutes: 90, file: '50.json' };

test.each([undefined, null, '2026', 2025.5, 1999, 2101])('rejects invalid year %s', async year => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...summary, year }] }));
  await expect(loadRounds()).rejects.toThrow('회차 목록 형식 오류');
});

test('preserves years and sorts rounds without changing the response', async () => {
  const data = [{ ...summary, round: 45, year: 2000 }, { ...summary, year: 2100 }];
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  expect(await loadRounds()).toEqual([data[1], data[0]]);
  expect(data.map(item => item.round)).toEqual([45, 50]);
});
test.each([undefined, new AbortController().signal])('revalidates the configured base URL with signal %s', async signal => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal('fetch', fetchMock);
  expect(await loadRounds(signal)).toEqual([]);
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/rounds.json`, { signal, cache: 'no-cache' });
});
test('rejects HTTP errors without reading JSON', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(loadRounds()).rejects.toThrow('HTTP');
  expect(json).not.toHaveBeenCalled();
});
test('rejects JSON errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('JSON'); } }));
  await expect(loadRounds()).rejects.toThrow(SyntaxError);
});
test.each([null, {}, '표본', [{ round: 1 }]])('rejects invalid response %j', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  await expect(loadRounds()).rejects.toThrow('형식');
});

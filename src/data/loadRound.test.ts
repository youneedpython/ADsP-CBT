import { afterEach, expect, test, vi } from 'vitest';
import { dataUrl, loadRound } from './loadRound';
const summary = { round: 50, year: 2026, title: '표본', questionCount: 1, timeLimitMinutes: 90, file: '50.json' };
afterEach(() => vi.unstubAllGlobals());
test.each([undefined, new AbortController().signal])('revalidates the base data address with signal %s', async signal => {
  const data = { formatVersion: 1, round: 50, subjects: [], questions: [{}] };
  const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', mock);
  expect(await loadRound(summary, signal)).toEqual(data);
  expect(mock).toHaveBeenCalledWith(dataUrl('50.json'), { signal, cache: 'no-cache' });
});
test.each([null, {}, { formatVersion: 2, questions: [] }, { formatVersion: 1, questions: {} }])('rejects malformed data %j', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  await expect(loadRound(summary)).rejects.toThrow();
});
test('rejects HTTP failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(loadRound(summary)).rejects.toThrow('HTTP');
});
test('rejects invalid JSON', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('표본'); } }));
  await expect(loadRound(summary)).rejects.toThrow();
});

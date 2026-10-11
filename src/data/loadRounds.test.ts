import { afterEach, expect, test, vi } from 'vitest';
import { loadRounds } from './loadRounds';

afterEach(() => vi.unstubAllGlobals());
test('uses the configured base URL', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal('fetch', fetchMock);
  expect(await loadRounds()).toEqual([]);
  expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/rounds.json`, { signal: undefined });
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

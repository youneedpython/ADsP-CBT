import { afterEach, expect, test, vi } from 'vitest';
import { isDownloadsData, loadDownloads } from './loadDownloads';
import { formatFileSize } from '../components/DownloadLinks';
const sample = { formatVersion: 1, rounds: { 900: { type1: { file: 'pdf/900-type1.pdf', bytes: 1024 } } } };
afterEach(() => vi.unstubAllGlobals());
test('loads with base URL, no-cache and signal', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample }); vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  expect(await loadDownloads(signal)).toEqual(sample);
  expect(fetch).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/downloads.json`, { cache: 'no-cache', signal });
});
test.each([null, {}, { ...sample, formatVersion: 2 }, { formatVersion: 1, rounds: { 900: { other: {} } } }, { formatVersion: 1, rounds: { 900: { type1: { file: '../a.pdf', bytes: 1 } } } }])('rejects invalid data %j', async value => {
  expect(isDownloadsData(value)).toBe(false);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => value }));
  await expect(loadDownloads()).rejects.toThrow();
});
test('HTTP and JSON errors propagate', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); await expect(loadDownloads()).rejects.toThrow();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error(); } })); await expect(loadDownloads()).rejects.toThrow();
});
test.each([[286627, '280 KB'], [342317, '334 KB'], [1024, '1 KB'], [1536, '2 KB'], [1048575, '1024 KB'], [1048576, '1.0 MB'], [1572864, '1.5 MB']])('formats %i bytes', (bytes, size) => expect(formatFileSize(bytes as number)).toBe(size));

import { afterEach, expect, test, vi } from 'vitest';
import { isDownloadsData, loadDownloads } from './loadDownloads';
import { formatFileSize } from '../components/DownloadLinks';
const sample = { formatVersion: 1, rounds: { 900: { type1: { file: 'pdf/900-type1.pdf', bytes: 1024 } } } };
const subject = { id: '3-2', label: '3과목 2장', name: '표본 통계', questionCount: 94, summary: sample.rounds[900].type1 };
test('accepts optional subjects and either PDF kind', () => {
  expect(isDownloadsData({ ...sample, subjects: [] })).toBe(true);
  expect(isDownloadsData({ ...sample, subjects: [subject] })).toBe(true);
  expect(isDownloadsData({ ...sample, subjects: [{ ...subject, solutions: subject.summary }] })).toBe(true);
});
test.each([
  {}, [null], [{ ...subject, id: '0' }], [subject, subject], [{ ...subject, label: ' ' }],
  [{ ...subject, name: '' }], [{ ...subject, questionCount: 0 }], [{ ...subject, questionCount: 1.5 }],
  [{ ...subject, summary: undefined }], [{ ...subject, other: true }],
  [{ ...subject, summary: { file: '../outside.pdf', bytes: 1 } }],
  [{ id: '1', label: '표본', name: '표본', questionCount: 1 }],
])('rejects malformed subjects %j', subjects => expect(isDownloadsData({ ...sample, subjects })).toBe(false));
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

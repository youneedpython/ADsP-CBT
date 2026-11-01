import { afterEach, expect, test, vi } from 'vitest';
import { isDownloadsData, loadDownloads } from './loadDownloads';
import { formatFileSize } from '../components/DownloadLinks';
const sample = { formatVersion: 1, rounds: { 900: { type1: { file: 'pdf/900-type1.pdf', bytes: 1024, pages: 23 } } } };
const subject = { id: '3-2', subject: 3, subjectName: 'Sample', chapter: 2, name: '표본 통계', questionCount: 94, summary: sample.rounds[900].type1 };
test('accepts optional subjects and either PDF kind', () => {
  expect(isDownloadsData({ ...sample, subjects: [{ ...subject, id: '3', chapter: undefined }] })).toBe(false);
  const { chapter: _chapter, ...whole } = subject;
  expect(isDownloadsData({ ...sample, subjects: [{ ...whole, id: '3' }] })).toBe(true);
  expect(isDownloadsData({ ...sample, subjects: [] })).toBe(true);
  expect(isDownloadsData({ ...sample, subjects: [subject] })).toBe(true);
  expect(isDownloadsData({ ...sample, subjects: [{ ...subject, solutions: subject.summary }] })).toBe(true);
});

test.each([undefined, 0, 1.5, -1, '23'])('rejects invalid pages in round and subject files: %s', pages => {
  const file = { ...sample.rounds[900].type1, pages };
  expect(isDownloadsData({ ...sample, rounds: { 900: { type1: file } } })).toBe(false);
  expect(isDownloadsData({ ...sample, subjects: [{ ...subject, summary: file }] })).toBe(false);
});
test.each([{ subject: 2 }, { subject: '3' }, { chapter: 1 }, { chapter: undefined }, { subjectName: '' }, { subjectName: ' ' }, { id: '3', chapter: 2 }, { label: 'old' }])('rejects inconsistent subject metadata %j', changes => {
  expect(isDownloadsData({ ...sample, subjects: [{ ...subject, ...changes }] })).toBe(false);
});
test.each([
  {}, [null], [{ ...subject, id: '0' }], [subject, subject], [{ ...subject, label: ' ' }],
  [{ ...subject, name: '' }], [{ ...subject, questionCount: 0 }], [{ ...subject, questionCount: 1.5 }],
  [{ ...subject, summary: undefined }], [{ ...subject, other: true }],
  [{ ...subject, summary: { file: '../outside.pdf', bytes: 1, pages: 23 } }],
  [{ id: '1', subject: 1, subjectName: 'Sample', name: '표본', questionCount: 1 }],
])('rejects malformed subjects %j', subjects => expect(isDownloadsData({ ...sample, subjects })).toBe(false));
afterEach(() => vi.unstubAllGlobals());
test('loads with base URL, no-cache and signal', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample }); vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  expect(await loadDownloads(signal)).toEqual(sample);
  expect(fetch).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/downloads.json`, { cache: 'no-cache', signal });
});
test.each([null, {}, { ...sample, formatVersion: 2 }, { formatVersion: 1, rounds: { 900: { other: {} } } }, { formatVersion: 1, rounds: { 900: { type1: { file: '../a.pdf', bytes: 1, pages: 23 } } } }])('rejects invalid data %j', async value => {
  expect(isDownloadsData(value)).toBe(false);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => value }));
  await expect(loadDownloads()).rejects.toThrow();
});
test('HTTP and JSON errors propagate', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); await expect(loadDownloads()).rejects.toThrow();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error(); } })); await expect(loadDownloads()).rejects.toThrow();
});
test.each([[286627, '280 KB'], [342317, '334 KB'], [1024, '1 KB'], [1536, '2 KB'], [1048575, '1024 KB'], [1048576, '1.0 MB'], [1572864, '1.5 MB']])('formats %i bytes', (bytes, size) => expect(formatFileSize(bytes as number)).toBe(size));

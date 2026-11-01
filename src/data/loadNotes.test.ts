import { afterEach, expect, test, vi } from 'vitest';
import { isNotesData, loadNotes } from './loadNotes';
import { notesFixture } from '../test/notesFixture';
afterEach(() => vi.unstubAllGlobals());
test('valid notes and no-cache / abort signal', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => notesFixture() }));
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  expect(await loadNotes('1', signal)).toEqual(notesFixture());
  expect(fetcher).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/notes/1.json`, { signal, cache: 'no-cache' });
});
test.each(['../1', '0', '1/2'])('invalid id %s never fetches', async id => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(loadNotes(id)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
});
test.each([false, true])('HTTP and format errors reject: %s', async ok => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => ({}) })));
  await expect(loadNotes('1')).rejects.toThrow();
});
test.each([
  (d: any) => d.extra = true,
  (d: any) => d.units[0].blocks[0].extra = true,
  (d: any) => d.units[0].blocks[0].type = 'html',
  (d: any) => d.units[0].blocks[0].text = ' ',
  (d: any) => d.units[0].number = 2,
  (d: any) => d.units[0].topics.push('T101'),
  (d: any) => d.units[0].blocks[4].rows.push(['one', 'two']),
  (d: any) => d.units[0].blocks[7].src = 'notes/2/sample.png',
  (d: any) => d.units[0].blocks[7].width = 0,
  (d: any) => d.units[0].blocks[5].blocks = [{ type: 'heading', text: 'bad' }],
  (d: any) => d.units[0].blocks[3].items[0].items[0].items = [{ text: 'third' }],
])('rejects malformed notes %#', mutate => {
  const data = notesFixture(); mutate(data); expect(isNotesData(data)).toBe(false);
});

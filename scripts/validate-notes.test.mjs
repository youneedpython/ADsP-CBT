// @vitest-environment node
import { test, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateNotes } from './validate-notes.mjs';
import { notesFixture } from '../src/test/notesFixture.ts';
async function check(mutate = () => {}, files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'adsp-notes-'));
  try {
    await mkdir(path.join(root, 'data/notes'), { recursive: true });
    await mkdir(path.join(root, 'notes/1'), { recursive: true });
    const notes = notesFixture(); mutate(notes);
    await writeFile(path.join(root, 'data/notes/1.json'), JSON.stringify(notes));
    await writeFile(path.join(root, 'data/downloads.json'), JSON.stringify({ subjects: [{ id: '1', subject: 1, notes: 'notes/1.json', summary: { file: 'pdf/sample.pdf' } }] }));
    await writeFile(path.join(root, 'data/topics.json'), JSON.stringify({ topics: [{ id: 'T101' }] }));
    await writeFile(path.join(root, 'notes/1/sample.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    for (const [file, content] of Object.entries(files)) {
      if (content === null) await rm(path.join(root, file));
      else await writeFile(path.join(root, file), content);
    }
    return await validateNotes(path.join(root, 'data'));
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('accepts valid sample notes and PNG', async () => expect(await check()).toEqual({ errors: [], notesCount: 1 }));
test('accepts code blocks and a unit without ref', async () => {
  expect(await check(d => {
    delete d.units[0].ref;
    d.units[0].blocks.push({ type: 'code', text: '  x <- 1\n    print(x)' });
  })).toEqual({ errors: [], notesCount: 1 });
});
test.each([
  d => d.id = '2', d => d.subject = 2, d => d.chapter = 1, d => d.pdf = 'pdf/other.pdf',
  d => d.units[0].topics = ['T999'], d => d.units[0].number = 2,
  d => d.units[0].blocks[0].type = 'unknown', d => d.units[0].blocks[0].unknown = true,
  d => d.units[0].blocks[0].text = '', d => d.units[0].blocks[4].rows.push(['a', 'b']),
  d => d.units[0].blocks[7].src = 'notes/1/../sample.png',
  d => d.units[0].blocks[5].blocks = [{ type: 'figure' }],
  d => d.units[0].blocks[3].items[0].items[0].items = [{ text: 'third' }],
])('rejects invalid notes %#', async mutate => expect((await check(mutate)).errors.length).toBeGreaterThan(0));
test.each([
  { 'notes/1/sample.png': null }, { 'notes/1/sample.png': 'not PNG' },
  { 'notes/1/unused.png': 'unused' }, { 'data/notes/extra.json': '{}' },
])('rejects missing / invalid / unlisted files %j', async files => expect((await check(undefined, files)).errors.length).toBeGreaterThan(0));

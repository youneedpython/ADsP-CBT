// @vitest-environment node
import { test, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateDownloads } from './validate-downloads.mjs';
async function check(mutate = () => {}, content = '%PDF-sample', extra = false, rounds = [{ round: 900 }]) {
  const dir = await mkdtemp(path.join(tmpdir(), 'adsp-pdf-'));
  try {
    await mkdir(path.join(dir, 'data')); await mkdir(path.join(dir, 'pdf'));
    const data = { formatVersion: 1, rounds: { 900: { type1: { file: 'pdf/900-type1.pdf', bytes: 11 } } } };
    mutate(data);
    await writeFile(path.join(dir, 'data/downloads.json'), JSON.stringify(data));
    await writeFile(path.join(dir, 'pdf/900-type1.pdf'), content);
    if (extra) await writeFile(path.join(dir, 'pdf/extra.pdf'), '%PDF-');
    return await validateDownloads(path.join(dir, 'data'), rounds);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
test('valid sample PDF', async () => expect(await check()).toEqual({ errors: [], pdfCount: 1 }));
test('rejects a subject-prefixed key inside rounds', async () => {
  const result = await check(d => {
    d.rounds['subject-1'] = { summary: d.rounds[900].type1 };
  });
  expect(result.errors).toContain('PDF 없는 회차 subject-1');
  expect(result.errors).toContain('PDF 유형 오류 subject-1');
});
const subject = { id: '3-2', label: '3과목 2장', name: '개발용 표본', questionCount: 94, summary: { file: 'pdf/900-type1.pdf', bytes: 11 } };
test('counts subject PDFs and accepts either kind', async () => {
  expect(await check(d => d.subjects = [subject])).toEqual({ errors: [], pdfCount: 2 });
  expect(await check(d => d.subjects = [{ ...subject, summary: undefined, solutions: subject.summary }])).toEqual({ errors: [], pdfCount: 2 });
});
test.each([
  {}, [null], [{ ...subject, id: '3-0' }], [subject, subject], [{ ...subject, label: ' ' }],
  [{ ...subject, name: '' }], [{ ...subject, questionCount: 0 }], [{ ...subject, questionCount: 1.5 }],
  [{ id: '1', label: '표본', name: '표본', questionCount: 1 }], [{ ...subject, other: true }],
  [{ ...subject, summary: { file: 'pdf/../outside.pdf', bytes: 11 } }],
  [{ ...subject, summary: { file: 'pdf/900-type1.pdf', bytes: 12 } }],
])('rejects malformed subjects %j', async subjects => expect((await check(d => d.subjects = subjects)).errors.length).toBeGreaterThan(0));
test('skips malformed round entries before a valid round', async () => {
  const rounds = [null, false, 900, '900', [], {}, { round: '900' }, { round: 900 }];
  expect(await check(undefined, undefined, false, rounds)).toEqual({ errors: [], pdfCount: 1 });
});
test('reports a validation error when malformed entries contain no valid round', async () => {
  const rounds = [null, false, 900, '900', [], {}, { round: '900' }, { round: 0 }, { round: 900.5 }];
  expect(await check(undefined, undefined, false, rounds)).toEqual({ errors: ['PDF 없는 회차 900'], pdfCount: 1 });
});
test.each([
  ['unknown round', d => d.rounds[901] = d.rounds[900]],
  ['unknown type', d => d.rounds[900].other = {}],
  ['traversal', d => d.rounds[900].type1.file = 'pdf/../900-type1.pdf'],
  ['absolute', d => d.rounds[900].type1.file = '/pdf/900-type1.pdf'],
  ['Windows absolute', d => d.rounds[900].type1.file = 'C:\\900.pdf'],
  ['size mismatch', d => d.rounds[900].type1.bytes = 100],
  ['extension', d => d.rounds[900].type1.file = 'pdf/900.txt'],
  ['version', d => d.formatVersion = 2],
])('rejects %s', async (_name, mutate) => expect((await check(mutate)).errors.length).toBeGreaterThan(0));
test('rejects non PDF bytes', async () => expect((await check(undefined, 'not pdf')).errors.length).toBeGreaterThan(0));
test('rejects unlisted PDF', async () => expect((await check(undefined, undefined, true)).errors.length).toBeGreaterThan(0));
test('missing list fails', async () => expect((await validateDownloads('absent', [])).errors.length).toBeGreaterThan(0));

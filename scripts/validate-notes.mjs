import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isNotesData } from '../src/data/loadNotes.ts';

export async function validateNotes(directory) {
  const errors = [], listed = new Set(), images = new Set();
  let notesCount = 0;
  try {
    const downloads = JSON.parse(await readFile(path.join(directory, 'downloads.json'), 'utf8'));
    const subjects = Array.isArray(downloads.subjects) ? downloads.subjects : [];
    const ids = new Set(JSON.parse(await readFile(path.join(directory, 'topics.json'), 'utf8')).topics.map(t => t.id));
    for (const subject of subjects.filter(s => s?.notes !== undefined)) {
      if (typeof subject.notes !== 'string' || !/^notes\/[A-Za-z0-9-]+\.json$/.test(subject.notes)) { errors.push('핵심 요약 경로 오류'); continue; }
      listed.add(subject.notes.slice(6));
      try {
        const target = await contained(path.join(directory, 'notes'), subject.notes.slice(6));
        const data = JSON.parse(await readFile(target, 'utf8'));
        if (!isNotesData(data)) throw new Error('형식 오류');
        if (data.id !== subject.id || data.subject !== subject.subject || data.chapter !== subject.chapter || data.pdf !== subject.summary?.file) throw new Error('과목 / PDF 불일치');
        if (subject.notes !== `notes/${data.id}.json`) throw new Error('ID 경로 불일치');
        for (const unit of data.units) {
          if (unit.topics.some(t => !ids.has(t))) errors.push(`핵심 요약 없는 주제 ${data.id}`);
          for (const block of unit.blocks) if (block.type === 'figure') {
            images.add(block.src.slice(6));
            try {
              await contained(path.join(directory, '../notes'), block.src.slice(6));
              const file = await contained(path.join(directory, '../notes', data.id), block.src.split('/').at(-1));
              const bytes = await readFile(file);
              if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error();
            } catch { errors.push(`핵심 요약 그림 오류 ${block.src}`); }
          }
        }
        notesCount++;
      } catch { errors.push(`핵심 요약 파일 / 형식 / 과목 오류 ${subject.notes}`); }
    }
    await unlisted(path.join(directory, 'notes'), /\.json$/i, listed, errors);
    await unlisted(path.join(directory, '../notes'), /./, images, errors);
  } catch { errors.push('핵심 요약 목록 읽기 오류'); }
  return { errors, notesCount };
}
async function contained(root, name) {
  const base = await realpath(root), target = await realpath(path.join(root, name));
  const relative = path.relative(base, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error();
  return target;
}
async function unlisted(root, pattern, listed, errors) {
  try {
    for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isDirectory()) {
        const name = path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
        if (pattern.test(name) && !listed.has(name)) errors.push(`목록에 없는 핵심 요약 파일 ${name}`);
      }
    }
  } catch (e) { if (e.code !== 'ENOENT' || listed.size) errors.push('핵심 요약 폴더 읽기 오류'); }
}

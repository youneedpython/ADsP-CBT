import { readFile, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, allowed) => Object.keys(v).every(k => allowed.includes(k));
export async function validateDownloads(directory, rounds, pdfDirectory = path.join(directory, '../pdf')) {
  const errors = [], listed = new Set();
  let pdfCount = 0, data;
  try { data = JSON.parse(await readFile(path.join(directory, 'downloads.json'), 'utf8')); }
  catch { return { errors: ['downloads.json 읽기 / JSON 오류'], pdfCount }; }
  if (!object(data) || !keys(data, ['formatVersion', 'rounds']) || data.formatVersion !== 1 || !object(data.rounds)) return { errors: ['downloads.json 형식 오류'], pdfCount };
  for (const [round, files] of Object.entries(data.rounds)) {
    if (!/^[1-9]\d*$/.test(round) || !rounds.some(r => object(r) && Number.isSafeInteger(r.round) && r.round > 0 && r.round === Number(round))) errors.push(`PDF 없는 회차 ${round}`);
    if (!object(files) || !keys(files, ['type1', 'type2'])) { errors.push(`PDF 유형 오류 ${round}`); continue; }
    for (const file of Object.values(files)) {
      if (!object(file) || !keys(file, ['file', 'bytes']) || typeof file.file !== 'string' || !/^pdf\/[A-Za-z0-9_-]+\.pdf$/.test(file.file) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0) { errors.push(`PDF 파일 형식 오류 ${round}`); continue; }
      listed.add(file.file.slice(4));
      try {
        const root = await realpath(pdfDirectory), target = await realpath(path.join(pdfDirectory, file.file.slice(4)));
        const relative = path.relative(root, target);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error();
        const bytes = await readFile(target);
        if (bytes.subarray(0, 5).toString() !== '%PDF-' || bytes.length !== file.bytes) throw new Error();
        pdfCount++;
      } catch { errors.push(`PDF 파일 / 크기 오류 ${round}`); }
    }
  }
  try {
    for (const entry of await readdir(pdfDirectory, { recursive: true })) if (/\.pdf$/i.test(entry) && !listed.has(entry)) errors.push(`목록에 없는 PDF ${entry}`);
  } catch (error) { if (listed.size || error.code !== 'ENOENT') errors.push('PDF 폴더 읽기 오류'); }
  return { errors, pdfCount };
}

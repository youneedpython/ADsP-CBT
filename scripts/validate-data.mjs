import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTopics } from './validate-topics.mjs';

export async function isDirectExecution(moduleUrl, argument = process.argv[1]) {
  if (!argument) return false;
  try { return await realpath(argument) === await realpath(fileURLToPath(moduleUrl)); }
  catch { return false; }
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function defaultDirectory() {
  return fileURLToPath(new URL('../public/data/', import.meta.url));
}

// Resolve real paths as well as lexical paths so references stay in the data folder.
async function localFile(directory, name) {
  if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.includes('\\')) throw new Error('invalid relative file');
  const root = await realpath(directory);
  const target = await realpath(path.resolve(root, name));
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('file outside data folder');
  return target;
}

export async function validateData(directory = defaultDirectory()) {
  const errors = [];
  let roundCount = 0;
  let questionCount = 0;
  let topicCount = 0;
  const expectedTopics = {};
  const add = (round, number, reason) => errors.push(`회차 ${round ?? '?'}${number === undefined ? '' : ` 문항 ${number}`} : ${reason}`);
  const keys = (value, allowed, round, number) => {
    if (!object(value)) { add(round, number, '객체 형식 필요'); return false; }
    for (const key of Object.keys(value)) if (!allowed.includes(key)) add(round, number, `정의하지 않은 항목 ${key}`);
    return true;
  };
  const string = (value, round, number, label, required = false) => {
    if (typeof value !== 'string' || (required && !nonempty(value))) add(round, number, `${label} 문자열 오류`);
    if (typeof value === 'string' && (value.match(/\$/g) ?? []).length % 2) add(round, number, `${label} $ 개수가 홀수`);
  };
  let rounds;
  try { rounds = JSON.parse(await readFile(path.join(directory, 'rounds.json'), 'utf8')); }
  catch { add(undefined, undefined, 'rounds.json 읽기 / JSON 오류'); return { errors, roundCount, questionCount }; }
  if (!Array.isArray(rounds)) { add(undefined, undefined, 'rounds.json 배열 필요'); return { errors, roundCount, questionCount }; }
  const seen = new Set();
  for (const entry of rounds) {
    const r = entry?.round;
    if (!keys(entry, ['round', 'year', 'title', 'questionCount', 'timeLimitMinutes', 'file'], r)) continue;
    if (!Number.isInteger(entry.year) || entry.year < 2000 || entry.year > 2100) add(r, undefined, 'year는 2000 ~ 2100 정수 필요');
    if (!Number.isInteger(r) || r < 1 || seen.has(r)) add(r, undefined, '회차 번호 오류 / 중복');
    seen.add(r);
    expectedTopics[r] = [];
    string(entry.title, r, undefined, 'title', true);
    if (!Number.isInteger(entry.questionCount) || entry.questionCount < 0) add(r, undefined, 'questionCount 오류');
    if (entry.timeLimitMinutes !== 90) add(r, undefined, 'timeLimitMinutes는 90 필요');
    let data;
    try { data = JSON.parse(await readFile(await localFile(directory, entry.file), 'utf8')); }
    catch { add(r, undefined, '회차 파일 읽기 / JSON 오류'); continue; }
    roundCount++;
    if (!keys(data, ['formatVersion', 'round', 'title', 'timeLimitMinutes', 'subjects', 'questions'], r)) continue;
    if (data.round !== r || data.title !== entry.title) add(r, undefined, 'round / title 불일치');
    if (data.formatVersion !== 1) add(r, undefined, 'formatVersion은 1 필요');
    if (data.timeLimitMinutes !== 90) add(r, undefined, 'timeLimitMinutes는 90 필요');
    if (!Array.isArray(data.subjects) || data.subjects.length !== 3 || data.subjects.some((s, i) => s?.id !== i + 1)) add(r, undefined, 'subjects id는 1, 2, 3 필요');
    if (Array.isArray(data.subjects)) for (const s of data.subjects) if (keys(s, ['id', 'name'], r)) string(s.name, r, undefined, 'subject name', true);
    if (!Array.isArray(data.questions)) { add(r, undefined, 'questions 배열 필요'); continue; }
    questionCount += data.questions.length;
    expectedTopics[r] = data.questions.map(q => q?.number);
    if (data.questions.length !== entry.questionCount) add(r, undefined, 'questionCount 불일치');
    const counts = [0, 0, 0];
    for (const [index, q] of data.questions.entries()) {
      const n = q?.number ?? index + 1;
      if (!keys(q, ['number', 'subject', 'question', 'stimulus', 'choices', 'answer', 'explanation'], r, n)) continue;
      if (q.number !== index + 1) add(r, n, '문항 번호 연속 순서 오류');
      if (![1, 2, 3].includes(q.subject)) add(r, n, 'subject는 1 ~ 3 필요');
      else counts[q.subject - 1]++;
      string(q.question, r, n, 'question', true);
      if (!Array.isArray(q.choices) || q.choices.length !== 4) add(r, n, 'choices 4개 필요');
      if (Array.isArray(q.choices)) q.choices.forEach(c => string(c, r, n, 'choice', true));
      if (!Number.isInteger(q.answer) || q.answer < 1 || q.answer > 4) add(r, n, 'answer는 1 ~ 4 정수 필요');
      string(q.explanation, r, n, 'explanation');
      if (!Array.isArray(q.stimulus)) { add(r, n, 'stimulus 배열 필요'); continue; }
      for (const s of q.stimulus) {
        const allowed = { text: ['type', 'text'], code: ['type', 'text'], table: ['type', 'rows'], image: ['type', 'src', 'alt'] }[s?.type];
        if (!allowed) { add(r, n, 'stimulus type 오류'); continue; }
        if (!keys(s, allowed, r, n)) continue;
        if (s.type === 'text' || s.type === 'code') string(s.text, r, n, 'stimulus text');
        if (s.type === 'table') {
          if (!Array.isArray(s.rows) || !s.rows.length || s.rows.some(row => !Array.isArray(row) || !row.length || row.length !== s.rows[0]?.length)) add(r, n, 'table 행 / 열 수 오류');
          if (Array.isArray(s.rows)) for (const row of s.rows) if (Array.isArray(row)) row.forEach(cell => string(cell, r, n, 'table cell'));
        }
        if (s.type === 'image') {
          string(s.alt, r, n, 'image alt', true);
          try { await readFile(await localFile(directory, s.src)); } catch { add(r, n, 'image src 파일 없음 / 오류'); }
        }
      }
    }
    if (counts.some((count, i) => count !== [10, 10, 30][i])) add(r, undefined, '과목별 문항 수 10 / 10 / 30 필요');
  }
  try {
    const topics = JSON.parse(await readFile(path.join(directory, 'topics.json'), 'utf8'));
    errors.push(...validateTopics(topics, expectedTopics));
    if (Array.isArray(topics?.topics)) topicCount = topics.topics.length;
  } catch { add(undefined, undefined, 'topics.json 읽기 / JSON 오류'); }
  return { errors, roundCount, questionCount, topicCount };
}

if (await isDirectExecution(import.meta.url)) {
  const result = await validateData(process.argv[2]);
  if (result.errors.length) result.errors.forEach(error => console.error(error));
  else console.log(`회차 ${result.roundCount}개, 문항 ${result.questionCount}개, 주제 ${result.topicCount}개 검사 통과`);
  process.exitCode = result.errors.length ? 1 : 0;
}

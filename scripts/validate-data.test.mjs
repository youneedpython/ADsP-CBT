// @vitest-environment node
import { test, expect } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateData, isDirectExecution } from './validate-data.mjs';
import { pathToFileURL } from 'node:url';

const entry = { round: 900, year: 2026, title: '개발용 표본', questionCount: 50, timeLimitMinutes: 90, file: '900.json' };
function sample() {
  return { formatVersion: 1, round: 900, title: entry.title, timeLimitMinutes: 90,
    subjects: [1, 2, 3].map(id => ({ id, name: `표본 과목 ${id}` })),
    questions: Array.from({ length: 50 }, (_, i) => ({ number: i + 1, subject: i < 10 ? 1 : i < 20 ? 2 : 3, question: `표본 문제 ${i + 1}`, stimulus: [], choices: ['표본 1', '표본 2', '표본 3', '표본 4'], answer: 1, explanation: '표본 해설' })) };
}
async function check(mutate = () => {}, list = [entry]) {
  const dir = await mkdtemp(path.join(tmpdir(), 'adsp-validate-'));
  try {
    const data = sample();
    mutate(data);
    await writeFile(path.join(dir, 'rounds.json'), JSON.stringify(list));
    await writeFile(path.join(dir, '900.json'), JSON.stringify(data));
    return await validateData(dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
test('valid 50 questions and empty list pass', async () => {
  expect(await check()).toEqual({ errors: [], roundCount: 1, questionCount: 50 });
  expect(await check(undefined, [])).toEqual({ errors: [], roundCount: 0, questionCount: 0 });
});

test.each([undefined, null, '2026', 2025.5, 1999, 2101])('rejects invalid round year %s', async year => {
  expect((await check(undefined, [{ ...entry, year }])).errors).toEqual(['회차 900 : year는 2000 ~ 2100 정수 필요']);
});

test.each([2000, 2100])('accepts year boundary %s', async year => {
  expect((await check(undefined, [{ ...entry, year }])).errors).toEqual([]);
});
test('validator direct execution compares junction real paths', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'adsp-entry-'));
  try {
    await mkdir(path.join(dir, 'actual'));
    await writeFile(path.join(dir, 'actual', 'entry.mjs'), '');
    await symlink(path.join(dir, 'actual'), path.join(dir, 'alias'), 'junction');
    const url = pathToFileURL(path.join(dir, 'actual', 'entry.mjs'));
    expect(await isDirectExecution(url, path.join(dir, 'alias', 'entry.mjs'))).toBe(true);
    expect(await isDirectExecution(url, path.join(dir, 'absent'))).toBe(false);
    expect(await isDirectExecution(url, path.join(dir, 'actual'))).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
const cases = [
  ['round mismatch', d => d.round = 1, 'round / title 불일치'],
  ['title mismatch', d => d.title = '다른 표본', 'round / title 불일치'],
  ['question count', () => {}, 'questionCount 불일치'],
  ['format version', d => d.formatVersion = 2, 'formatVersion\uC740 1 \uD544\uC694'],
  ['subjects', d => d.subjects[0].id = 2, 'subjects id는 1, 2, 3 필요'],
  ['subject count', d => d.questions[0].subject = 2, '과목별 문항 수 10 / 10 / 30 필요'],
  ['number sequence', d => d.questions[0].number = 2, '문항 2 : 문항 번호 연속 순서 오류'],
  ['empty question', d => d.questions[0].question = '', 'question \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['choice count', d => d.questions[0].choices.pop(), 'choices 4\uAC1C \uD544\uC694'],
  ['empty choice', d => d.questions[0].choices[0] = '', 'choice \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['non-string choice', d => d.questions[0].choices[0] = 1, 'choice \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['answer range', d => d.questions[0].answer = 5, 'answer\uB294 1 ~ 4 \uC815\uC218 \uD544\uC694'],
  ['answer integer', d => d.questions[0].answer = 1.5, 'answer\uB294 1 ~ 4 \uC815\uC218 \uD544\uC694'],
  ['explanation', d => d.questions[0].explanation = null, 'explanation \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['unknown stimulus', d => d.questions[0].stimulus = [{ type: 'unknown' }], 'stimulus type \uC624\uB958'],
  ['text required', d => d.questions[0].stimulus = [{ type: 'text' }], 'stimulus text \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['code required', d => d.questions[0].stimulus = [{ type: 'code' }], 'stimulus text \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['table required', d => d.questions[0].stimulus = [{ type: 'table' }], 'table \uD589 / \uC5F4 \uC218 \uC624\uB958'],
  ['table columns', d => d.questions[0].stimulus = [{ type: 'table', rows: [['가'], ['나', '다']] }], 'table \uD589 / \uC5F4 \uC218 \uC624\uB958'],
  ['table strings', d => d.questions[0].stimulus = [{ type: 'table', rows: [[1]] }], 'table cell \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['image missing', d => d.questions[0].stimulus = [{ type: 'image', src: 'missing.png', alt: '표본' }], 'image src \uD30C\uC77C \uC5C6\uC74C / \uC624\uB958'],
  ['image alt', d => d.questions[0].stimulus = [{ type: 'image', src: '900.json', alt: '' }], 'image alt \uBB38\uC790\uC5F4 \uC624\uB958'],
  ['odd dollar', d => d.questions[0].question = '$표본', 'question $ 개수가 홀수'],
  ['odd choice dollar', d => d.questions[0].choices[0] = '$표본', 'choice $ 개수가 홀수'],
  ['odd explanation dollar', d => d.questions[0].explanation = '$표본', 'explanation $ 개수가 홀수'],
  ['odd stimulus dollar', d => d.questions[0].stimulus = [{ type: 'code', text: '$표본' }], 'stimulus text $ 개수가 홀수'],
  ['odd table dollar', d => d.questions[0].stimulus = [{ type: 'table', rows: [['$표본']] }], 'table cell $ 개수가 홀수'],
  ['undefined question field', d => d.questions[0].extra = 1, '정의하지 않은 항목 extra'],
  ['undefined root field', d => d.extra = 1, '정의하지 않은 항목 extra'],
  ['undefined subject field', d => d.subjects[0].extra = 1, '정의하지 않은 항목 extra'],
  ['undefined stimulus field', d => d.questions[0].stimulus = [{ type: 'text', text: '표본', extra: 1 }], '정의하지 않은 항목 extra'],
];
for (const [name, mutate, reason] of cases) test(`rejects ${name}`, async () => {
  const { errors } = await check(mutate, name === 'question count' ? [{ ...entry, questionCount: 49 }] : [entry]);
  if (name === 'question count') expect(errors).toEqual(['회차 900 : questionCount 불일치']);
  expect(errors.some(e => e.includes('회차 900') && e.includes(reason))).toBe(true);
  if (name !== 'number sequence' && !['round mismatch', 'title mismatch', 'question count', 'format version', 'subjects', 'subject count', 'undefined root field', 'undefined subject field'].includes(name)) expect(errors.some(e => e.includes('문항 1'))).toBe(true);
});
test('collects multiple errors', async () => {
  const { errors } = await check(d => { d.questions[0].question = ''; d.questions[1].answer = 5; });
  expect(errors).toHaveLength(2);
  expect(errors[0]).toContain('문항 1');
  expect(errors[1]).toContain('문항 2');
});
test('valid stimulus types and undefined list fields', async () => {
  expect((await check(d => { d.questions[0].stimulus = [
    { type: 'text', text: '$표본$' }, { type: 'code', text: '표본\n출력' },
    { type: 'table', rows: [['머리글'], ['표본']] },
    { type: 'image', src: '900.json', alt: '표본 파일' },
  ]; })).errors).toEqual([]);
  expect((await check(undefined, [{ ...entry, extra: 1 }])).errors[0]).toContain('정의하지 않은');
});
test('missing and malformed files fail', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'adsp-files-'));
  try {
    expect((await validateData(dir)).errors.length).toBeGreaterThan(0);
    await writeFile(path.join(dir, 'rounds.json'), '{');
    expect((await validateData(dir)).errors.length).toBeGreaterThan(0);
    await writeFile(path.join(dir, 'rounds.json'), JSON.stringify([entry]));
    expect((await validateData(dir)).errors[0]).toContain('회차 900');
    await writeFile(path.join(dir, '900.json'), '{');
    expect((await validateData(dir)).errors[0]).toContain('회차 900');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { ExamHub } from './ExamHub';
import { ResultRound } from './ResultPage';
import { ExamContext } from '../components/ExamContext';
import { RecordStoreContext } from '../storage/RecordStoreContext';
import { createRecordStore } from '../storage/records';
import { exams } from '../domain/exams';
import { rounds, summaries } from '../test/setFixtures';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const memoryOnly = () => { throw new Error('Storage unavailable in this test'); };

test('hub introduces Dokdori above the existing exam selection copy', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => summaries })));
  render(<MemoryRouter><RecordStoreContext value={createRecordStore(memoryOnly)}><ExamHub state={{ status: 'success', rounds: summaries }} retry={() => {}} stores={{ adsp: createRecordStore(memoryOnly), sqld: createRecordStore(memoryOnly, exams[1]) }} /></RecordStoreContext></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: '자격증 합격, 독토리가 함께할게요!' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: '기출 복원 문제를 회차별로 풀어 보세요' })).toBeTruthy();
  for (const text of ['독학으로 준비하는', '기출 복원 문제로 차근차근 시험 감각을 키워요', '합격하는 날까지 독토리가 응원할게요', '안녕하세요, 독토리예요!', '독학의 "독"과 도토리를 합쳐 지은 이름이에요. 작은 도토리가 자라 큰 나무가 되듯, 혼자 하는 공부도 하루하루 쌓이면 합격이 돼요.', '학사모 끝의 새싹 잎은 여러분의 실력이 자라고 있다는 표시랍니다.']) expect(screen.getByText(text)).toBeTruthy();
  expect(document.querySelector('.page-lead')?.textContent).toBe('시험을 고르면 회차별 시험·연습과 주제별 모아 풀기를 할 수 있습니다.풀이 기록은 이 브라우저에만 저장됩니다.');
  expect(screen.getByRole('presentation').getAttribute('src')).toBe(`${import.meta.env.BASE_URL}dokdori/hello.svg`);
  expect(document.querySelectorAll('.dokdori-decoration[aria-hidden="true"]')).toHaveLength(5);
  await screen.findByRole('link', { name: 'SQLD 풀기 ›' });
});

test.each(exams.flatMap(exam => [false, true].flatMap(passed => [0, 50].map(round => ({ exam, passed, round })))))(
  '$exam.id result passed=$passed round=$round selects its character from rescored answers', ({ exam, passed, round }) => {
    const data = structuredClone(rounds[0]);
    data.round = round;
    if (exam.id === 'sqld') { data.subjects = exam.subjects.map(({ id, name }) => ({ id, name })); data.questions[2].subject = 2; }
    const store = createRecordStore(memoryOnly, exam);
    vi.spyOn(store, 'read').mockReturnValue({ answers: passed ? { 1: 2, 2: 2, 3: 2 } : {}, score: passed ? 100 : 0, passed, subjectCorrect: {}, elapsedSeconds: 0, submittedAt: '2026-11-03T00:00:00Z', questionCount: 3 });
    render(<MemoryRouter><ExamContext value={exam}><RecordStoreContext value={store}><ResultRound data={data} /></RecordStoreContext></ExamContext></MemoryRouter>);
    expect(screen.getByText(passed ? '합격' : '불합격', { exact: true })).toBeTruthy();
    const image = screen.getByRole('presentation');
    expect(image.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}dokdori/${passed ? 'pass' : 'cheer'}-${exam.id}.svg`);
    expect(image.getAttribute('width')).toBe('96');
    expect(document.querySelector('.result-summary')?.firstElementChild).toBe(image);
  });

test('decorations respect reduced motion and all characters are hidden in print', () => {
  const css = readFileSync('src/styles/main.css', 'utf8');
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.dokdori-decoration \{ animation: none;/);
  expect(css.slice(css.lastIndexOf('@media print'))).toContain('.offline-notice, .dokdori, .dokdori-decoration { display: none !important; }');
});

test('hub decorations stay outside the image box at every size and mobile copy aligns left', () => {
  const css = readFileSync('src/styles/main.css', 'utf8');
  expect(css).toMatch(/\.hub-character \{ --character-size: 130px;[^}]*width: var\(--character-size\); height: var\(--character-size\);/);
  expect(css).toMatch(/\.hub-character > \.dokdori \{[^}]*width: var\(--character-size\); height: var\(--character-size\);/);
  for (const name of ['bubble-one', 'bubble-two', 'bubble-three', 'leaf-one', 'leaf-two']) {
    // A 12px minimum horizontal gap also clears the rotation and 8px vertical float.
    expect(css).toMatch(new RegExp(`\\.${name} \\{ (?:left|right): calc\\(100% \\+ (?:12|16|20)px\\);`));
  }
  const tablet = css.slice(css.indexOf('@media (max-width: 1000px)'));
  expect(tablet).toContain('.hub-character { --character-size: 110px; }');
  const mobile = css.slice(css.indexOf('@media (max-width: 620px)'), css.indexOf('@media (prefers-reduced-motion: reduce)'));
  expect(mobile).toContain('.hub-character { --character-size: 104px; }');
  expect(mobile).toContain('.hub-intro-copy { text-align: left; }');
  expect(css).toMatch(/\.wrong-note-empty \{[^}]*gap: 16px;/);
  expect(css).toContain('.wrong-note-empty > p { margin: 0; }');
});

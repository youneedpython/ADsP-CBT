import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { MemoryRouter } from 'react-router';
import { SetsPage } from './SetsPage';
import { rounds, summaries, topics } from '../test/setFixtures';
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#/sets');
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('rounds.json') ? summaries : url.endsWith('topics.json') ? topics : rounds.find(round => url.endsWith(`${round.round}.json`)) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function ready(path = '/sets') {
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
  await screen.findByText(path === '/sets' ? '자주 나오는 주제부터' : /^모아 풀기 ·/);
}
test('missing topics provider shows the error state and safely retries', async () => {
  render(<MemoryRouter initialEntries={['/sets']}><SetsPage state={{ status: 'success', rounds: summaries }} retry={() => {}} /></MemoryRouter>);
  expect((await screen.findByRole('alert')).textContent).toContain('문제를 불러오지 못했습니다.');
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect((await screen.findByRole('alert')).textContent).toContain('문제를 불러오지 못했습니다.');
  expect(screen.queryByText('자주 나오는 주제부터')).toBeNull();
});
test('overview cards, counts, selected subject, frequency order/filter and destinations', async () => {
  await ready();
  expect(screen.getByText('0문항')).toBeTruthy();
  expect(screen.getByText('틀린 문제가 없습니다.')).toBeTruthy();
  expect((screen.getByRole('button', { name: '틀린 문제 풀기' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('link', { name: '틀린 문제 풀기' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '틀린 문제 풀기' }));
  expect(window.location.hash).toBe('#/sets');
  expect(within(screen.getByRole('group', { name: '과목 고르기' })).getAllByRole('button')).toHaveLength(3);
  expect(within(screen.getByRole('group', { name: '표의 과목 거르기' })).getAllByRole('button')).toHaveLength(4);
  expect(screen.getByText('3개 주제 · 출제 빈도 순')).toBeTruthy();
  const nav = screen.getByRole('navigation', { name: '주요 화면' });
  expect(within(nav).getByRole('link', { name: '모아 풀기' }).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button', { name: '2과목 2' }));
  expect(screen.getByRole('button', { name: '2과목 2' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('2과목 표본 기획')).toBeTruthy();
  expect(screen.getByRole('link', { name: '2과목 풀기' }).getAttribute('href')).toBe('#/sets/subject/2');
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('rowheader').map(row => row.textContent?.split('3과목')[0].split('1과목')[0].split('2과목')[0])).toEqual(['표본 주제 셋', '표본 주제 하나', '표본 주제 둘']);
  expect(screen.getAllByRole('img', { name: '2개 회차 중 2회 출제' })).toHaveLength(2);
  expect(screen.getByRole('link', { name: '표본 주제 셋 풀기 ›' }).getAttribute('href')).toBe('#/sets/topic/T301');
  fireEvent.click(screen.getByRole('button', { name: '2과목' }));
  expect(within(table).getAllByRole('rowheader')).toHaveLength(1);
  expect(within(table).getByRole('rowheader').textContent).toContain('표본 주제 둘');
});
test('loading waits for all round files and retry handles a failed request', async () => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('49.json')) await pending;
    return { ok: true, json: async () => url.endsWith('rounds.json') ? summaries : url.endsWith('topics.json') ? topics : rounds.find(round => url.endsWith(`${round.round}.json`)) };
  });
  render(<App />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('49.json'), expect.anything()));
  expect(screen.queryByText('0문항')).toBeNull();
  expect(screen.getByRole('status').textContent).toBe('문제를 불러오는 중입니다.');
  release?.();
  await screen.findByText('0문항');
  cleanup();
  fetchMock.mockRejectedValueOnce(Error('sample failure'));
  render(<App />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('0문항');
});
test('subject practice confirms only on demand, reports source and resumes progress', async () => {
  await ready('/sets/subject/2');
  expect(screen.getByText('1 / 2')).toBeTruthy();
  expect(screen.getByText('50회 2번')).toBeTruthy();
  fireEvent.keyDown(window, { key: '1' });
  expect(localStorage.getItem('adsp-cbt:v1:set:subject-2')).toBeNull();
  expect(screen.queryByText('정답')).toBeNull();
  fireEvent.keyDown(window, { key: 'Enter' });
  expect((await screen.findByRole('status')).textContent).toContain('틀렸습니다');
  expect(screen.getByRole('link', { name: '50회 2번 문제 오류 신고' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByText('49회 2번');
  expect(screen.getByRole('link', { name: '모아 풀기로' })).toBeTruthy();
  cleanup();
  await ready('/sets/subject/2');
  expect(screen.getByText('2 / 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '목록' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '50회 2번 · 틀림' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await screen.findByRole('status')).textContent).toContain('틀렸습니다');
  expect(localStorage.getItem('adsp-cbt:v1:50:practice')).toBeNull();
});
test('wrong list remains frozen until reopening and newer wrong exam reintroduces a solved question', async () => {
  localStorage.setItem('adsp-cbt:v1:50:practice', JSON.stringify({ current: 1, answers: { 1: 1, 2: 1 } }));
  await ready('/sets/wrong');
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  expect((await screen.findByRole('status')).textContent).toBe('맞았습니다.');
  expect(screen.getByText('1 / 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '목록' }));
  expect(await screen.findByRole('button', { name: '50회 1번 · 맞음' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기' }));
  await screen.findByText('1문항', { selector: '.set-count' });
  fireEvent.click(screen.getByRole('link', { name: '틀린 문제 풀기' }));
  await screen.findByText('50회 2번');
  expect(screen.queryByText('50회 1번')).toBeNull();
  cleanup();
  localStorage.setItem('adsp-cbt:v1:50:result', JSON.stringify({ answers: { 1: 1, 2: 2, 3: 2 }, score: 4, subjectCorrect: { 1: 0, 2: 1, 3: 1 }, passed: false, elapsedSeconds: 5, submittedAt: '2099-01-01T00:00:00Z', questionCount: 3 }));
  await ready('/sets/wrong');
  expect(screen.getByText('50회 1번')).toBeTruthy();
  expect(screen.queryByText('정답')).toBeNull();
});
test('topic practice title and order use all matching questions', async () => {
  await ready('/sets/topic/T301');
  expect(screen.getByRole('heading', { name: '모아 풀기 · 표본 주제 셋' })).toBeTruthy();
  expect(screen.getByText('1 / 3')).toBeTruthy();
  expect(screen.getByText('50회 3번')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByText('49회 2번');
});
test('a round-file failure offers retry without showing partial counts', async () => {
  let failed = false;
  const successful = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, options: unknown) => {
    if (url.endsWith('49.json') && !failed) { failed = true; throw Error('sample round failure'); }
    return successful(url, options);
  });
  render(<App />);
  await screen.findByRole('alert');
  expect(screen.queryByText('0문항')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('0문항');
});
test.each(['/sets/wrong', '/sets/subject/4', '/sets/topic/T999', '/sets/unknown', '/sets/subject/1/extra'])('empty or missing set %s shows return link', async path => {
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
  await screen.findByText('풀 문제가 없습니다.');
  expect(screen.getByRole('link', { name: '모아 풀기로' }).getAttribute('href')).toBe('#/sets');
});
test.each(['/sets/unknown', '/sets/subject/4', '/sets/topic/T999', '/sets/subject/1/extra'])('missing set %s does not access or discard stored records', async path => {
  localStorage.setItem('adsp-cbt:v1:50:practice', 'invalid sample');
  localStorage.setItem('adsp-cbt:v1:set:topic-undefined', 'invalid sample');
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const remove = vi.spyOn(Storage.prototype, 'removeItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  window.history.replaceState(null, '', `#${path}`);
  render(<App />);
  await screen.findByText('풀 문제가 없습니다.');
  expect(read).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test('unavailable persistence keeps progress through navigation and displays notice', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
  await ready('/sets/subject/1');
  fireEvent.click(screen.getByRole('button', { name: '2. 표본 둘' }));
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  await screen.findByText('이 브라우저에서는 풀이 기록을 저장할 수 없습니다.');
  fireEvent.click(screen.getByRole('link', { name: '모아 풀기' }));
  await screen.findByText('자주 나오는 주제부터');
  fireEvent.click(screen.getByRole('link', { name: '1과목 풀기' }));
  expect((await screen.findByRole('status')).textContent).toBe('맞았습니다.');
});

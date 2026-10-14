import { expect, test } from 'vitest';
import { reportQuestionUrl } from './reportQuestion';
test('report contains only encoded round and question metadata', () => {
  const value = reportQuestionUrl(50, 12);
  expect(value).toContain(encodeURIComponent('[50회 12번] 문제 오류 신고'));
  const url = new URL(value);
  expect(url.origin + url.pathname).toBe('https://github.com/youneedpython/ADsP-CBT/issues/new');
  expect([...url.searchParams]).toEqual([
    ['title', '[50회 12번] 문제 오류 신고'],
    ['body', '회차: 50회\n문항: 12번\n\n어떤 점이 틀렸는지 적어 주세요.'],
  ]);
});

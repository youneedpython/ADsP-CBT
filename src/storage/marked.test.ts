import { expect, test, vi } from 'vitest';
import { createRecordStore } from './records';
import { validMarked } from './marked';
const marked = { '50:12': '2026-10-14T00:00:00Z' };
test('marks round trip separately from answers and can be cleared', () => {
  const data = new Map<string, string>();
  const adapter = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const store = createRecordStore(adapter);
  store.writeMarked(marked);
  expect(data.get('adsp-cbt:v1:marked')).toBe(JSON.stringify(marked));
  expect(createRecordStore(adapter).readMarked()).toEqual(marked);
  expect(store.read(50, 'practice', 50)).toBeNull();
  store.writeMarked({});
  expect(createRecordStore(adapter).readMarked()).toEqual({});
});
test.each(['{', '[]', 'null', '{"50:0":"2026-10-14"}', '{"50:12":"bad"}', '{"50:12":1}', '{"0:12":"2026-10-14"}'])('invalid marks are deleted: %s', raw => {
  const removeItem = vi.fn();
  const store = createRecordStore({ getItem: () => raw, setItem: vi.fn(), removeItem });
  expect(store.readMarked()).toEqual({});
  expect(removeItem).toHaveBeenCalledWith('adsp-cbt:v1:marked');
});
test('unavailable storage retains marks in session memory', () => {
  const store = createRecordStore(() => { throw Error('blocked'); });
  store.writeMarked(marked);
  expect(store.readMarked()).toEqual(marked);
  expect(store.canPersist()).toBe(false);
  expect(validMarked({ '50:12': ' ' })).toBe(false);
});
test('failed write keeps marks in memory', () => {
  const store = createRecordStore({ getItem: () => null, setItem: () => { throw Error('blocked'); }, removeItem: vi.fn() });
  store.writeMarked(marked);
  expect(store.readMarked()).toEqual(marked);
  expect(store.canPersist()).toBe(false);
});
test('set answer history is validated and read without changing signatures or round records', () => {
  const data = new Map<string, string>();
  const adapter = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const store = createRecordStore(adapter);
  store.writeSet('marked', { current: 1, signature: 'sample-history', answers: { '50:12': 2 } });
  data.set('adsp-cbt:v1:set:wrong', JSON.stringify({ current: 1, signature: 'sample', answers: { '50:12': 5 } }));
  expect(store.readSetAnswers(['marked', 'wrong'], ['50:12'])).toEqual([{ '50:12': 2 }]);
  expect(data.has('adsp-cbt:v1:set:wrong')).toBe(false);
  expect(store.readSet('marked', 'sample-history', ['50:12'])?.answers).toEqual({ '50:12': 2 });
});

import { expect, test, vi } from 'vitest';
import { createRecordStore } from './records';
import type { SetRecord } from './setRecords';
const record: SetRecord = { signature: 'sample', current: 2, answers: { '50:1': 2 } };
const keys = ['50:1', '49:1'];
test('set progress and resolved times round trip without mixing with round records', () => {
  const storage = new Map<string, string>();
  const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } };
  const store = createRecordStore(adapter);
  store.writeSet('wrong', record);
  store.writeResolved({ '50:1': '2026-10-14T01:00:00Z' });
  const reopened = createRecordStore(adapter);
  expect(reopened.readSet('wrong', 'sample', keys)).toEqual(record);
  expect(reopened.readResolved()).toEqual({ '50:1': '2026-10-14T01:00:00Z' });
  expect(store.read(50, 'practice', 3)).toBeNull();
});
test.each(['{', JSON.stringify({ ...record, current: 0 }), JSON.stringify({ ...record, answers: { '50:1': 5 } }), JSON.stringify({ ...record, answers: { '50:2': 2 } }), JSON.stringify({ ...record, signature: 'outdated' })])('invalid progress is removed: %s', raw => {
  const removeItem = vi.fn();
  const store = createRecordStore({ getItem: () => raw, setItem: vi.fn(), removeItem });
  expect(store.readSet('wrong', 'sample', keys)).toBeNull();
  expect(removeItem).toHaveBeenCalledWith('adsp-cbt:v1:set:wrong');
});
test.each(['[]', '{"50:1":"bad"}', '{"wrong":"2026-10-14"}'])('invalid resolved record is discarded: %s', raw => {
  const removeItem = vi.fn();
  const store = createRecordStore({ getItem: () => raw, setItem: vi.fn(), removeItem });
  expect(store.readResolved()).toEqual({});
  expect(removeItem).toHaveBeenCalledWith('adsp-cbt:v1:set-resolved');
});
test('blocked storage retains both record types in shared browser-session memory', () => {
  const store = createRecordStore({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: vi.fn() });
  expect(store.readResolved()).toEqual({});
  store.writeSet('subject-1', record);
  store.writeResolved({ '50:1': '2026-10-14T01:00:00Z' });
  expect(store.canPersist()).toBe(false);
  expect(store.readSet('subject-1', 'sample', keys)).toEqual(record);
  expect(store.readResolved()['50:1']).toBe('2026-10-14T01:00:00Z');
});

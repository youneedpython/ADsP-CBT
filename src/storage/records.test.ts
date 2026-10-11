import { expect, it, vi } from 'vitest';
import { createRecordStore, recordKey, type RecordKind, type RecordStorage, type RecordTypes } from './records';

function fake(): RecordStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); } };
}
const records: RecordTypes = {
  practice: { answers: { 1: 2 }, current: 2 },
  exam: { answers: { 1: 2 }, current: 2, startedAt: '2026-10-11T03:00:00.000Z' },
  result: { answers: { 1: 2 }, score: 2, subjectCorrect: { 1: 1, 2: 0, 3: 0 }, passed: false,
    elapsedSeconds: 42, submittedAt: '2026-10-11T04:00:00.000Z', questionCount: 3 },
};
it('uses the versioned key', () => expect(recordKey(50, 'exam')).toBe('adsp-cbt:v1:50:exam'));
it.each(['practice', 'exam', 'result'] as const)('round trips and deletes %s independently', kind => {
  const storage = fake();
  const store = createRecordStore(storage);
  store.write(50, kind, records[kind]);
  store.write(49, kind, records[kind]);
  expect(createRecordStore(storage).read(50, kind, 3)).toEqual(records[kind]);
  expect(store.read(48, kind, 3)).toBeNull();
  store.remove(50, kind);
  expect(store.read(50, kind, 3)).toBeNull();
  expect(store.read(49, kind, 3)).toEqual(records[kind]);
  expect(store.canPersist()).toBe(true);
});
const invalid: [RecordKind, string][] = [
  ...['not json', 'null', '[]', '2', '{}'].map(raw => ['practice', raw] as [RecordKind, string]),
  ...[{ answers: [], current: 1 }, { answers: {}, current: '1' }, { current: 1 }, { answers: {} },
    ...[0, 4, 1.5].map(current => ({ answers: {}, current })),
    ...['0', '4', '1.5', '-1', '01', '1e0'].map(key => ({ answers: { [key]: 1 }, current: 1 })),
    ...[0, 5, 1.5, '1', null].map(answer => ({ answers: { 1: answer }, current: 1 }))]
    .map(value => ['practice', JSON.stringify(value)] as [RecordKind, string]),
  ...[undefined, 123, 'invalid', ''].map(startedAt => ['exam', JSON.stringify({ ...records.exam, startedAt })] as [RecordKind, string]),
  ...[undefined, 123, 'invalid', ''].map(submittedAt => ['result', JSON.stringify({ ...records.result, submittedAt })] as [RecordKind, string]),
  ...[{ questionCount: 4 }, { score: '2' }, { score: -1 }, { passed: 1 }, { elapsedSeconds: '42' },
    { subjectCorrect: [] }, { subjectCorrect: {} }, { subjectCorrect: { 1: '1', 2: 0, 3: 0 } }]
    .map(patch => ['result', JSON.stringify({ ...records.result, ...patch })] as [RecordKind, string]),
  ...Object.keys(records.result).map(field => {
    const value = { ...records.result } as Record<string, unknown>;
    delete value[field];
    return ['result', JSON.stringify(value)] as [RecordKind, string];
  }),
];
it.each(invalid)('discards malformed %s record %s', (kind, raw) => {
  const storage = fake();
  storage.setItem(recordKey(50, kind), raw);
  expect(createRecordStore(storage).read(50, kind, 3)).toBeNull();
  expect(storage.getItem(recordKey(50, kind))).toBeNull();
});
it('handles access failure and keeps memory isolated by round and kind', () => {
  const store = createRecordStore(() => { throw new Error('blocked'); });
  expect(store.canPersist()).toBe(false);
  store.write(50, 'practice', records.practice);
  expect(store.read(50, 'practice', 3)).toEqual(records.practice);
  expect(store.read(49, 'practice', 3)).toBeNull();
  expect(store.read(50, 'exam', 3)).toBeNull();
  store.remove(50, 'practice');
  expect(store.read(50, 'practice', 3)).toBeNull();
});
it('handles the default localStorage accessor throwing', () => {
  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
  try { expect(createRecordStore().canPersist()).toBe(false); } finally { spy.mockRestore(); }
});
it('uses default browser storage', () => {
  const store = createRecordStore();
  store.write(50, 'exam', records.exam);
  expect(store.read(50, 'exam', 3)).toEqual(records.exam);
  store.remove(50, 'exam');
});
it('retains previously read records when reads later fail', () => {
  const storage = fake();
  storage.setItem(recordKey(50, 'practice'), JSON.stringify(records.practice));
  const store = createRecordStore(storage);
  expect(store.read(50, 'practice', 3)).toEqual(records.practice);
  storage.getItem = () => { throw new Error('blocked'); };
  expect(store.read(50, 'practice', 3)).toEqual(records.practice);
  expect(store.canPersist()).toBe(false);
  expect(store.read(49, 'practice', 3)).toBeNull();
});
it('retains writes after quota failure and validates memory records', () => {
  const storage = fake();
  storage.setItem = () => { throw new Error('quota'); };
  const store = createRecordStore(storage);
  expect(() => store.write(50, 'exam', records.exam)).not.toThrow();
  expect(store.canPersist()).toBe(false);
  expect(store.read(50, 'exam', 3)).toEqual(records.exam);
  store.write(50, 'result', records.result);
  expect(store.read(50, 'result', 4)).toBeNull();
  expect(store.read(50, 'result', 3)).toBeNull();
  store.remove(50, 'exam');
  expect(store.read(50, 'exam', 3)).toBeNull();
});
it('does not resurrect deleted records when remove fails', () => {
  const storage = fake();
  const store = createRecordStore(storage);
  store.write(50, 'practice', records.practice);
  storage.removeItem = () => { throw new Error('blocked'); };
  expect(() => store.remove(50, 'practice')).not.toThrow();
  expect(store.canPersist()).toBe(false);
  expect(store.read(50, 'practice', 3)).toBeNull();
});
it.each(['read', 'write'] as const)('attempts persistent deletion after a %s failure', failure => {
  const storage = fake();
  const read = storage.getItem;
  const store = createRecordStore(storage);
  store.write(50, 'exam', records.exam);
  if (failure === 'read') {
    storage.getItem = () => { throw new Error('blocked'); };
    store.read(50, 'exam', 3);
  } else {
    storage.setItem = () => { throw new Error('quota'); };
    store.write(50, 'result', records.result);
  }
  const remove = vi.spyOn(storage, 'removeItem');
  store.remove(50, 'exam');
  expect(remove).toHaveBeenCalledWith(recordKey(50, 'exam'));
  expect(createRecordStore({ ...storage, getItem: read }).read(50, 'exam', 3)).toBeNull();
});

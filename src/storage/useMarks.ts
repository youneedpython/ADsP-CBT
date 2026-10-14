import { useState } from 'react';
import { useRecordStore } from './RecordStoreContext';
export function useMarks() {
  const store = useRecordStore();
  const [marked, setMarked] = useState(store.readMarked);
  const toggle = (round: number, number: number) => {
    const next = { ...store.readMarked() };
    const key = `${round}:${number}`;
    if (next[key]) delete next[key];
    else next[key] = new Date().toISOString();
    store.writeMarked(next);
    setMarked(next);
  };
  return { marked, toggle, persistent: store.canPersist() };
}

import type { RoundData } from '../data/types';
import { useState } from 'react';
import { useRecordStore } from './RecordStoreContext';
export function useMarks(data?: RoundData) {
  const store = useRecordStore();
  const [marked, setMarked] = useState(store.readMarked);
  const toggle = (round: number, number: number) => {
    const next = { ...store.readMarked() };
    const source = data?.questions.find(q => q.number === number)?.source;
    const key = source ? source.join(':') : `${round}:${number}`;
    if (next[key]) delete next[key];
    else next[key] = new Date().toISOString();
    store.writeMarked(next);
    setMarked(next);
  };
  const displayMarks = data?.round === 0 ? Object.fromEntries(data.questions.filter(q => q.source && marked[q.source.join(':')]).map(q => [`0:${q.number}`, marked[q.source!.join(':')]])) : marked;
  return { marked: displayMarks, toggle, persistent: store.canPersist() };
}

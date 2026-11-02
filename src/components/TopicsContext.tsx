import { useExam } from './ExamContext';
import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { loadTopics } from '../data/loadTopics';
import type { RoundSummary, TopicsData } from '../data/types';

const TopicsContext = createContext<{ get: () => Promise<TopicsData>; retryFailed: () => void; summaries: RoundSummary[] } | null>(null);
export function TopicsProvider({ summaries, children }: { summaries: RoundSummary[]; children: ReactNode }) {
  const exam = useExam();
  const request = useRef<Promise<TopicsData> | null>(null);
  const failed = useRef(false);
  const get = useCallback(() => request.current ??= loadTopics(undefined, exam).catch(error => { failed.current = true; throw error; }), [exam]);
  const retryFailed = () => { if (failed.current) { request.current = null; failed.current = false; } };
  return <TopicsContext.Provider value={{ get, retryFailed, summaries }}>{children}</TopicsContext.Provider>;
}
export const useTopics = () => useContext(TopicsContext);

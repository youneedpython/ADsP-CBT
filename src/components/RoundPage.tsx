import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { LoadingState, type PageProps } from './LoadingState';
import { loadRound } from '../data/loadRound';
import type { RoundData, RoundSummary } from '../data/types';

export function RoundPage({ state, retry, children }: PageProps & { children: (data: RoundData) => ReactNode }) {
  const { round } = useParams();
  if (state.status !== 'success') return <LoadingState state={state} retry={retry} />;
  const summary = state.rounds.find(item => String(item.round) === round);
  if (!summary) return <div className="state-panel"><p>없는 회차입니다.</p><Link to="/">회차 목록으로</Link></div>;
  return <RoundLoader key={round} summary={summary}>{children}</RoundLoader>;
}
function RoundLoader({ summary, children }: { summary: RoundSummary; children: (data: RoundData) => ReactNode }) {
  const [data, setData] = useState<RoundData>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadRound(summary, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [summary, attempt]);
  if (!data) return <LoadingState state={{ status: error ? 'error' : 'loading' }} retry={() => { setError(false); setAttempt(value => value + 1); }} />;
  return children(data);
}

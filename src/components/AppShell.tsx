import { useEffect, useState, type ReactNode } from "react";
import { Link, useMatch } from "react-router";
import { loadRounds } from "../data/loadRounds";
import type { LoadState, PageProps } from "./LoadingState";
export function AppShell({ children }: { children: (props: PageProps) => ReactNode }) {
  const practice = useMatch('/rounds/:round/practice');
  const exam = useMatch('/rounds/:round/exam');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = () => { setState({ status: 'loading' }); setAttempt(value => value + 1); };
  useEffect(() => {
    const controller = new AbortController();
    loadRounds(controller.signal).then(rounds => {
      if (!controller.signal.aborted) setState({ status: 'success', rounds });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' });
    });
    return () => controller.abort();
  }, [attempt]);
  return <>
    <header><div className={`container${practice || exam ? ' practice-header' : ''}`}><h1><Link to="/"><img className="service-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />ADsP 기출 복원 문제</Link></h1></div></header>
    <main className={`container${practice || exam ? ' practice-container' : ''}`}>{children({state, retry})}</main>
    <footer>복원 문제입니다. 실제 시험과 다를 수 있습니다.</footer>
  </>;
}

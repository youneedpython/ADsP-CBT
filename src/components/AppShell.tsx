import { useEffect, useState, type ReactNode } from "react";
import { Link, useMatch, useLocation } from "react-router";
import { loadRounds } from "../data/loadRounds";
import type { LoadState, PageProps } from "./LoadingState";
import { useDownloads } from "./DownloadsContext";
export function AppShell({ children }: { children: (props: PageProps) => ReactNode }) {
  const downloads = useDownloads();
  const hasPDF = downloads.state.status === 'success' && Object.values(downloads.state.data.rounds).some(files => files.type1 || files.type2);
  const practice = useMatch('/rounds/:round/practice');
  const exam = useMatch('/rounds/:round/exam');
  const { pathname } = useLocation();
  const sets = pathname === '/sets' || pathname.startsWith('/sets/');
  const overview = pathname === '/' || pathname === '/rounds' || pathname === '/sets' || pathname === '/downloads';
  const info = useMatch('/rounds/:round');
  const Brand = overview || info ? 'div' : 'h1';
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
    <header><div className={`container service-bar${practice || exam ? ' practice-header' : overview ? ' overview-container' : ''}`}><Brand className="service-name"><Link to="/"><img className="service-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />ADsP 기출 복원 문제</Link></Brand><nav aria-label="주요 화면"><Link className="home-nav" to="/" aria-current={pathname === '/' ? 'page' : undefined}>홈</Link><Link to="/rounds" aria-current={pathname.startsWith('/rounds') ? 'page' : undefined}>회차</Link><Link to="/sets" aria-current={sets ? 'page' : undefined}>모아 풀기</Link>{hasPDF && <Link className="pdf-nav" to="/downloads" aria-current={pathname === '/downloads' ? 'page' : undefined}>PDF</Link>}</nav></div></header>
    <main className={`container${practice || exam ? ' practice-container' : overview ? ' overview-container' : ''}`}>{children({state, retry})}</main>
    <footer><p>복원 문제입니다. 실제 시험과 다를 수 있습니다.</p><p>© 2026 youneedpython</p></footer>
  </>;
}

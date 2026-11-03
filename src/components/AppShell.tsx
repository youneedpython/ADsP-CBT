import { useExam } from './ExamContext';
import { useEffect, useState, type ReactNode } from "react";
import { Link, useMatch, useLocation } from "react-router";
import { loadRounds } from "../data/loadRounds";
import type { LoadState, PageProps } from "./LoadingState";
import { exams } from "../domain/exams";
import { useDownloads } from './DownloadsContext';
import { ThemeToggle } from './ThemeToggle';
import { OfflineNotice } from './OfflineNotice';
export function AppShell({ children }: { children: (props: PageProps) => ReactNode }) {
  const currentExam = useExam();
  const downloads = useDownloads();
  const hasPDF = downloads.state.status === 'success' && (!!downloads.state.data.subjects?.length || Object.values(downloads.state.data.rounds).some(files => files.type1 || files.type2));
  const practice = useMatch(`${currentExam.path}/rounds/:round/practice`);
  const roundExam = useMatch(`${currentExam.path}/rounds/:round/exam`);
  const mockExam = useMatch(`${currentExam.path}/mock/exam`);
  const exam = roundExam || mockExam;
  const { pathname } = useLocation();
  const activeExam = exams.find(exam => pathname === exam.path || pathname.startsWith(`${exam.path}/`));
  const sets = pathname === `${currentExam.path}/sets` || pathname.startsWith(`${currentExam.path}/sets/`);
  const wrongNote = pathname === `${currentExam.path}/sets/wrong/note`;
  const overview = wrongNote || pathname === `${currentExam.path}/mock` || pathname === '/' || pathname === currentExam.path || pathname === `${currentExam.path}/rounds` || pathname === `${currentExam.path}/sets` || pathname === `${currentExam.path}/downloads` || pathname.startsWith(`${currentExam.path}/notes/`);
  const info = useMatch(`${currentExam.path}/rounds/:round`);
  const Brand = overview || info ? 'div' : 'h1';
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = () => { setState({ status: 'loading' }); setAttempt(value => value + 1); };
  useEffect(() => {
    const controller = new AbortController();
    loadRounds(controller.signal, currentExam).then(rounds => {
      if (!controller.signal.aborted) setState({ status: 'success', rounds });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' });
    });
    return () => controller.abort();
  }, [attempt, currentExam]);
  useEffect(() => { document.title = pathname.includes('/mock') ? `${currentExam.name} 실전 모의고사` : wrongNote ? `${currentExam.name} 오답 노트 · 독특한 CBT` : pathname === '/' ? '독특한 CBT · 기출 복원 문제' : `${currentExam.name} 기출 복원 문제`; }, [pathname, currentExam, wrongNote]);
  return <div className={activeExam ? `exam-${currentExam.id}${wrongNote ? ' wrong-note-shell' : ''}` : undefined} style={{ display: 'contents' }}>
    <header><div className={`container service-bar${activeExam ? ' exam-service-bar' : ''}${practice || exam ? ' practice-header' : overview ? ' overview-container' : ''}`}>
      <Brand className="service-name"><Link to="/" aria-label="독특한 CBT"><img className="service-logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" /><span className="service-copy"><span>독특한 CBT</span><small>독학으로 자격증 취득하는 CBT</small></span></Link></Brand>
      {activeExam && <nav className="exam-switch" aria-label="시험 전환">{exams.map(item => <Link key={item.id} to={item.path} aria-current={activeExam.id === item.id ? 'page' : undefined}>{item.name}</Link>)}</nav>}
      <nav className="main-navigation" aria-label="주요 화면">{activeExam ? <>
        <Link className="home-nav" to={activeExam.path} aria-current={pathname === activeExam.path ? 'page' : undefined}>{activeExam.name} 홈</Link>
        <Link to={`${activeExam.path}/rounds`} aria-current={pathname.startsWith(`${activeExam.path}/rounds`) ? 'page' : undefined}>회차</Link>
        {activeExam.hasSets && <Link to={`${activeExam.path}/sets`} aria-current={sets ? 'page' : undefined}>모아 풀기</Link>}
        {activeExam.hasPDF && hasPDF && <Link className="pdf-nav" to={`${activeExam.path}/downloads`} aria-current={pathname === `${activeExam.path}/downloads` || pathname.startsWith(`${activeExam.path}/notes/`) ? 'page' : undefined}>PDF</Link>}
      </> : exams.map(item => <Link key={item.id} to={item.path}>{item.name}</Link>)}<ThemeToggle /></nav>
    </div></header>
    <OfflineNotice />
    <main className={`container${practice || exam ? ' practice-container' : overview ? ' overview-container' : ''}`}>{children({state, retry})}</main>
    <footer><p>복원 문제입니다. 실제 시험과 다를 수 있습니다.</p><p>© 2026 youneedpython</p></footer>
  </div>;
}

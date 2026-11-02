import { useEffect, useState } from 'react';
import { loadRounds } from '../data/loadRounds';
import { createRecordStore } from '../storage/records';
import { Link } from 'react-router';
import { exams, type Exam } from '../domain/exams';
import { LoadingState, type PageProps } from '../components/LoadingState';
import { ResumePanel, useResume } from '../components/ResumePanel';

function ExamCard({ exam, state, retry }: PageProps & { exam: Exam }) {
  const rounds = state.status === 'success' ? state.rounds : [];
  const numbers = rounds.map(r => r.round);
  const latest = rounds.reduce<(typeof rounds)[number] | undefined>((a, r) => !a || r.round > a.round ? r : a, undefined);
  return <article className={`overview-panel exam-card exam-${exam.id}`}>
    <div className="exam-card-title"><span className="exam-badge">{exam.name}</span><div><h2>{exam.name}</h2><p>{exam.fullName}</p></div></div>
    {state.status !== 'success' ? <LoadingState state={state} retry={retry} /> : !rounds.length ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p> : <dl className="home-facts"><div><dt>회차</dt><dd>{Math.min(...numbers)} ~ {Math.max(...numbers)}회</dd></div><div><dt>문제</dt><dd>{rounds.reduce((n, r) => n + r.questionCount, 0)}문항</dd></div><div><dt>과목</dt><dd>{exam.subjectCount}과목</dd></div></dl>}
    <p className="exam-description">{latest && `${latest.timeLimitMinutes}분 · `}{exam.description}</p>
    <Link className="button exam-card-action" to={exam.path}>{exam.name} 풀기 ›</Link>
  </article>;
}
export function ExamHub(props: PageProps & { stores: Record<string, ReturnType<typeof createRecordStore>> }) {
  const exam = exams.find(item => item.id === 'sqld')!;
  const [state, setState] = useState<PageProps['state']>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadRounds(controller.signal, exam).then(rounds => { if (!controller.signal.aborted) setState({ status: 'success', rounds }); }).catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
    return () => controller.abort();
  }, [attempt, exam]);
  const adsp = useResume(props.state.status === 'success' ? props.state.rounds : [], props.stores.adsp);
  const sqld = useResume(state.status === 'success' ? state.rounds : [], props.stores.sqld);
  return <>
    <h1 className="page-title">기출 복원 문제를 회차별로 풀어 보세요</h1>
    <p className="page-lead">시험을 고르면 회차별 시험·연습과 주제별 모아 풀기를 할 수 있습니다. 풀이 기록은 이 브라우저에만 저장됩니다.</p>
    <div className="exam-grid"><ExamCard exam={exams[0]} {...props} /><ExamCard exam={exam} state={state} retry={() => { setState({ status: 'loading' }); setAttempt(n => n + 1); }} /></div>
    {(adsp.resume || sqld.resume) && <section className="hub-resume-section"><h2>이어 풀기</h2><ResumePanel selection={adsp} exam={exams[0]} hub /><ResumePanel selection={sqld} exam={exam} hub /></section>}
    <aside className="overview-panel hub-notice">복원 문제입니다. 실제 시험과 다를 수 있습니다.</aside>
  </>;
}

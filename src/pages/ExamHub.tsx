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
    <ul className="exam-description">{exam.description.map((item, index) => <li key={item}>{index === 0 && latest && `${latest.timeLimitMinutes}분 · `}{item}</li>)}</ul>
    <div className="exam-card-action"><Link className="button" to={exam.path}>{exam.name} 풀기 ›</Link>{latest && <Link className="button secondary exam-latest" to={`${exam.path}/rounds/${latest.round}`}>최신 {latest.round}회 풀기</Link>}</div>
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
  const adsp = useResume(props.state.status === 'success' ? props.state.rounds : [], props.stores.adsp, exams[0]);
  const sqld = useResume(state.status === 'success' ? state.rounds : [], props.stores.sqld, exam);
  return <>
    <section className="hub-intro" aria-labelledby="hub-intro-title">
      <div className="hub-intro-copy">
        <p className="hub-intro-eyebrow">독학으로 준비하는</p>
        <h1 id="hub-intro-title">자격증 합격, <br /><span>독토리가 함께할게요!</span></h1>
        <ul><li>기출 복원 문제로 차근차근 시험 감각을 키워요</li><li>합격하는 날까지 독토리가 응원할게요</li></ul>
      </div>
      <div className="hub-character">
        <img className="dokdori" src={`${import.meta.env.BASE_URL}dokdori/hello.svg`} width="130" height="130" alt="" />
        <span className="dokdori-decoration bubble bubble-one" aria-hidden="true" />
        <span className="dokdori-decoration bubble bubble-two" aria-hidden="true" />
        <span className="dokdori-decoration bubble bubble-three" aria-hidden="true" />
        <span className="dokdori-decoration leaf leaf-one" aria-hidden="true" />
        <span className="dokdori-decoration leaf leaf-two" aria-hidden="true" />
      </div>
      <div className="hub-character-copy">
        <strong>안녕하세요, 독토리예요!</strong>
        <p>독학의 "독"과 도토리를 합쳐 지은 이름이에요. 작은 도토리가 자라 큰 나무가 되듯, 혼자 하는 공부도 하루하루 쌓이면 합격이 돼요.</p>
        <p>학사모 끝의 새싹 잎은 여러분의 실력이 자라고 있다는 표시랍니다.</p>
      </div>
    </section>
    <h2 className="hub-exams-title">기출 복원 문제를 회차별로 풀어 보세요</h2>
    <p className="page-lead">시험을 고르면 회차별 시험·연습과 주제별 모아 풀기를 할 수 있습니다.<br />풀이 기록은 이 브라우저에만 저장됩니다.</p>
    <div className="exam-grid"><ExamCard exam={exams[0]} {...props} /><ExamCard exam={exam} state={state} retry={() => { setState({ status: 'loading' }); setAttempt(n => n + 1); }} /></div>
    {(adsp.resume || sqld.resume) && <section className="hub-resume-section"><h2>이어 풀기</h2><ResumePanel selection={adsp} exam={exams[0]} hub /><ResumePanel selection={sqld} exam={exam} hub /></section>}
    <aside className="overview-panel hub-notice">복원 문제입니다. 실제 시험과 다를 수 있습니다.</aside>
  </>;
}

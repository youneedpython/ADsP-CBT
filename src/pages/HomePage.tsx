import { Link } from 'react-router';
import { LoadingState, type PageProps } from '../components/LoadingState';
import { selectResume, answeredCount } from '../domain/roundOverview';
import { getTiming, formatRemainingTime } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';
export function HomePage({ state, retry }: PageProps) {
  const store = useRecordStore();
  const rounds = state.status === 'success' ? state.rounds : [];
  const numbers = rounds.map(round => round.round);
  const latest = numbers.length ? Math.max(...numbers) : null;
  const records = Object.fromEntries(rounds.map(round => [round.round, { exam: store.read(round.round, 'exam', round.questionCount), practice: store.read(round.round, 'practice', round.questionCount), result: null }]));
  const resume = selectResume(rounds, records);
  const remainingSeconds = resume?.mode === 'exam'
    ? getTiming(records[resume.round.round]!.exam!.elapsedSeconds, resume.round.timeLimitMinutes).remainingSeconds
    : null;
  const timeLabel = remainingSeconds === null ? '' : remainingSeconds <= 0
    ? ' · 시간 초과'
    : ` · 남은 시간 ${formatRemainingTime(remainingSeconds)}`;
  return <>
    <div className={`home-hero${resume ? ' with-resume' : ''}`}><div>
      <h1 className="page-title">ADsP 기출 복원 문제를 회차별로 풀어 보세요</h1>
      <p className="page-lead">{latest !== null && `데이터분석 준전문가(ADsP) ${Math.min(...numbers)}회부터 ${latest}회까지의 복원 문제를 실제 시험처럼 풀고, 정답과 해설을 바로 확인합니다. `}가입 없이 무료로 씁니다.</p>
      <div className="overview-actions"><Link className="button" to="/rounds">회차 고르기</Link>{latest !== null && <Link className="button secondary" to={`/rounds/${latest}`}>최신 {latest}회 풀기</Link>}</div>
      {state.status !== 'success' ? <LoadingState state={state} retry={retry} /> : rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p> : <dl className="home-facts"><div><dt>회차</dt><dd>{rounds.length}개</dd></div><div><dt>문제</dt><dd>{rounds.reduce((sum, round) => sum + round.questionCount, 0)}문항</dd></div><div><dt>과목</dt><dd>3개</dd></div><div><dt>합격 기준</dt><dd>60점 이상</dd></div></dl>}
    </div>{resume && <section className="overview-panel resume-panel" aria-labelledby="resume-title"><h2 id="resume-title">이어 풀기</h2><strong>{resume.round.round}회 · {resume.mode === 'exam' ? '시험' : '연습'}</strong><p>푼 문제 {answeredCount(resume.record)} / {resume.round.questionCount}{timeLabel}</p><progress aria-label="이어 풀기 진행" value={answeredCount(resume.record)} max={resume.round.questionCount} /><Link className="button" to={`/rounds/${resume.round.round}/${resume.mode}`}>이어서 풀기</Link></section>}</div>
    <section className="how-section"><h2>이렇게 풉니다</h2><div className="how-grid">
      <section className="overview-panel"><span className="step-number" aria-hidden="true">1</span><h3>연습</h3><p>한 문제씩 풀고 정답 확인을 누르면 정답과 해설이 바로 나옵니다. 시간 제한이 없습니다.</p></section>
      <section className="overview-panel"><span className="step-number" aria-hidden="true">2</span><h3>시험</h3><p>50문항을 90분 안에 풉니다. 제출하기 전에는 정답이 보이지 않습니다.</p></section>
      <section className="overview-panel"><span className="step-number" aria-hidden="true">3</span><h3>결과와 다시 보기</h3><p>총점과 과목별 점수, 합격 여부를 보고 틀린 문제만 골라 해설을 다시 읽습니다.</p></section>
    </div></section>
  </>;
}

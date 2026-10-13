import { Link } from 'react-router';
import { LoadingState, type PageProps } from '../components/LoadingState';
import { cardRecord, groupRounds } from '../domain/roundOverview';
import { useRecordStore } from '../storage/RecordStoreContext';
export function RoundList({ state, retry }: PageProps) {
  const store = useRecordStore();
  return <>
    <h1 className="page-title">회차 고르기</h1>
    <p className="page-lead">회차를 누르면 기본 정보를 확인하고 연습이나 시험을 시작합니다. <span>풀이 기록은 이 브라우저에만 저장됩니다.</span></p>
    {state.status !== 'success' ? <LoadingState state={state} retry={retry} /> : state.rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p> : groupRounds(state.rounds).map(group => <section key={group.year} aria-labelledby={`year-${group.year}`}>
      <div className="year-heading"><h2 id={`year-${group.year}`}>{group.year}년</h2><span>{group.rounds.length}회차</span></div>
      <ul className="round-list">{group.rounds.map(round => {
        const record = cardRecord(round, { exam: store.read(round.round, 'exam', round.questionCount), practice: store.read(round.round, 'practice', round.questionCount), result: store.read(round.round, 'result', round.questionCount) });
        return <li key={round.round}><Link className={`round-card ${record.kind === 'exam' ? 'in-progress' : ''}`} to={`/rounds/${round.round}`} aria-label={`${round.round}회, ${round.questionCount}문항 ${round.timeLimitMinutes}분, ${record.text}`}>
          <div><strong className="round-number">{round.round}회</strong><p className="round-meta">{round.questionCount}문항 · {round.timeLimitMinutes}분</p></div><div className="card-status"><span className={`record-${record.kind}`}>{record.text}</span><span className="card-open" aria-hidden="true">열기 ›</span></div>
        </Link></li>;
      })}</ul>
    </section>)}
  </>;
}

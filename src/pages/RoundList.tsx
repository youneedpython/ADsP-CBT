import { formatRemainingTime, getTiming } from '../domain/session';
import { useEffect, useState } from 'react';
import { Link } from "react-router";
import { LoadingState, type PageProps } from "../components/LoadingState";
import { useRecordStore } from '../storage/RecordStoreContext';
export function RoundList({ state, retry }: PageProps) {
  const store = useRecordStore();
  const [records, setRecords] = useState<Record<number, { exam: ReturnType<typeof store.read<'exam'>>; result: ReturnType<typeof store.read<'result'>> }>>({});
  useEffect(() => {
    if (state.status === 'success') setRecords(Object.fromEntries(state.rounds.map(round => [round.round, {
      exam: store.read(round.round, 'exam', round.questionCount), result: store.read(round.round, 'result', round.questionCount),
    }])));
  }, [state, store]);
  return <>
    <aside className="notice" aria-labelledby="notice-title">
      <h2 id="notice-title">복원 문제 안내</h2>
      <p>공식 기출문제가 아니라 응시자의 기억으로 복원한 문제입니다. 실제 시험의 문제, 보기, 정답과 다를 수 있습니다.</p>
    </aside>
    <section aria-label="회차 목록">
      {state.status !== 'success' ? <LoadingState state={state} retry={retry} /> :
        state.rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p> :
          <ul className="round-list">{state.rounds.map(round => {
            const exam = records[round.round]?.exam;
            const remaining = exam ? getTiming(exam.elapsedSeconds, round.timeLimitMinutes).remainingSeconds : 0;
            const result = records[round.round]?.result;
            const label = exam ? '시험 이어 풀기' : '시험';
            return <li key={round.round} className="round-card">
            <div className="round-heading"><h2>{round.round}회</h2><span className={!exam && result ? result.passed ? 'record-pass' : 'record-fail' : undefined}>{exam ? `시험 ${Object.keys(exam.answers).length}/${round.questionCount} 진행 중 · ${remaining <= 0 ? '시간 초과' : `남은 시간 ${formatRemainingTime(remaining)}`}` : result ? `최근 ${result.score}점 · ${result.passed ? '합격' : '불합격'}` : '기록 없음'}</span></div>
            <p className="round-meta">{round.questionCount}문항 · {round.timeLimitMinutes}분</p>
            <div className="round-actions">
              <Link className="button secondary" to={`/rounds/${round.round}/practice`} aria-label={`${round.round}회 연습`}>연습</Link>
              <Link className="button" to={`/rounds/${round.round}/exam`} aria-label={`${round.round}회 ${label}`}>{label}</Link>
              {result && <Link className="button secondary" to={`/rounds/${round.round}/result`} aria-label={`${round.round}회 결과 보기`}>결과 보기</Link>}
            </div>
          </li>; })}</ul>}
    </section>
    <p className="storage-notice">풀이 기록은 이 브라우저에만 저장됩니다.</p>
  </>;
}

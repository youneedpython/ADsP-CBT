import { useQuestionKeys } from '../components/useQuestionKeys';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { RoundPage } from '../components/RoundPage';
import { QuestionView } from '../components/QuestionView';
import type { PageProps } from '../components/LoadingState';
import type { RoundData } from '../data/types';
import { scoreRound } from '../domain/scoring';
import { useRecordStore } from '../storage/RecordStoreContext';

export function ReviewPage(props: PageProps) {
  return <RoundPage {...props}>{data => <ReviewRound key={data.round} data={data} />}</RoundPage>;
}
function ReviewRound({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const [record] = useState(() => store.read(data.round, 'result', data.questions.length));
  const [params, setParams] = useSearchParams();
  const result = scoreRound(data, record?.answers ?? {});
  const wrong = result.questions.filter(question => !question.correct);
  const filtered = params.get('filter') === 'wrong' && wrong.length > 0;
  const scope = filtered ? wrong : result.questions;
  const raw = params.get('q');
  const requested = raw !== null && /^\d+$/.test(raw) ? Number(raw) : undefined;
  const index = scope.findIndex(question => question.number === requested);
  const position = index < 0 ? 0 : index;
  const current = scope[position].number;
  const move = (number: number, useWrong = filtered) => {
    setParams({ ...(useWrong ? { filter: 'wrong' } : {}), q: String(number) }, { replace: true });
  };
  useEffect(() => {
    if (record && (raw !== String(current) || params.has('filter') && !filtered)) {
      setParams({ ...(filtered ? { filter: 'wrong' } : {}), q: String(current) }, { replace: true });
    }
  }, [record, raw, current, params, filtered, setParams]);
  useQuestionKeys({ blocked: !record, previous: position > 0 ? () => move(scope[position - 1].number) : undefined, next: position < scope.length - 1 ? () => move(scope[position + 1].number) : undefined });
  if (!record) return <div className="state-panel"><p>시험 기록이 없습니다.</p><Link className="button" to={`/rounds/${data.round}/exam`}>시험 시작</Link></div>;
  return <>
    <div className="practice-heading"><h2>{data.round}회 · 다시 보기</h2>
      <p>{filtered ? '틀린 문제' : '전체'} {position + 1} / {scope.length}</p>
    </div>
    <nav className="round-actions" aria-label="다시 보기 범위">
      <button aria-pressed={!filtered} onClick={() => move(result.questions[0].number, false)}>전체 {result.questionCount}</button>
      <button aria-pressed={filtered} disabled={wrong.length === 0} onClick={() => move(wrong[0].number, true)}>틀린 문제 {wrong.length}</button>
    </nav>
    <QuestionView round={data.round} question={data.questions.find(question => question.number === current)!} subjects={data.subjects}
      selected={result.questions.find(question => question.number === current)!.selected ?? undefined} mode="review" choose={() => {}} />
    <nav className="practice-nav" aria-label="문제 이동">
      <button className="secondary" disabled={position === 0} onClick={() => move(scope[position - 1].number)}>이전</button>
      <Link className="button secondary" to={`/rounds/${data.round}/result`}>결과로</Link>
      <button disabled={position === scope.length - 1} onClick={() => move(scope[position + 1].number)}>다음</button>
    </nav>
  </>;
}

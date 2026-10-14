import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { LoadingState, type PageProps } from '../components/LoadingState';
import { loadRound } from '../data/loadRound';
import { useTopics } from '../components/TopicsContext';
import { FrequencyBar } from '../components/FrequencyBar';
import type { RoundData, RoundSummary, TopicsData } from '../data/types';
import { collectQuestions, subjectQuestions, topicStatistics, wrongQuestions } from '../domain/practiceSets';
import { useRecordStore } from '../storage/RecordStoreContext';
import { SetPractice } from './SetPractice';

export interface SetsData { summaries: RoundSummary[]; rounds: RoundData[]; topics: TopicsData }
function SetsLoader({ state, retry, children }: PageProps & { children: (data: SetsData) => ReactNode }) {
  const topicsSource = useTopics();
  const [loaded, setLoaded] = useState<{ status: 'loading' | 'error' } | { status: 'success'; data: SetsData }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoaded({ status: 'loading' });
    if (state.status === 'success') {
      Promise.all([Promise.all(state.rounds.map(summary => loadRound(summary, controller.signal))), topicsSource!.get()])
        .then(([rounds, topics]) => { if (!controller.signal.aborted) setLoaded({ status: 'success', data: { summaries: state.rounds, rounds, topics } }); })
        .catch(() => { if (!controller.signal.aborted) setLoaded({ status: 'error' }); });
    }
    return () => controller.abort();
  }, [state, attempt]);
  if (state.status !== 'success') return <LoadingState state={state} retry={retry} />;
  if (loaded.status !== 'success') return <LoadingState state={loaded} retry={() => { topicsSource?.retryFailed(); setAttempt(value => value + 1); }} />;
  return children(loaded.data);
}
export function SetsPage(props: PageProps) {
  const { pathname } = useLocation();
  return <SetsLoader {...props}>{data => pathname === '/sets' ? <SetsOverview data={data} /> : <SetPractice key={pathname} data={data} pathname={pathname} />}</SetsLoader>;
}
function SetsOverview({ data }: { data: SetsData }) {
  const store = useRecordStore();
  const [subject, setSubject] = useState(1);
  const [filter, setFilter] = useState(0);
  const items = collectQuestions(data.summaries, data.rounds);
  const records = Object.fromEntries(data.rounds.map(round => [round.round, { practice: store.read(round.round, 'practice', round.questions.length), result: store.read(round.round, 'result', round.questions.length) }]));
  const wrong = wrongQuestions(items, records, store.readResolved());
  const statistics = topicStatistics(items, data.topics, data.summaries);
  const subjectName = data.rounds.flatMap(round => round.subjects).find(item => item.id === subject)?.name;
  return <>
    <h1 className="page-title">모아 풀기</h1><p className="page-lead">회차를 넘나들며 필요한 문제만 모아 연습합니다. 정답 확인과 해설은 연습과 같습니다.</p>
    <div className="sets-grid">
      <section className="overview-panel set-card"><h2 className="eyebrow">틀린 문제</h2><strong className="set-count">{wrong.length}문항</strong><p>시험과 연습에서 틀린 문제입니다. 다시 맞히면 목록에서 빠집니다.</p>{wrong.length === 0 && <p>틀린 문제가 없습니다.</p>}{wrong.length ? <Link className="button set-action" to="/sets/wrong">틀린 문제 풀기</Link> : <button className="set-action" disabled>틀린 문제 풀기</button>}</section>
      <section className="overview-panel set-card"><h2 className="eyebrow">과목별</h2><strong>{subject}과목 {subjectName}</strong><p>{data.summaries.length}개 회차 · {subjectQuestions(items, subject).length}문항</p><div className="set-filters" role="group" aria-label="과목 고르기">{[1, 2, 3].map(id => <button className="secondary" key={id} aria-pressed={subject === id} onClick={() => setSubject(id)}>{id}과목 {subjectQuestions(items, id).length}</button>)}</div><Link className="button secondary set-action" to={`/sets/subject/${subject}`}>{subject}과목 풀기</Link></section>
      <section className="overview-panel set-card"><h2 className="eyebrow">주제별</h2><strong>자주 나오는 주제부터</strong><p>{statistics.length}개 주제 · 출제 빈도 순</p><a className="button secondary set-action" href="#topics" onClick={event => { event.preventDefault(); document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('topics')?.focus(); }}>주제 고르기</a></section>
    </div>
    <section className="topics-section" aria-labelledby="topics"><h2 id="topics" tabIndex={-1}>주제별 출제 빈도</h2><div className="set-filters" role="group" aria-label="표의 과목 거르기">{[0, 1, 2, 3].map(id => <button className="secondary" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{id === 0 ? '전체' : `${id}과목`}</button>)}</div>
      <table className="topics-table"><thead><tr><th scope="col">주제</th><th scope="col">출제 회차</th><th scope="col">문항</th><th scope="col">풀기</th></tr></thead><tbody>{statistics.filter(topic => filter === 0 || topic.subject === filter).map(topic => <tr key={topic.id}><th scope="row">{topic.name}<small>{topic.subject}과목 · 출제 빈도 {topic.frequency}</small></th><td className="topic-frequency"><FrequencyBar rounds={topic.rounds} /><small>{data.summaries.length}회 중 {topic.roundCount}회</small></td><td>{topic.questionCount}문항</td><td><Link to={`/sets/topic/${topic.id}`} aria-label={`${topic.name} 풀기 ›`}>풀기 ›</Link></td></tr>)}</tbody></table>
    </section>
  </>;
}

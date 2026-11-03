import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { LoadingState, type PageProps } from '../components/LoadingState';
import { useExam } from '../components/ExamContext';
import { Modal } from '../components/Modal';
import { loadRound } from '../data/loadRound';
import type { RoundData } from '../data/types';
import { createMock, restoreMock } from '../domain/mockExam';
import { formatRemainingTime, getTiming } from '../domain/session';
import { RecordStoreContext, useRecordStore } from '../storage/RecordStoreContext';
import type { RecordKind, RecordTypes } from '../storage/records';
import { ExamRound } from './ExamPage';
import { ResultRound } from './ResultPage';
import { ReviewRound } from './ReviewPage';

export function MockPage({ state, retry }: PageProps) {
  const exam = useExam();
  const [rounds, setRounds] = useState<RoundData[]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRounds(undefined); setError(false);
    if (state.status === 'success') Promise.all(state.rounds.map(s => loadRound(s, controller.signal, exam)))
      .then(value => { if (!controller.signal.aborted) setRounds(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [state, exam, attempt]);
  if (state.status !== 'success') return <LoadingState state={state} retry={retry} />;
  if (!rounds) return <LoadingState state={{ status: error ? 'error' : 'loading' }} retry={() => setAttempt(n => n + 1)} />;
  if (!rounds.length || !rounds.some(r => r.questions.length)) return <p className="state-panel">아직 등록된 문항이 없습니다.</p>;
  return <MockSession rounds={rounds} />;
}
function MockSession({ rounds }: { rounds: RoundData[] }) {
  const exam = useExam();
  const store = useRecordStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const progress = store.readMock('exam', rounds);
  const result = store.readMock('result', rounds);
  const mode = pathname.slice(`${exam.path}/mock`.length);
  const record = mode === '/exam' ? progress : result;
  const data = useMemo(() => record ? restoreMock(rounds, record.sources, exam) : null,
    [rounds, exam, JSON.stringify(record?.sources)]);
  const adapted = useMemo(() => ({ ...store,
    read<K extends RecordKind>(round: number, kind: K, count: number): RecordTypes[K] | null {
      if (round !== 0 || kind === 'practice') return store.read(round, kind, count);
      return store.readMock(kind, rounds) as RecordTypes[K] | null;
    },
    write<K extends RecordKind>(round: number, kind: K, value: RecordTypes[K]) {
      if (round !== 0 || kind === 'practice') return store.write(round, kind, value);
      const sources = data!.questions.map(q => q.source);
      if (kind === 'exam') store.writeMock('exam', { ...value as RecordTypes['exam'], sources });
      else store.writeMock('result', { ...value as RecordTypes['result'], sources });
    },
    remove(round: number, kind: RecordKind) {
      if (round === 0 && kind !== 'practice') store.removeMock(kind); else store.remove(round, kind);
    },
  }), [store, rounds, data]);
  const start = () => {
    const next = createMock(rounds, exam);
    store.writeMock('exam', { answers: {}, current: 1, startedAt: new Date().toISOString(), elapsedSeconds: 0, sources: next.questions.map(q => q.source) });
    setConfirm(false); navigate(`${exam.path}/mock/exam`);
  };
  const requestStart = () => {
    if (store.readMock('exam', rounds)) setConfirm(true);
    else start();
  };
  const confirmation = confirm && <Modal label="새 모의고사 만들기 확인" close={() => setConfirm(false)}><p>진행 중인 모의고사를 지우고 새로 만들까요?</p><div className="round-actions"><button className="secondary" onClick={() => setConfirm(false)}>취소</button><button onClick={start}>새 모의고사 만들기</button></div></Modal>;
  if (mode) {
    if (!data || !['/exam', '/result', '/review'].includes(mode)) return <Navigate to={`${exam.path}/mock`} replace />;
    return <RecordStoreContext.Provider value={adapted}>{mode === '/exam' ? <ExamRound data={data} /> : mode === '/result' ? <ResultRound data={data} startMock={requestStart} /> : <ReviewRound data={data} />}{confirmation}</RecordStoreContext.Provider>;
  }
  const count = exam.subjects.reduce((sum, subject) => sum + Math.min(subject.questionCount, rounds.flatMap(r => r.questions).filter(q => q.subject === subject.id).length), 0);
  return <section className="overview-panel mock-overview">
    <h1 className="page-title">{exam.name} 실전 모의고사</h1>
    <p className="page-lead">여러 회차에서 과목 비율대로 문항을 무작위로 뽑아 90분 동안 풉니다. 제출 전에는 정답이 보이지 않습니다.</p>
    <dl className="home-facts mock-facts"><div><dt>문항</dt><dd>{count}문항</dd></div><div><dt>시간</dt><dd>90분</dd></div>
      <div><dt>과목별 문항 수</dt><dd>{exam.subjects.map(s => `${s.id}과목 ${Math.min(s.questionCount, rounds.flatMap(r => r.questions).filter(q => q.subject === s.id).length)}`).join(' · ')}</dd></div>
      <div><dt>출제 범위</dt><dd>{Math.min(...rounds.map(r => r.round))} ~ {Math.max(...rounds.map(r => r.round))}회 {rounds.reduce((n, r) => n + r.questions.length, 0)}문항</dd></div>
    </dl>
    <p>총점 60점 이상, 과목별 40% 이상이면 합격입니다.</p>
    {!store.canPersist() && <p className="notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    {progress && <p>푼 문제 {Object.keys(progress.answers).length} / {progress.sources.length} · 남은 시간 {formatRemainingTime(getTiming(progress.elapsedSeconds, 90).remainingSeconds)}</p>}
    <div className="round-actions">{progress ? <><Link className="button" to={`${exam.path}/mock/exam`}>이어서 풀기</Link><button className="secondary" onClick={() => setConfirm(true)}>새 모의고사 만들기</button></> : <button onClick={start}>새 모의고사 시작</button>}</div>
    {result && <p>최근 결과 {result.score}점 · {result.passed ? '합격' : '불합격'} · {new Date(result.submittedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} <Link to={`${exam.path}/mock/result`}>결과 보기</Link></p>}
    {confirmation}
  </section>;
}

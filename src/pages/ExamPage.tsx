import { Modal } from '../components/Modal';
import { useQuestionKeys } from '../components/useQuestionKeys';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { RoundPage } from '../components/RoundPage';
import type { PageProps } from '../components/LoadingState';
import { QuestionView } from '../components/QuestionView';
import { QuestionBoard } from '../components/QuestionBoard';
import type { Answer, RoundData } from '../data/types';
import { scoreRound } from '../domain/scoring';
import { accumulateElapsed, formatRemainingTime, getProgress, getTiming, isTimeWarning, selectExamAnswer } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';

export function ExamPage(props: PageProps) {
  return <RoundPage {...props}>{data => <ExamRound key={data.round} data={data} />}</RoundPage>;
}
function ExamRound({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [record, setRecord] = useState(() => store.read(data.round, 'exam', data.questions.length)
    ?? { answers: {}, current: 1, startedAt: new Date().toISOString(), elapsedSeconds: 0 });
  const live = useRef(record);
  const anchor = useRef<number | null>(null);
  const finished = useRef(false);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [expired, setExpired] = useState(false);
  const [persistent, setPersistent] = useState(store.canPersist);
  const announced = useRef(false);
  const raw = params.get('q');
  const requested = raw === null ? record.current : /^\d+$/.test(raw) ? Number(raw) : 1;
  const current = requested >= 1 && requested <= data.questions.length ? requested : 1;
  const timing = getTiming(record.elapsedSeconds, data.timeLimitMinutes);
  const progress = getProgress(record.answers, data.questions.map(q => q.number));
  const save = () => {
    if (finished.current) return;
    store.write(data.round, 'exam', live.current);
    setPersistent(store.canPersist());
  };
  const tick = () => {
    if (anchor.current === null || finished.current) return;
    const now = Date.now();
    const previous = anchor.current;
    const elapsedSeconds = accumulateElapsed(live.current.elapsedSeconds, previous, now);
    // Preserve fractional seconds between ordinary updates.
    anchor.current = now < previous || now - previous > 5000 ? now
      : previous + (elapsedSeconds - live.current.elapsedSeconds) * 1000;
    live.current = { ...live.current, elapsedSeconds };
    setRecord(live.current);
  };
  useEffect(() => {
    live.current = { ...live.current, current };
    save();
    if (raw !== String(current)) setParams({ q: String(current) }, { replace: true });
  }, [current, raw, setParams]);
  useEffect(() => {
    let timer: number | undefined;
    let updates = 0;
    const pause = () => {
      tick();
      anchor.current = null;
      window.clearInterval(timer);
      timer = undefined;
      save();
    };
    const resume = () => {
      if (timer !== undefined || finished.current || document.visibilityState !== 'visible') return;
      anchor.current = Date.now();
      updates = 0;
      timer = window.setInterval(() => {
        tick();
        if (++updates % 5 === 0) save();
      }, 1000);
    };
    const visibility = () => document.visibilityState === 'visible' ? resume() : pause();
    resume();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', resume);
    return () => {
      pause();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', resume);
    };
  }, [store, data.round]);
  useEffect(() => {
    if (timing.remainingSeconds <= 0 && !announced.current) { announced.current = true; setExpired(true); }
  }, [timing.remainingSeconds]);
  const move = (number: number) => {
    tick(); live.current = { ...live.current, current: number }; save();
    setParams({ q: String(number) }, { replace: true });
  };
  const choose = (answer: Answer) => {
    tick(); live.current = selectExamAnswer({ ...live.current, current }, current, answer);
    setRecord(live.current); save();
  };
  const restart = () => {
    store.remove(data.round, 'exam');
    live.current = { answers: {}, current: 1, startedAt: new Date().toISOString(), elapsedSeconds: 0 };
    if (anchor.current !== null) anchor.current = Date.now();
    announced.current = false; setExpired(false); setRestartConfirm(false);
    setRecord(live.current); save(); setParams({ q: '1' }, { replace: true });
  };
  useQuestionKeys({ blocked: confirm || restartConfirm, previous: current > 1 ? () => move(current - 1) : undefined, next: current < data.questions.length ? () => move(current + 1) : undefined, choose });
  const submit = () => {
    tick();
    finished.current = true;
    const submittedAt = Date.now();
    const result = scoreRound(data, record.answers);
    store.write(data.round, 'result', { answers: record.answers, score: result.score,
      subjectCorrect: { 1: 0, 2: 0, 3: 0, ...Object.fromEntries(result.subjects.map(s => [s.subject, s.correctCount])) },
      passed: result.passed, elapsedSeconds: live.current.elapsedSeconds,
      submittedAt: new Date(submittedAt).toISOString(), questionCount: result.questionCount });
    store.remove(data.round, 'exam');
    navigate(`/rounds/${data.round}/result`, { replace: true });
  };
  const question = data.questions[current - 1];
  return <>
    <div className="practice-heading"><h2>{data.round}회 · 시험</h2><p>푼 문제 {progress.answeredCount} / {data.questions.length}</p>
      <p className={isTimeWarning(timing.remainingSeconds) ? 'time-warning' : ''}>
        {timing.remainingSeconds >= 0 && '남은 시간 '}{formatRemainingTime(timing.remainingSeconds)}
        {timing.remainingSeconds >= 0 && isTimeWarning(timing.remainingSeconds) && ' · 10분 이하'}</p><progress aria-label="푼 문제 진행" value={progress.answeredCount} max={data.questions.length} /></div>
    {!persistent && <p className="notice exam-notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    {expired && <div role="alert" className="notice expiry-notice exam-notice">시간이 끝났습니다. 계속 풀거나 제출할 수 있습니다.<button className="secondary" onClick={() => setExpired(false)}>닫기</button></div>}
    <div className="practice-layout"><div className="practice-main">
      <QuestionView mode="exam" question={question} subjects={data.subjects} selected={record.answers[question.number] as Answer | undefined} choose={choose} />
      <nav className="practice-nav exam-nav" aria-label="문제 이동"><button className="secondary" disabled={current === 1} onClick={() => move(current - 1)}>이전</button><button className="secondary" disabled={current === data.questions.length} onClick={() => move(current + 1)}>다음</button><button onClick={() => setConfirm(true)}>제출하고 채점</button></nav>
    </div><aside className="exam-board" aria-label="문항 번호판"><QuestionBoard mode="exam" data={data} current={current} answers={record.answers} move={move} restart={() => setRestartConfirm(true)} /></aside></div>
    {restartConfirm && <Modal label="시험 다시 시작 확인" close={() => setRestartConfirm(false)}>
      <p>진행 중인 시험을 지우고 처음부터 다시 시작할까요? {progress.answeredCount ? `고른 답 ${progress.answeredCount}개와 지난 시간이 지워집니다.` : '고른 답과 지난 시간이 지워집니다.'}</p>
      <div className="round-actions"><button className="secondary" onClick={() => setRestartConfirm(false)}>취소</button><button onClick={restart}>다시 시작</button></div>
    </Modal>}
    {confirm && <Modal label="시험 제출 확인" close={() => setConfirm(false)}>
      <p>{progress.unanswered.length ? `안 푼 문제가 ${progress.unanswered.length}개 있습니다. 제출할까요?` : '제출하고 채점할까요?'}</p>
      <div className="round-actions"><button className="secondary" onClick={() => setConfirm(false)}>취소</button><button onClick={submit}>제출</button></div>
    </Modal>}
  </>;
}

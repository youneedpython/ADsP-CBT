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
import { formatRemainingTime, getProgress, getTiming, isTimeWarning, selectExamAnswer } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';

export function ExamPage(props: PageProps) {
  return <RoundPage {...props}>{data => <ExamRound key={data.round} data={data} />}</RoundPage>;
}
function ExamRound({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [record, setRecord] = useState(() => store.read(data.round, 'exam', data.questions.length)
    ?? { answers: {}, current: 1, startedAt: new Date().toISOString() });
  const [now, setNow] = useState(Date.now);
  const [confirm, setConfirm] = useState(false);
  const [expired, setExpired] = useState(false);
  const [persistent, setPersistent] = useState(store.canPersist);
  const announced = useRef(false);
  const raw = params.get('q');
  const requested = raw === null ? record.current : /^\d+$/.test(raw) ? Number(raw) : 1;
  const current = requested >= 1 && requested <= data.questions.length ? requested : 1;
  const timing = getTiming(Date.parse(record.startedAt), now, data.timeLimitMinutes);
  const progress = getProgress(record.answers, data.questions.map(q => q.number));
  useEffect(() => {
    store.write(data.round, 'exam', { ...record, current });
    setPersistent(store.canPersist());
    if (raw !== String(current)) setParams({ q: String(current) }, { replace: true });
  }, [store, data.round, record, current, raw, setParams]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (timing.remainingSeconds <= 0 && !announced.current) { announced.current = true; setExpired(true); }
  }, [timing.remainingSeconds]);
  const move = (number: number) => setParams({ q: String(number) }, { replace: true });
  const choose = (answer: Answer) => setRecord(previous => selectExamAnswer({ ...previous, current }, current, answer));
  useQuestionKeys({ blocked: confirm, previous: current > 1 ? () => move(current - 1) : undefined, next: current < data.questions.length ? () => move(current + 1) : undefined, choose });
  const submit = () => {
    const submittedAt = Date.now();
    const result = scoreRound(data, record.answers);
    store.write(data.round, 'result', { answers: record.answers, score: result.score,
      subjectCorrect: { 1: 0, 2: 0, 3: 0, ...Object.fromEntries(result.subjects.map(s => [s.subject, s.correctCount])) },
      passed: result.passed, elapsedSeconds: getTiming(Date.parse(record.startedAt), submittedAt, data.timeLimitMinutes).elapsedSeconds,
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
    {!persistent && <p className="notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    {expired && <div role="alert" className="notice expiry-notice">시간이 끝났습니다. 계속 풀거나 제출할 수 있습니다.<button className="secondary" onClick={() => setExpired(false)}>닫기</button></div>}
    <div className="practice-layout"><div className="practice-main">
      <QuestionView mode="exam" question={question} subjects={data.subjects} selected={record.answers[question.number] as Answer | undefined} choose={choose} />
      <nav className="practice-nav exam-nav" aria-label="문제 이동"><button className="secondary" disabled={current === 1} onClick={() => move(current - 1)}>이전</button><button className="secondary" disabled={current === data.questions.length} onClick={() => move(current + 1)}>다음</button><button onClick={() => setConfirm(true)}>제출하고 채점</button></nav>
    </div><aside className="exam-board" aria-label="문항 번호판"><QuestionBoard mode="exam" data={data} current={current} answers={record.answers} move={move} /></aside></div>
    {confirm && <Modal label="시험 제출 확인" close={() => setConfirm(false)}>
      <p>{progress.unanswered.length ? `안 푼 문제가 ${progress.unanswered.length}개 있습니다. 제출할까요?` : '제출하고 채점할까요?'}</p>
      <div className="round-actions"><button className="secondary" onClick={() => setConfirm(false)}>취소</button><button onClick={submit}>제출</button></div>
    </Modal>}
  </>;
}

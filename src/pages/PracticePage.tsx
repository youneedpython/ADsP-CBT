import { Modal } from '../components/Modal';
import { useQuestionKeys } from '../components/useQuestionKeys';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PageProps } from '../components/LoadingState';
import { RoundPage } from '../components/RoundPage';
import { QuestionView } from '../components/QuestionView';
import { QuestionBoard } from '../components/QuestionBoard';
import type { Answer, RoundData } from '../data/types';
import { selectPracticeAnswer } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';
export function PracticePage(props: PageProps) {
  return <RoundPage {...props}>{data => <PracticeRound key={data.round} data={data} />}</RoundPage>;
}
function PracticeRound({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const [record, setRecord] = useState(() => store.read(data.round, 'practice', data.questions.length) ?? { answers: {}, current: 1 });
  const [persistent, setPersistent] = useState(store.canPersist);
  const answers = record.answers as Readonly<Record<number, Answer>>;
  const [drafts, setDrafts] = useState<Record<number, Answer | undefined>>({});
  const [open, setOpen] = useState(false);
  const resized = useRef(false);
  useEffect(() => {
    if (!open || !window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) { resized.current = true; setOpen(false); }
    };
    closeOnDesktop();
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);
  useEffect(() => {
    if (!open && resized.current) {
      resized.current = false;
      document.querySelector<HTMLElement>('.question-title')?.focus();
    }
  }, [open]);
  const [params, setParams] = useSearchParams();
  const raw = params.get('q');
  const requested = raw === null ? record.current : /^\d+$/.test(raw) ? Number(raw) : 1;
  const current = requested >= 1 && requested <= data.questions.length ? requested : 1;
  useEffect(() => {
    if (raw !== String(current)) setParams({ q: String(current) }, { replace: true });
  }, [raw, current, setParams]);
  const save = (next: typeof record) => {
    store.write(data.round, 'practice', next);
    setPersistent(store.canPersist());
    setRecord(next);
  };
  const restarting = useRef(false);
  const move = (number: number) => { setParams({ q: String(number) }, { replace: true }); setOpen(false); };
  useEffect(() => {
    if (restarting.current) {
      if (current === 1) restarting.current = false;
      return;
    }
    if (record.current !== current) {
      const next = { ...record, current };
      store.write(data.round, 'practice', next);
      setPersistent(store.canPersist());
      setRecord(next);
    }
  }, [store, data.round, record, current]);
  const restart = () => {
    setDrafts({});
    restarting.current = true;
    store.remove(data.round, 'practice'); setRecord({ answers: {}, current: 1 });
    setPersistent(store.canPersist()); setParams({ q: '1' }, { replace: true }); setOpen(false);
  };
  const confirmed = answers[current] !== undefined;
  const draft = drafts[current];
  const choose = (answer: Answer) => {
    if (!confirmed) setDrafts(previous => ({ ...previous, [current]: previous[current] === answer ? undefined : answer }));
  };
  const confirm = () => {
    if (!confirmed && draft !== undefined) save(selectPracticeAnswer({ ...record, current }, current, draft));
  };
  useQuestionKeys({ blocked: open, previous: current > 1 ? () => move(current - 1) : undefined, next: current < data.questions.length ? () => move(current + 1) : undefined, choose, confirm: !confirmed && draft !== undefined ? confirm : undefined });
  const question = data.questions[current - 1];
  const board = <QuestionBoard data={data} current={current} answers={answers} move={move} restart={restart} />;
  return <>
    <div className="practice-heading"><div className="practice-heading-row"><h2>{data.round}회 · 연습</h2><p>{current} / {data.questions.length}</p><button className="board-toggle secondary" onClick={() => setOpen(true)}>문항 번호판</button></div><progress aria-label="현재 문제 위치" value={current} max={data.questions.length} /></div>
    {!persistent && <p className="notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    <div className="practice-layout"><div className="practice-main">
      <QuestionView question={question} subjects={data.subjects} selected={answers[current] ?? draft} confirmed={confirmed} choose={choose} />
      <nav className="practice-nav" aria-label="문제 이동"><button className="secondary" disabled={current === 1} onClick={() => move(current - 1)}>이전</button><button className={!confirmed && draft !== undefined ? '' : 'secondary'} aria-disabled={confirmed || draft === undefined} onClick={confirm}>정답 확인</button>
        {current === data.questions.length ? <Link className={`button ${confirmed ? '' : 'secondary'}`} to="/">회차 목록</Link> : <button className={confirmed ? '' : 'secondary'} onClick={() => move(current + 1)}>다음</button>}
      </nav>
    </div><aside className="desktop-board" aria-label="문항 번호판">{board}</aside></div>
    {open && <Modal label="문항 번호판" close={() => setOpen(false)}><button className="secondary" onClick={() => setOpen(false)}>닫기</button>{board}</Modal>}
  </>;
}

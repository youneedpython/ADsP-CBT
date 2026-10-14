import { useMarks } from '../storage/useMarks';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Answer } from '../data/types';
import { collectQuestions, questionKey, subjectQuestions, topicQuestions, wrongQuestions } from '../domain/practiceSets';
import { useRecordStore } from '../storage/RecordStoreContext';
import { QuestionView } from '../components/QuestionView';
import { Modal } from '../components/Modal';
import { useQuestionKeys } from '../components/useQuestionKeys';
import type { SetsData } from './SetsPage';

export function SetPractice({ data, pathname }: { data: SetsData; pathname: string }) {
  const valid = pathname === '/sets/wrong' || pathname === '/sets/marked' || /^\/sets\/subject\/[1-3]$/.test(pathname)
    || data.topics.topics.some(topic => pathname === `/sets/topic/${topic.id}`);
  if (!valid) return <div className="state-panel"><p>풀 문제가 없습니다.</p><Link className="button" to="/sets">모아 풀기로</Link></div>;
  return <SetPracticeSession data={data} pathname={pathname} />;
}
function SetPracticeSession({ data, pathname }: { data: SetsData; pathname: string }) {
  const store = useRecordStore();
  const marks = useMarks();
  const [session] = useState(() => {
    const all = collectQuestions(data.summaries, data.rounds);
    const records = Object.fromEntries(data.rounds.map(round => [round.round, { practice: store.read(round.round, 'practice', round.questions.length), result: store.read(round.round, 'result', round.questions.length) }]));
    const subject = /^\/sets\/subject\/([1-3])$/.exec(pathname);
    const topicId = /^\/sets\/topic\/([^/]+)$/.exec(pathname)?.[1];
    const topic = data.topics.topics.find(topic => topic.id === topicId);
    const wrong = pathname === '/sets/wrong';
    const marked = pathname === '/sets/marked';
    const items = marked ? all.filter(item => marks.marked[questionKey(item)]) : wrong ? wrongQuestions(all, records, store.readResolved()) : subject ? subjectQuestions(all, Number(subject[1])) : topic ? topicQuestions(all, data.topics, topic.id) : [];
    const id = marked ? 'marked' : wrong ? 'wrong' : subject ? `subject-${subject[1]}` : `topic-${topicId}`;
    const name = marked ? '표시한 문제' : wrong ? '틀린 문제' : subject ? `${subject[1]}과목 ${items[0]?.subjects.find(item => item.id === Number(subject[1]))?.name ?? ''}` : topic?.name ?? '';
    // A changed wrong set (including a newer submitted exam) starts a fresh session.
    const signature = JSON.stringify(items.map(item => [questionKey(item), item.question.answer, wrong ? records[item.round].result?.submittedAt : null]));
    return { items, id, name, wrong, signature };
  });
  const [record, setRecord] = useState(() => store.readSet(session.id, session.signature, session.items.map(questionKey)) ?? { signature: session.signature, current: 1, answers: {} as Record<string, Answer> });
  const [params, setParams] = useSearchParams();
  const raw = params.get('q');
  const requested = raw === null ? record.current : /^\d+$/.test(raw) ? Number(raw) : 1;
  const current = requested >= 1 && requested <= session.items.length ? requested : 1;
  useEffect(() => {
    if (session.items.length && raw !== String(current)) setParams({ q: String(current) }, { replace: true });
  }, [raw, current, session.items.length, setParams]);
  const [drafts, setDrafts] = useState<Record<string, Answer | undefined>>({});
  const [open, setOpen] = useState(false);
  const [persistent, setPersistent] = useState(store.canPersist);
  const previous = useRef(current);
  useEffect(() => {
    if (previous.current !== current) document.querySelector<HTMLElement>('.question-title')?.focus();
    previous.current = current;
  }, [current]);
  const save = (next: typeof record) => { store.writeSet(session.id, next); setRecord(next); setPersistent(store.canPersist()); };
  const move = (current: number) => { save({ ...record, current }); setParams({ q: String(current) }, { replace: true }); setOpen(false); };
  const item = session.items[current - 1];
  const key = item ? questionKey(item) : '';
  const confirmed = record.answers[key] !== undefined;
  const draft = drafts[key];
  const choose = (answer: Answer) => { if (!confirmed) setDrafts(previous => ({ ...previous, [key]: previous[key] === answer ? undefined : answer })); };
  const confirm = () => {
    if (!item || confirmed || draft === undefined) return;
    if (session.wrong && draft === item.question.answer) store.writeResolved({ ...store.readResolved(), [key]: new Date().toISOString() });
    save({ ...record, current, answers: { ...record.answers, [key]: draft } });
  };
  useQuestionKeys({ toggleMark: item ? () => marks.toggle(item.round, item.question.number) : undefined, blocked: open || !item, previous: current > 1 ? () => move(current - 1) : undefined, next: current < session.items.length ? () => move(current + 1) : undefined, choose, confirm: !confirmed && draft !== undefined ? confirm : undefined });
  if (!item) return <div className="state-panel"><p>풀 문제가 없습니다.</p><Link className="button" to="/sets">모아 풀기로</Link></div>;
  return <>
    <div className="practice-heading set-practice-heading"><div className="practice-heading-row"><h2>모아 풀기 · {session.name}</h2><p>{current} / {session.items.length}</p><button className="secondary" onClick={() => setOpen(true)}>목록</button></div><progress aria-label="현재 문제 위치" value={current} max={session.items.length} /></div>
    {(!persistent || !marks.persistent) && <p className="notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    <p className="set-source">{item.round}회 {item.question.number}번</p>
    <QuestionView marked={Boolean(marks.marked[key])} toggleMark={() => marks.toggle(item.round, item.question.number)} currentTopic={/^\/sets\/topic\/([^/]+)$/.exec(pathname)?.[1]} round={item.round} question={item.question} subjects={item.subjects} selected={record.answers[key] ?? draft} confirmed={confirmed} choose={choose} />
    <nav className="practice-nav" aria-label="문제 이동"><button className="secondary" disabled={current === 1} onClick={() => move(current - 1)}>이전</button><button className={!confirmed && draft !== undefined ? '' : 'secondary'} aria-disabled={confirmed || draft === undefined} onClick={confirm}>정답 확인</button>{current === session.items.length ? <Link className="button" to="/sets">모아 풀기로</Link> : <button className={confirmed ? '' : 'secondary'} onClick={() => move(current + 1)}>다음</button>}</nav>
    {open && <Modal label="모음의 문항 목록" close={() => setOpen(false)}><button className="secondary" onClick={() => setOpen(false)}>닫기</button><div className="set-question-list">{session.items.map((question, index) => {
      const answer = record.answers[questionKey(question)];
      const status = answer === undefined ? '안 풂' : answer === question.question.answer ? '맞음' : '틀림';
      return <button key={questionKey(question)} className={`secondary set-list-item ${answer === undefined ? '' : status === '맞음' ? 'correct' : 'wrong'}`} aria-current={current === index + 1 ? 'step' : undefined} onClick={() => move(index + 1)}>{question.round}회 {question.question.number}번 · {status}</button>;
    })}</div></Modal>}
  </>;
}

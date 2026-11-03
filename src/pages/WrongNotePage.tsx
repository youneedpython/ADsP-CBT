import { Link, useSearchParams } from 'react-router';
import { useExam } from '../components/ExamContext';
import { MathText } from '../components/MathText';
import { QuestionStimulus } from '../components/QuestionStimulus';
import { collectQuestions, questionKey, topicStatistics, wrongQuestions } from '../domain/practiceSets';
import { useRecordStore } from '../storage/RecordStoreContext';
import type { SetsData } from './SetsPage';

export function WrongNotePage({ data }: { data: SetsData }) {
  const exam = useExam();
  const store = useRecordStore();
  const [query, setQuery] = useSearchParams();
  const roundSort = query.get('sort') === 'round';
  const explain = query.get('explain') !== '0';
  const change = (key: string, value?: string) => {
    const next = new URLSearchParams(query);
    if (value === undefined) next.delete(key); else next.set(key, value);
    setQuery(next);
  };
  const records = Object.fromEntries(data.rounds.map(round => [round.round, {
    practice: store.read(round.round, 'practice', round.questions.length),
    result: store.read(round.round, 'result', round.questions.length),
  }]));
  const wrong = wrongQuestions(collectQuestions(data.summaries, data.rounds), records, store.readResolved());
  const topicId = (item: typeof wrong[number]) => data.topics.questions[item.round]?.[item.question.number];
  const groups = roundSort
    ? [...new Set(wrong.map(item => item.round))].map(round => ({ id: String(round), name: `${round}회`, items: wrong.filter(item => item.round === round) }))
    : topicStatistics(data.topics, data.summaries).map(topic => ({ id: topic.id, name: topic.name, items: wrong.filter(item => topicId(item) === topic.id) })).filter(group => group.items.length);
  if (!wrong.length) return <><p>틀린 문제가 없습니다.</p><Link to={`${exam.path}/sets`}>모아 풀기로</Link></>;
  return <div className="wrong-note">
    <h1 className="page-title">{exam.name} 오답 노트</h1>
    <p>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} · 틀린 문제 {wrong.length}문항</p>
    <p className="wrong-note-notice">복원 문제입니다. 실제 시험과 다를 수 있습니다.</p>
    <div className="wrong-note-controls">
      <div className="wrong-note-buttons" role="group" aria-label="오답 노트 고르기">
        <button className="secondary" aria-pressed={!roundSort} onClick={() => change('sort')}>주제순</button>
        <button className="secondary" aria-pressed={roundSort} onClick={() => change('sort', 'round')}>회차순</button>
        <button className="secondary" aria-pressed={explain} onClick={() => change('explain', explain ? '0' : undefined)}>해설 포함</button>
        <button onClick={() => window.print()}>인쇄 / PDF로 저장</button>
        <Link to={`${exam.path}/sets`}>모아 풀기로</Link>
      </div>
      <p><small>인쇄 창에서 대상을 "PDF로 저장"으로 고르면 PDF 파일이 됩니다.</small></p>
    </div>
    {groups.map(group => <section key={group.id} className="wrong-note-group">
      <h2>{group.name} · {group.items.length}문항</h2>
      {group.items.map(item => {
        const q = item.question;
        const record = records[item.round];
        // Show the answer responsible for membership in the wrong collection.
        const resultWrong = record.result !== null && record.result.answers[q.number] !== q.answer;
        const selected = resultWrong ? record.result!.answers[q.number] : record.practice?.answers[q.number];
        const topic = data.topics.topics.find(topic => topic.id === topicId(item));
        return <article className="question-card wrong-note-question" key={questionKey(item)}>
          <div className="wrong-note-question-heading">
            <p className="question-subject">{item.round}회 {q.number}번 · {q.subject}과목 {item.subjects.find(subject => subject.id === q.subject)?.name} · {topic?.name}</p>
            <h3 className="question-title"><MathText text={q.question} /></h3>
          </div>
          <QuestionStimulus stimulus={q.stimulus} />
          {selected === undefined && <strong className="wrong-note-tag">안 푼 문제</strong>}
          <ol className="wrong-note-choices">{q.choices.map((choice, index) => <li key={index}>
            <MathText text={choice} />{' '}
            {selected === index + 1 && <strong className="wrong-note-tag">내 답</strong>}{' '}
            {q.answer === index + 1 && <strong className="wrong-note-tag">정답</strong>}
          </li>)}</ol>
          {explain && <section className="feedback"><h4>해설</h4><p><MathText text={q.explanation} /></p></section>}
        </article>;
      })}
    </section>)}
  </div>;
}

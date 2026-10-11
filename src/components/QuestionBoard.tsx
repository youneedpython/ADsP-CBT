import type { RoundData } from '../data/types';
import type { Answers } from '../domain/scoring';
export function QuestionBoard({ data, current, answers, move, restart, mode = 'practice' }: {
  data: RoundData; current: number; answers: Answers; move: (number: number) => void; restart?: () => void; mode?: 'practice' | 'exam';
}) {
  return <><h2>문항 번호판</h2>
    {data.subjects.map(subject => <section key={subject.id}>
      <h3>{subject.id}과목 {subject.name}</h3>
      <div className="number-grid">{data.questions.filter(q => q.subject === subject.id).map(q => {
        const state = answers[q.number] === undefined ? '안 푼 문제' : mode === 'exam' ? '푼 문제' : answers[q.number] === q.answer ? '맞은 문제' : '틀린 문제';
        return <button key={q.number} aria-label={`${q.number}번, ${state}${q.number === current ? ', 현재 문제' : ''}`} aria-current={q.number === current ? 'step' : undefined}
          className={state === '푼 문제' ? '' : state === '맞은 문제' ? 'correct' : state === '틀린 문제' ? 'wrong' : 'secondary'} onClick={() => move(q.number)}>{q.number}</button>;
      })}</div>
    </section>)}
    <p>{mode === 'exam' ? '푼 문제 · 안 푼 문제' : '맞은 문제 · 틀린 문제 · 안 푼 문제'}</p>{restart && <button className="secondary" onClick={restart}>처음부터 다시</button>}
  </>;
}

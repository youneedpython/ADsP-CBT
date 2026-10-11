import { useEffect, useRef } from 'react';
import type { Answer, Question, RoundData } from '../data/types';
import { dataUrl } from '../data/loadRound';
import { MathText } from './MathText';
const circled = ['①', '②', '③', '④'];
export function QuestionView({ question: q, subjects, selected, choose, mode = 'practice' }: {
  question: Question; subjects: RoundData['subjects']; selected?: Answer; choose: (answer: Answer) => void; mode?: 'practice' | 'exam' | 'review';
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const previous = useRef(q.number);
  useEffect(() => {
    if (previous.current !== q.number) title.current?.focus();
    previous.current = q.number;
  }, [q.number]);
  return <article className="question-card">
    <p>{q.subject}과목 {subjects.find(subject => subject.id === q.subject)?.name}</p>
    <h2 ref={title} tabIndex={-1} className="question-title">{q.number}. <MathText text={q.question} /></h2>
    {q.stimulus.map((item, index) => <div className="stimulus" key={index}>
      {item.type === 'text' && <p><MathText text={item.text} /></p>}
      {item.type === 'code' && <pre>{item.text}</pre>}
      {item.type === 'table' && <table><thead><tr>{item.rows[0].map((cell, col) => <th key={col} scope="col"><MathText text={cell} /></th>)}</tr></thead><tbody>{item.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, col) => <td key={col}><MathText text={cell} /></td>)}</tr>)}</tbody></table>}
      {item.type === 'image' && <img src={dataUrl(item.src)} alt={item.alt} />}
    </div>)}
    <div className="choices">{q.choices.map((choice, index) => {
      const answer = (index + 1) as Answer;
      const correct = (mode === 'review' || mode === 'practice' && selected !== undefined) && answer === q.answer;
      const wrong = mode !== 'exam' && selected === answer && answer !== q.answer;
      const locked = mode === 'review' || mode === 'practice' && selected !== undefined;
      return <button key={answer} disabled={mode === 'review'} aria-disabled={locked || undefined} aria-pressed={mode === 'exam' ? selected === answer : undefined} className={`choice ${correct ? 'correct' : wrong ? 'wrong' : mode === 'exam' && selected === answer ? 'selected' : ''}`} onClick={() => { if (!locked) choose(answer); }}>
        <span>{answer}.</span>{' '}<span><MathText text={choice} /></span>{correct && <>{' '}<strong>정답</strong></>}{wrong && <>{' '}<strong>내 답</strong></>}
        {mode === 'exam' && selected === answer && <>{' '}<strong>선택됨</strong></>}
        {mode === 'review' && correct && selected === answer && <>{' '}<strong>내 답</strong></>}
      </button>;
    })}</div>
    {mode === 'review' && <section className="feedback" aria-label="풀이 결과">
      {selected === undefined && <p>풀지 않음</p>}
      <h3>해설</h3><p><MathText text={q.explanation} /></p>
    </section>}
    {mode === 'practice' && selected !== undefined && <section className="feedback" aria-label="풀이 결과">
      <p role="status">{selected === q.answer ? '맞았습니다.' : `틀렸습니다. 정답은 ${circled[q.answer - 1]}번입니다.`}</p>
      <h3>해설</h3><p><MathText text={q.explanation} /></p>
    </section>}
  </article>;
}

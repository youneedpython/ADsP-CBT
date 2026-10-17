import { useState } from 'react';
import { Link } from 'react-router';
import { RoundPage } from '../components/RoundPage';
import type { PageProps } from '../components/LoadingState';
import type { RoundData } from '../data/types';
import { scoreRound } from '../domain/scoring';
import { formatRemainingTime } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';

export function ResultPage(props: PageProps) {
  return <RoundPage {...props}>{data => <ResultRound key={data.round} data={data} />}</RoundPage>;
}
function ResultRound({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const [record] = useState(() => store.read(data.round, 'result', data.questions.length));
  if (!record) return <div className="state-panel"><p>시험 기록이 없습니다.</p><Link className="button" to={`/rounds/${data.round}/exam`}>시험 시작</Link></div>;
  const result = scoreRound(data, record.answers);
  const wrong = result.questionCount - result.correctCount;
  return <section className="result-panel">
    <div className="result-heading"><h2><Link to={`/rounds/${data.round}`} className="round-title-link">{data.round}회</Link> · 결과</h2><p>걸린 시간 {formatRemainingTime(record.elapsedSeconds)}</p></div>
    {!store.canPersist() && <p className="notice">이 브라우저에서는 풀이 기록을 저장할 수 없습니다.</p>}
    <div className="result-summary"><p className="result-score">{result.score}점</p><p className={`result-verdict ${result.passed ? 'correct' : 'wrong'}`}>{result.passed ? '합격' : '불합격'}</p>
    {result.failureReasons.map(reason => <p key={reason}>{reason}</p>)}
    <p>총점 60점 이상, 과목별 40% 이상이면 합격입니다.</p>
    </div><div className="subject-results">{result.subjects.map(subject => <section className={subject.failed ? 'subject-failed' : undefined} key={subject.subject}>
      <h3>{subject.subject}과목 {subject.name}{subject.failed && <strong> · 과락</strong>}</h3>
      <progress aria-label={`${subject.subject}과목 맞은 문제`} value={subject.correctCount} max={subject.questionCount} /><p>{subject.correctCount} / {subject.questionCount}</p>
    </section>)}</div>
    <h3>문항별 결과</h3>
    <div className="result-grid">{result.questions.map(question => <Link key={question.number} className={question.correct ? 'correct' : 'wrong'} aria-label={`${question.number}번, ${question.correct ? '맞은 문제' : '틀린 문제'}`} to={`/rounds/${data.round}/review?q=${question.number}`}>{question.number}</Link>)}</div><p>틀린 문제 {wrong}</p>
    <nav className="round-actions"><Link className="button secondary" to={`/rounds/${data.round}`}>회차 정보로</Link><Link className="button" to={`/rounds/${data.round}/review${wrong ? '?filter=wrong' : ''}`}>{wrong ? '틀린 문제 보기' : '전체 문제 보기'}</Link></nav>
  </section>;
}

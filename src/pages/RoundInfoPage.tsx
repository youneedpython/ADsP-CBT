import { useState } from 'react';
import { Link } from 'react-router';
import { RoundPage } from '../components/RoundPage';
import type { PageProps } from '../components/LoadingState';
import type { RoundData } from '../data/types';
import { answeredCount, isPracticeInProgress } from '../domain/roundOverview';
import { getTiming, formatRemainingTime } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';
export function RoundInfoPage(props: PageProps) {
  return <RoundPage {...props}>{data => <RoundInfo key={data.round} data={data} />}</RoundPage>;
}
function RoundInfo({ data }: { data: RoundData }) {
  const store = useRecordStore();
  const [records] = useState(() => ({ exam: store.read(data.round, 'exam', data.questions.length), practice: store.read(data.round, 'practice', data.questions.length), result: store.read(data.round, 'result', data.questions.length) }));
  const [mode, setMode] = useState<'practice' | 'exam'>(records.exam ? 'exam' : 'practice');
  const practice = isPracticeInProgress(records.practice, data.questions.length) ? records.practice : null;
  const subjects = data.subjects.map(subject => ({ ...subject, count: data.questions.filter(question => question.subject === subject.id).length }));
  const remaining = records.exam ? getTiming(records.exam.elapsedSeconds, data.timeLimitMinutes).remainingSeconds : 0;
  const wrong = records.result && data.questions.some(question => records.result!.answers[question.number] !== question.answer);
  return <div className="round-info">
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/rounds">회차</Link> › {data.round}회</nav>
    <section className="overview-panel info-start"><p className="eyebrow">풀기 전 확인</p><h1 className="page-title">ADsP {data.round}회 복원 문제</h1>
      <dl className="info-facts"><div><dt>문항 수</dt><dd>{data.questions.length}문항</dd></div><div><dt>제한 시간</dt><dd>{data.timeLimitMinutes}분</dd></div><div className="full"><dt>합격 기준</dt><dd>총점 60점 이상 · 과목별 40% 미만 과락</dd></div></dl>
      <p className="info-hint">풀지 않은 문제는 오답으로 채점합니다. 시험 화면을 떠나 있는 동안은 시간이 멈춥니다.</p>
      <fieldset className="mode-fieldset"><legend>풀이 방식</legend><div className="mode-options">{(['practice', 'exam'] as const).map(value => <label key={value} className={`mode-option${mode === value ? ' active' : ''}`}><span><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} /> <strong>{value === 'practice' ? '연습' : '시험'}</strong></span><span className="mode-description">{value === 'practice' ? '문제마다 정답과 해설 확인 · 시간 제한 없음' : `다 풀고 한 번에 채점 · ${data.timeLimitMinutes}분`}</span></label>)}</div></fieldset>
      <Link className="button start-link" to={`/rounds/${data.round}/${mode}`}>{mode === 'practice' ? practice ? '연습 이어 풀기' : '연습 시작' : records.exam ? '시험 이어 풀기' : '시험 시작'}</Link>
    </section>
    <section className="overview-panel info-records"><h2>내 기록</h2>
      {records.result && <><p><strong className="saved-score">{records.result.score}점</strong> <span className={`record-${records.result.passed ? 'pass' : 'fail'}`}>{records.result.passed ? '합격' : '불합격'}</span></p><p className="record-details">최근 시험 · 걸린 시간 {formatRemainingTime(records.result.elapsedSeconds)}{subjects.map(subject => ` · ${subject.id}과목 ${records.result!.subjectCorrect[subject.id]} / ${subject.count}`).join('')}</p><div className="overview-actions"><Link className="button secondary" to={`/rounds/${data.round}/result`}>결과 보기</Link><Link className="button secondary" to={`/rounds/${data.round}/review${wrong ? '?filter=wrong' : ''}`}>{wrong ? '틀린 문제 다시 보기' : '다시 보기'}</Link></div></>}
      {records.exam && <p>시험 {answeredCount(records.exam)} / {data.questions.length} 진행 중 · {remaining <= 0 ? '시간 초과' : `남은 시간 ${formatRemainingTime(remaining)}`}</p>}
      {practice && <p>연습 {answeredCount(practice)} / {data.questions.length}</p>}
      {!records.result && !records.exam && !practice && <p>아직 기록이 없습니다.</p>}
    </section>
    <section className="overview-panel subject-composition"><h2>과목 구성과 과락 기준</h2><table><thead><tr><th scope="col">과목</th><th scope="col">문항</th><th scope="col">최소 정답</th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.id}><th scope="row">{subject.id}과목 {subject.name}</th><td>{subject.count}</td><td>{Math.ceil(subject.count * 0.4)}문항</td></tr>)}</tbody></table></section>
  </div>;
}

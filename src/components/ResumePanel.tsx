import { Link } from 'react-router';
import type { RoundSummary } from '../data/types';
import { selectResume, answeredCount } from '../domain/roundOverview';
import { getTiming, formatRemainingTime } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';
import type { Exam } from '../domain/exams';

export function useResume(rounds: RoundSummary[]) {
  const store = useRecordStore();
  const records = Object.fromEntries(rounds.map(round => [round.round, { exam: store.read(round.round, 'exam', round.questionCount), practice: store.read(round.round, 'practice', round.questionCount), result: null }]));
  const resume = selectResume(rounds, records);
  const seconds = resume?.mode === 'exam' ? getTiming(records[resume.round.round]!.exam!.elapsedSeconds, resume.round.timeLimitMinutes).remainingSeconds : null;
  const timeLabel = seconds === null ? '' : seconds <= 0 ? ' · 시간 초과' : ` · 남은 시간 ${formatRemainingTime(seconds)}`;
  return { resume, timeLabel };
}

export function ResumePanel({ selection, exam, hub = false }: { selection: ReturnType<typeof useResume>; exam: Exam; hub?: boolean }) {
  const { resume, timeLabel } = selection;
  if (!resume) return null;
  return <section className={`overview-panel resume-panel exam-${exam.id}${hub ? ' hub-resume' : ''}`} aria-label="이어 풀기">
    {hub ? <span className="exam-badge">{exam.name}</span> : <h2>이어 풀기</h2>}
    <div><strong>{resume.round.round}회 · {resume.mode === 'exam' ? '시험' : '연습'}</strong><p>푼 문제 {answeredCount(resume.record)} / {resume.round.questionCount}{timeLabel}</p></div>
    <progress aria-label="이어 풀기 진행" value={answeredCount(resume.record)} max={resume.round.questionCount} />
    <Link className="button" to={`${exam.path}/rounds/${resume.round.round}/${resume.mode}`}>이어서 풀기</Link>
  </section>;
}

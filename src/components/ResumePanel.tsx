import { Link } from 'react-router';
import type { RoundSummary } from '../data/types';
import { selectResume, answeredCount } from '../domain/roundOverview';
import { getTiming, formatRemainingTime } from '../domain/session';
import { useRecordStore } from '../storage/RecordStoreContext';
import type { Exam } from '../domain/exams';
import { useEffect, useState } from 'react';
import { useExam } from './ExamContext';
import { loadRound } from '../data/loadRound';
import type { MockRecord } from '../storage/records';

export function useResume(rounds: RoundSummary[], providedStore?: ReturnType<typeof useRecordStore>, providedExam?: Exam) {
  const contextExam = useExam();
  const exam = providedExam ?? contextExam;
  const contextStore = useRecordStore();
  const store = providedStore ?? contextStore;
  const [mock, setMock] = useState<MockRecord<'exam'> | null>(null);
  const summaries = JSON.stringify(rounds);
  useEffect(() => {
    const controller = new AbortController();
    setMock(null);
    if (rounds.length && store.readMock('exam')) Promise.all(rounds.map(s => loadRound(s, controller.signal, exam)))
      .then(data => { if (!controller.signal.aborted) setMock(store.readMock('exam', data)); })
      .catch(() => { /* A loading error must not erase saved progress. */ });
    return () => controller.abort();
  }, [summaries, store, exam]);
  const records = Object.fromEntries(rounds.map(round => [round.round, { exam: store.read(round.round, 'exam', round.questionCount), practice: store.read(round.round, 'practice', round.questionCount), result: null }]));
  const mockSummary: RoundSummary = { round: 0, year: 2026, title: '실전 모의고사', questionCount: mock?.sources.length ?? 50, timeLimitMinutes: 90, file: '' };
  if (mock) records[0] = { exam: mock, practice: null, result: null };
  const resume = selectResume(mock ? [...rounds, mockSummary] : rounds, records);
  const seconds = resume?.mode === 'exam' ? getTiming(records[resume.round.round]!.exam!.elapsedSeconds, resume.round.timeLimitMinutes).remainingSeconds : null;
  const timeLabel = seconds === null ? '' : seconds <= 0 ? ' · 시간 초과' : ` · 남은 시간 ${formatRemainingTime(seconds)}`;
  return { resume, timeLabel };
}

export function ResumePanel({ selection, exam, hub = false }: { selection: ReturnType<typeof useResume>; exam: Exam; hub?: boolean }) {
  const { resume, timeLabel } = selection;
  if (!resume) return null;
  return <section className={`overview-panel resume-panel exam-${exam.id}${hub ? ' hub-resume' : ''}`} aria-label="이어 풀기">
    {hub ? <span className="exam-badge">{exam.name}</span> : <h2>이어 풀기</h2>}
    <div><strong>{resume.round.round === 0 ? '실전 모의고사' : `${resume.round.round}회`} · {resume.mode === 'exam' ? '시험' : '연습'}</strong><p>푼 문제 {answeredCount(resume.record)} / {resume.round.questionCount}{timeLabel}</p></div>
    <progress className={exam.id === 'sqld' ? 'sqld-progress' : undefined} aria-label="이어 풀기 진행" value={answeredCount(resume.record)} max={resume.round.questionCount} />
    <Link className="button" to={resume.round.round === 0 ? `${exam.path}/mock/exam` : `${exam.path}/rounds/${resume.round.round}/${resume.mode}`}>이어서 풀기</Link>
  </section>;
}

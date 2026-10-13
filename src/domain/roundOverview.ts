import type { RoundSummary } from '../data/types';
import type { ExamRecord, PracticeRecord, ResultRecord } from '../storage/records';
export interface RoundRecords { exam: ExamRecord | null; practice: PracticeRecord | null; result: ResultRecord | null }
export const answeredCount = (record: PracticeRecord) => Object.keys(record.answers).length;
export function isPracticeInProgress(record: PracticeRecord | null, count: number): record is PracticeRecord {
  return record !== null && answeredCount(record) > 0 && answeredCount(record) < count;
}
export function groupRounds(rounds: readonly RoundSummary[]) {
  return [...new Set(rounds.map(round => round.year))].sort((a, b) => b - a).map(year => ({ year, rounds: rounds.filter(round => round.year === year).sort((a, b) => b.round - a.round) }));
}
export function cardRecord(round: RoundSummary, records: RoundRecords) {
  if (records.exam) return { text: `시험 ${answeredCount(records.exam)} / ${round.questionCount}`, kind: 'exam' };
  if (records.result) return { text: `${records.result.score}점 ${records.result.passed ? '합격' : '불합격'}`, kind: records.result.passed ? 'pass' : 'fail' };
  if (isPracticeInProgress(records.practice, round.questionCount)) return { text: `연습 ${answeredCount(records.practice)} / ${round.questionCount}`, kind: 'practice' };
  return { text: '기록 없음', kind: 'none' };
}
export function selectResume(rounds: readonly RoundSummary[], records: Readonly<Record<number, RoundRecords>>) {
  const exams = rounds.filter(round => records[round.round]?.exam).sort((a, b) => Date.parse(records[b.round]!.exam!.startedAt) - Date.parse(records[a.round]!.exam!.startedAt) || b.round - a.round);
  if (exams[0]) return { round: exams[0], mode: 'exam' as const, record: records[exams[0].round]!.exam! };
  const practices = rounds.filter(round => isPracticeInProgress(records[round.round]?.practice ?? null, round.questionCount)).sort((a, b) => b.round - a.round);
  if (practices[0]) return { round: practices[0], mode: 'practice' as const, record: records[practices[0].round]!.practice! };
  return null;
}

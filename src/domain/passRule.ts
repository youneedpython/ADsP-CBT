import { exams, type Exam } from './exams';
// 시험 규정 설명용 값이다. 실제 회차의 문제 데이터와 분리한다.
export const PASS_SCORE = 60;
export const POINTS_PER_QUESTION = 2;
export const SUBJECT_PASS_PERCENT = 40;
export function minimumSubjectCorrect(count: number) {
  return Math.ceil(count * SUBJECT_PASS_PERCENT / 100);
}
export function meetsSubjectMinimum(correct: number, count: number) {
  return correct * 100 >= count * SUBJECT_PASS_PERCENT;
}
export const EXAM_SUBJECTS = exams[0].subjects;
export const PASS_EXAMPLES = exams[0].examples;
export function evaluatePassExample(correctCounts: readonly number[], exam: Exam = exams[0]) {
 const score = correctCounts.reduce((sum, count) => sum + count, 0) * 100 / exam.subjects.reduce((sum, s) => sum + s.questionCount, 0);
 return { score, passed: score >= PASS_SCORE && exam.subjects.every((s, i) => meetsSubjectMinimum(correctCounts[i] ?? 0, s.questionCount)) };
}

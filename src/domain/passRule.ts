// 시험 규정 설명용 값이다. 실제 회차의 문제 데이터와 분리한다.
export const PASS_SCORE = 60;
export const POINTS_PER_QUESTION = 2;
export const SUBJECT_PASS_PERCENT = 40;
export const EXAM_SUBJECTS = [
  { id: 1, name: '데이터 이해', questionCount: 10 },
  { id: 2, name: '데이터 분석 기획', questionCount: 10 },
  { id: 3, name: '데이터 분석', questionCount: 30 },
] as const;

export function evaluatePassExample(correctCounts: readonly number[]) {
  const score = correctCounts.reduce((sum, count) => sum + count, 0) * POINTS_PER_QUESTION;
  const passed = score >= PASS_SCORE && EXAM_SUBJECTS.every((subject, index) =>
    (correctCounts[index] ?? 0) * 100 >= subject.questionCount * SUBJECT_PASS_PERCENT);
  return { score, passed };
}

export const PASS_EXAMPLES = [
  { correctCounts: [8, 5, 17], reason: '총점 60점이고 세 과목 모두 최소 정답을 넘었습니다.' },
  { correctCounts: [9, 3, 21], reason: '총점은 넘었지만 2과목이 3문항이라 과락입니다.' },
  { correctCounts: [4, 4, 12], reason: '과락은 없지만 총점이 60점에 못 미칩니다. 최소 정답만으로는 합격할 수 없습니다.' },
] as const;

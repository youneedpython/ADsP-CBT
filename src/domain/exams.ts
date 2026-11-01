export const exams = [{
  id: 'adsp', name: 'ADsP', fullName: '데이터분석 준전문가', path: '/adsp',
  description: '총점 60점 이상, 과목별 40% 이상이면 합격 · PDF 자료와 핵심 요약 제공',
  subjectCount: 3, hasPDF: true,
}] as const;
export type Exam = typeof exams[number];

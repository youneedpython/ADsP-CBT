import type { SubjectId } from '../data/types';
export interface Exam {
  id: 'adsp' | 'sqld'; name: string; fullName: string; path: string;
  description: readonly string[]; subjectCount: number; hasPDF: boolean; hasSets: boolean; math: boolean;
  downloadsFile: string; topicsFile: string; roundsFile: string; recordPrefix: string;
  subjects: readonly { id: SubjectId; name: string; questionCount: number }[];
  examples: readonly { correctCounts: readonly number[]; reason: string }[];
}
export const exams: readonly Exam[] = [{
  id: 'adsp', name: 'ADsP', fullName: '데이터분석 준전문가', path: '/adsp',
  description: ['총점 60점 이상, 과목별 40% 이상이면 합격', 'PDF 자료와 핵심 요약 제공'],
  subjectCount: 3, hasPDF: true, hasSets: true, math: true,
  downloadsFile: 'data/downloads.json', topicsFile: 'data/topics.json', roundsFile: 'data/rounds.json', recordPrefix: 'adsp-cbt:v1',
  subjects: [{ id: 1, name: '데이터 이해', questionCount: 10 }, { id: 2, name: '데이터 분석 기획', questionCount: 10 }, { id: 3, name: '데이터 분석', questionCount: 30 }],
  examples: [
    { correctCounts: [8, 5, 17], reason: '총점 60점이고 세 과목 모두 최소 정답을 넘었습니다.' },
    { correctCounts: [9, 3, 21], reason: '총점은 넘었지만 2과목이 3문항이라 과락입니다.' },
    { correctCounts: [4, 4, 12], reason: '과락은 없지만 총점이 60점에 못 미칩니다. 최소 정답만으로는 합격할 수 없습니다.' },
  ],
}, {
  id: 'sqld', name: 'SQLD', fullName: 'SQL 개발자', path: '/sqld',
  description: ['총점 60점 이상, 과목별 40% 이상이면 합격', '회차별 PDF 문제지 제공'],
  subjectCount: 2, hasPDF: true, hasSets: true, math: false,
  downloadsFile: 'data/sqld/downloads.json', topicsFile: 'data/sqld/topics.json', roundsFile: 'data/sqld/rounds.json', recordPrefix: 'cbt:v1:sqld',
  subjects: [{ id: 1, name: '데이터 모델링의 이해', questionCount: 10 }, { id: 2, name: 'SQL 기본 및 활용', questionCount: 40 }],
  examples: [
    { correctCounts: [5, 25], reason: '총점 60점이고 두 과목 모두 최소 정답을 넘었습니다.' },
    { correctCounts: [3, 30], reason: '총점은 넘었지만 1과목이 3문항이라 과락입니다.' },
    { correctCounts: [4, 16], reason: '과락은 없지만 총점이 60점에 못 미칩니다. 최소 정답만으로는 합격할 수 없습니다.' },
  ],
}];
export function examAtPath(path: string) {
  return exams.find(exam => path === exam.path || path.startsWith(`${exam.path}/`));
}

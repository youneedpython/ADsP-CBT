import type { Answer, RoundData, SubjectId } from '../data/types';
import { meetsSubjectMinimum } from './passRule';

export type Answers = Readonly<Record<number, number>>;
export function isAnswer(value: unknown): value is Answer {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 4;
}

export interface SubjectScore {
  subject: SubjectId;
  name: string;
  correctCount: number;
  questionCount: number;
  failed: boolean;
}
export interface ScoringResult {
  score: number;
  correctCount: number;
  questionCount: number;
  subjects: SubjectScore[];
  passed: boolean;
  failureReasons: string[];
  questions: { number: number; selected: Answer | null; answer: Answer; correct: boolean }[];
}

export function scoreRound(round: RoundData, answers: Answers): ScoringResult {
  const questions = round.questions.map(question => {
    const value = Object.hasOwn(answers, question.number) ? answers[question.number] : undefined;
    const selected = isAnswer(value) ? value : null;
    return { number: question.number, selected, answer: question.answer, correct: selected === question.answer };
  });
  const subjects = [...new Set(round.questions.map(question => question.subject))]
    .sort((a, b) => a - b).map(subject => {
      const indices = round.questions.flatMap((question, index) => question.subject === subject ? [index] : []);
      const correctCount = indices.filter(index => questions[index].correct).length;
      return { subject, name: round.subjects.find(item => item.id === subject)?.name ?? `${subject}과목`,
        correctCount, questionCount: indices.length, failed: !meetsSubjectMinimum(correctCount, indices.length) };
    });
  const correctCount = questions.filter(question => question.correct).length;
  const score = correctCount * 2;
  const failureReasons = [ ...(score < 60 ? ['총점 미달'] : []),
    ...subjects.filter(subject => subject.failed).map(subject => `${subject.subject}과목 과락`) ];
  return { score, correctCount, questionCount: questions.length, subjects,
    passed: failureReasons.length === 0, failureReasons, questions };
}

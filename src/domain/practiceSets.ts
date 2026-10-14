import type { Question, RoundData, RoundSummary, TopicsData } from '../data/types';
import type { PracticeRecord, ResultRecord } from '../storage/records';

export interface SetQuestion { round: number; question: Question; subjects: RoundData['subjects'] }
export const questionKey = (item: SetQuestion) => `${item.round}:${item.question.number}`;
export type ResolvedQuestions = Record<string, string>;
export interface RoundRecords { practice: PracticeRecord | null; result: ResultRecord | null }

export function collectQuestions(summaries: RoundSummary[], rounds: RoundData[]): SetQuestion[] {
  const registered = new Set(summaries.map(summary => summary.round));
  return rounds.filter(round => registered.has(round.round)).flatMap(round => round.questions.map(question => ({ round: round.round, question, subjects: round.subjects })))
    .sort((a, b) => b.round - a.round || a.question.number - b.question.number);
}
export function wrongQuestions(items: SetQuestion[], records: Record<number, RoundRecords>, resolved: ResolvedQuestions): SetQuestion[] {
  return items.filter(item => {
    const { practice, result } = records[item.round] ?? { practice: null, result: null };
    const number = item.question.number;
    const examWrong = result !== null && result.answers[number] !== item.question.answer;
    const practiceWrong = practice?.answers[number] !== undefined && practice.answers[number] !== item.question.answer;
    const solvedAt = resolved[questionKey(item)];
    return (examWrong || practiceWrong) && (!solvedAt || examWrong && Date.parse(result!.submittedAt) > Date.parse(solvedAt));
  });
}
export const subjectQuestions = (items: SetQuestion[], subject: number) => items.filter(item => item.question.subject === subject);
export const topicQuestions = (items: SetQuestion[], topics: TopicsData, id: string) => items.filter(item => topics.questions[item.round]?.[item.question.number] === id);
export function frequency(count: number, total: number): '높음' | '보통' | '낮음' {
  return total > 0 && count / total >= .8 ? '높음' : total > 0 && count / total >= .5 ? '보통' : '낮음';
}
export function topicSummary(topics: TopicsData, summaries: RoundSummary[], id: string) {
  const registered = [...summaries].sort((a, b) => b.round - a.round);
  const questions = registered.flatMap(summary => Object.entries(topics.questions[summary.round] ?? {})
    .filter(([, topic]) => topic === id).map(([number]) => ({ round: summary.round, number: Number(number) }))
    .sort((a, b) => a.number - b.number));
  const appeared = new Set(questions.map(item => item.round));
  return { questions, questionCount: questions.length, roundCount: appeared.size,
    rounds: registered.map(summary => appeared.has(summary.round)) };
}
export function topicStatistics(topics: TopicsData, summaries: RoundSummary[]) {
  return topics.topics.map(topic => {
    const summary = topicSummary(topics, summaries, topic.id);
    return { ...topic, ...summary, frequency: frequency(summary.roundCount, summaries.length) };
  }).sort((a, b) => b.roundCount - a.roundCount || b.questionCount - a.questionCount || a.id.localeCompare(b.id));
}

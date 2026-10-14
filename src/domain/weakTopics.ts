import type { Answer, RoundSummary, TopicsData } from '../data/types';
import { questionKey, topicStatistics, wrongQuestions, type ResolvedQuestions, type RoundRecords, type SetQuestion } from './practiceSets';

export function studyStatistics(items: SetQuestion[], topics: TopicsData, summaries: RoundSummary[],
  records: Record<number, RoundRecords>, resolved: ResolvedQuestions, setAnswers: Record<string, Answer>[]) {
  const wrong = new Set(wrongQuestions(items, records, resolved).map(questionKey));
  const solved = items.filter(item => {
    const record = records[item.round];
    const key = questionKey(item);
    return record?.practice?.answers[item.question.number] !== undefined
      || record?.result?.answers[item.question.number] !== undefined || setAnswers.some(answers => answers[key] !== undefined);
  });
  const statistics = topicStatistics(topics, summaries).map(topic => {
    const questions = solved.filter(item => topics.questions[item.round]?.[item.question.number] === topic.id);
    const correctCount = questions.filter(item => {
      const key = questionKey(item);
      if (wrong.has(key)) return false;
      const record = records[item.round];
      const roundAnswered = record?.practice?.answers[item.question.number] !== undefined || record?.result?.answers[item.question.number] !== undefined;
      return roundAnswered || !setAnswers.some(answers => answers[key] !== undefined && answers[key] !== item.question.answer);
    }).length;
    return { ...topic, solvedCount: questions.length, correctCount,
      accuracy: questions.length >= 3 ? Math.floor(correctCount / questions.length * 100) : null };
  });
  const weakest = statistics.filter(topic => topic.frequency !== '낮음' && topic.accuracy !== null && topic.accuracy < 100)
    .sort((a, b) => a.accuracy! - b.accuracy! || b.roundCount - a.roundCount || b.questionCount - a.questionCount || a.id.localeCompare(b.id)).slice(0, 3);
  return { statistics, weakest, solvedCount: solved.length };
}

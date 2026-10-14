import type { Question, RoundData, RoundSummary, TopicsData } from '../data/types';
export const rounds: RoundData[] = [49, 50].map(round => ({ formatVersion: 1, round, title: '개발용 표본', timeLimitMinutes: 90,
  subjects: [{ id: 1, name: '표본 이해' }, { id: 2, name: '표본 기획' }, { id: 3, name: '표본 분석' }],
  questions: [1, 2, 3].map((number): Question => ({ number, subject: number === 3 ? 3 : number === 2 ? 2 : 1, question: `표본 ${round}-${number}`, stimulus: [], choices: ['표본 하나', '표본 둘', '표본 셋', '표본 넷'], answer: 2, explanation: '개발용 표본 해설' })) }));
export const summaries: RoundSummary[] = rounds.map(round => ({ round: round.round, year: 2026, title: round.title, questionCount: round.questions.length, timeLimitMinutes: 90, file: `${round.round}.json` }));
export const topics: TopicsData = { formatVersion: 1, topics: [{ id: 'T101', name: '표본 주제 하나', subject: 1 }, { id: 'T201', name: '표본 주제 둘', subject: 2 }, { id: 'T301', name: '표본 주제 셋', subject: 3 }], questions: { 50: { 1: 'T101', 2: 'T201', 3: 'T301' }, 49: { 1: 'T101', 2: 'T301', 3: 'T301' } } };

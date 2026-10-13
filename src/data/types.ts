export interface RoundSummary {
  round: number;
  year: number;
  title: string;
  questionCount: number;
  timeLimitMinutes: number;
  file: string;
}
export type SubjectId = 1 | 2 | 3;
export type Answer = 1 | 2 | 3 | 4;
export type Stimulus =
  | { type: 'text' | 'code'; text: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'image'; src: string; alt: string };
export interface Question {
  number: number;
  subject: SubjectId;
  question: string;
  stimulus: Stimulus[];
  choices: [string, string, string, string];
  answer: Answer;
  explanation: string;
}
export interface RoundData {
  formatVersion: 1;
  round: number;
  title: string;
  timeLimitMinutes: number;
  subjects: { id: SubjectId; name: string }[];
  questions: Question[];
}

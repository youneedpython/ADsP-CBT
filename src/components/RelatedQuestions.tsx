import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { TopicsData } from '../data/types';
import { frequency } from '../domain/practiceSets';
import { useTopics } from './TopicsContext';
import { FrequencyBar } from './FrequencyBar';

export function RelatedQuestions({ round, number, currentTopic }: { round: number; number: number; currentTopic?: string }) {
  const source = useTopics();
  const [data, setData] = useState<TopicsData | null>(null);
  const get = source?.get;
  useEffect(() => {
    let active = true;
    get?.().then(topics => { if (active) setData(topics); }).catch(() => {});
    return () => { active = false; };
  }, [get]);
  const topic = data?.topics.find(topic => topic.id === data.questions[round]?.[number]);
  if (!topic || !data || !source) return null;
  const registered = [...source.summaries].sort((a, b) => b.round - a.round);
  const items = registered.flatMap(summary => Object.entries(data.questions[summary.round] ?? {})
    .filter(([, id]) => id === topic.id).map(([number]) => ({ round: summary.round, number: Number(number) })).sort((a, b) => a.number - b.number));
  const rounds = registered.map(summary => items.some(item => item.round === summary.round));
  const count = rounds.filter(Boolean).length;
  return <section className="related-questions" aria-label={`관련 문제 · ${topic.name}`}>
    <h3>관련 문제 · {topic.name}</h3>
    <div className="related-frequency"><FrequencyBar rounds={rounds} /><div><strong>출제 빈도 {frequency(count, rounds.length)}</strong><p>{rounds.length}개 회차 중 {count}회 · {items.length}문항</p></div></div>
    <div className="related-links">{items.map(item => item.round === round && item.number === number
      ? <button key={`${item.round}:${item.number}`} disabled aria-current="true" aria-label={`${item.round}회 ${item.number}번`}>{item.round}회 {item.number}</button>
      : <Link className="button secondary" key={`${item.round}:${item.number}`} aria-label={`${item.round}회 ${item.number}번`} to={`/rounds/${item.round}/practice?q=${item.number}`}>{item.round}회 {item.number}</Link>)}</div>
    {currentTopic !== topic.id && <Link className="button secondary" to={`/sets/topic/${topic.id}`}>이 주제 {items.length}문항 모아 풀기</Link>}
  </section>;
}

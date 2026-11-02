import type { Question } from '../data/types';
import { dataUrl } from '../data/loadRound';
import { MathText } from './MathText';
const stimulusLabel = (item: Question['stimulus'][number]) => item.type === 'text' ? /^\s*<([^<>]+)>\s*$/.exec(item.text)?.[1] : undefined;
export function QuestionStimulus({ stimulus }: { stimulus: Question['stimulus'] }) {
  const stimuli: (Question['stimulus'])[] = [];
  for (const item of stimulus) {
    const last = stimuli.at(-1);
    if (item.type === 'text' && !stimulusLabel(item) && last?.[0].type === 'text' && !stimulusLabel(last[0])) last.push(item);
    else stimuli.push([item]);
  }
  return <>
    {stimuli.map((group, index) => {
      const item = group[0];
      const label = stimulusLabel(item);
      if (label !== undefined) return <p className="stimulus-label" key={index}>{label}</p>;
      return <div className={`stimulus stimulus-${item.type}`} key={index}>
      {item.type === 'text' && group.map((paragraph, paragraphIndex) => paragraph.type === 'text' && <p key={paragraphIndex}><MathText text={paragraph.text} display /></p>)}
      {item.type === 'code' && <pre>{item.text}</pre>}
      {item.type === 'table' && <table><thead><tr>{item.rows[0].map((cell, col) => <th key={col} scope="col"><MathText text={cell} /></th>)}</tr></thead><tbody>{item.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, col) => <td key={col}><MathText text={cell} /></td>)}</tr>)}</tbody></table>}
      {item.type === 'image' && <img src={dataUrl(item.src)} alt={item.alt} />}
    </div>; })}
  </>;
}

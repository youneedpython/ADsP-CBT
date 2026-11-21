import type { Stimulus } from '../data/types';
import { MathText } from './MathText';
import { QuestionStimulus } from './QuestionStimulus';

export function Explanation({ text, stimulus, headingLevel = 4 }: { text: string; stimulus?: Stimulus[]; headingLevel?: 4 | 5 }) {
  const lines = text.split(/\r?\n/);
  const special = /^\s*(?:\[([^\[\]]+)\]|\[\[그림 (\d+)\]\])\s*$/;
  const elements: React.ReactNode[] = [];
  let block: string[] = [];
  let hasSpecial = false;
  const flush = () => {
    while (block.length && !block[0].trim()) block.shift();
    while (block.length && !block[block.length - 1].trim()) block.pop();
    if (block.length) elements.push(<p key={elements.length}><MathText text={block.join('\n')} /></p>);
    block = [];
  };
  for (const line of lines) {
    const match = special.exec(line);
    if (!match || (!match[2] && !match[1].trim())) { block.push(line); continue; }
    hasSpecial = true;
    flush();
    if (match[2]) {
      const item = stimulus?.[Number(match[2]) - 1];
      if (item) elements.push(<div className="explanation-stimulus" key={elements.length}><QuestionStimulus stimulus={[item]} /></div>);
    } else {
      const Heading = headingLevel === 4 ? 'h4' : 'h5';
      elements.push(<Heading className="explanation-heading" key={elements.length}>{match[1].trim()}</Heading>);
    }
  }
  if (!hasSpecial) return <p><MathText text={text} /></p>;
  flush();
  return <>{elements}</>;
}

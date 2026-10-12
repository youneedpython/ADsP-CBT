import katex from 'katex';
import 'katex/dist/katex.min.css';
export function MathText({ text, display = false }: { text: string; display?: boolean }) {
  const parts = text.split('$');
  const displayMode = display && /^\$[^$]+\$$/.test(text.trim());
  if (parts.length % 2 === 0) return <>{text}</>;
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return part;
    try {
      const html = katex.renderToString(part, { throwOnError: true, strict: 'ignore', trust: false, displayMode });
      return <span key={index} className={`formula${displayMode ? ' formula-display' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { return `$${part}$`; }
  })}</>;
}

import katex from 'katex';
import 'katex/dist/katex.min.css';
export function MathText({ text }: { text: string }) {
  const parts = text.split('$');
  if (parts.length % 2 === 0) return <>{text}</>;
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return part;
    try {
      const html = katex.renderToString(part, { throwOnError: true, strict: 'ignore', trust: false });
      return <span key={index} className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { return `$${part}$`; }
  })}</>;
}

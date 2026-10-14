import { useEffect, useState } from 'react';
import type katex from 'katex';
import { loadMath } from './loadMath';
export function MathText({ text, display = false }: { text: string; display?: boolean }) {
  const parts = text.split('$');
  const hasMath = parts.length > 1 && parts.length % 2 !== 0;
  const [renderer, setRenderer] = useState<typeof katex>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!hasMath) return;
    let active = true;
    loadMath().then(value => { if (active) setRenderer(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [hasMath]);
  const displayMode = display && /^\$[^$]+\$$/.test(text.trim());
  if (parts.length % 2 === 0) return <>{text}</>;
  return <>{parts.map((part, index) => {
    if (index % 2 === 0) return part;
    if (!renderer) return failed ? `$${part}$` : part;
    try {
      const html = renderer.renderToString(part, { throwOnError: true, strict: 'ignore', trust: false, displayMode });
      return <span key={index} className={`formula${displayMode ? ' formula-display' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { return `$${part}$`; }
  })}</>;
}

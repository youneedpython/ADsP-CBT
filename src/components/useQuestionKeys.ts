import { useEffect } from 'react';
import type { Answer } from '../data/types';

export function useQuestionKeys({ blocked = false, previous, next, choose, confirm }: {
  blocked?: boolean; previous?: () => void; next?: () => void; choose?: (answer: Answer) => void; confirm?: () => void;
}) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target;
      if (blocked || event.ctrlKey || event.altKey || event.metaKey ||
        target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const digit = /^[1-4]$/.test(event.key) ? Number(event.key) : /^Numpad[1-4]$/.test(event.code) ? Number(event.code.slice(-1)) : undefined;
      const interactive = target instanceof Element && target.closest('button, a, [role="button"], [role="link"]');
      const action = event.key === 'Enter' && !interactive ? confirm : event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : digit && choose ? () => choose(digit as Answer) : undefined;
      if (action) { event.preventDefault(); action(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [blocked, previous, next, choose, confirm]);
}

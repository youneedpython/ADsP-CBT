import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ label, close, children }: { label: string; close: () => void; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const background = Array.from(document.body.children).filter(element => !element.contains(panel.current)) as HTMLElement[];
    const states = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const controls = () => Array.from(panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
    controls()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = controls();
        const index = items.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    };
    window.addEventListener('keydown', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      background.forEach((element, index) => { element.inert = states[index]; });
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return createPortal(<div className="submit-overlay"><section ref={panel} role="dialog" aria-modal="true" aria-label={label} className="mobile-board">{children}</section></div>, document.body);
}

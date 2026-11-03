import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/main.css', 'utf8');

test('body wraps at word boundaries while screen code preserves whitespace', () => {
  const root = css.match(/:root\s*\{([^}]+)\}/)![1];
  expect(root).toContain('word-break: keep-all');
  expect(root).toContain('overflow-wrap: anywhere');
  const pre = css.match(/^pre\s*\{([^}]+)\}/m)![1];
  expect(pre).toContain('white-space: pre;');
  expect(pre).toContain('overflow-wrap: normal');
  expect(pre).toContain('word-break: normal');
  expect(css).toMatch(/\.stimulus-code, \.stimulus-table\s*\{ overflow-x: auto;/);
  expect(css).toMatch(/\.notes-code\s*\{[^}]*overflow-x: auto;[^}]*white-space: pre;/);
});

test('compact print rules use only the wrong note page and content', () => {
  const print = css.slice(css.indexOf('@media print'), css.indexOf('\n.set-filters {', css.indexOf('@media print')));
  expect(print).toContain('@page wrong-note { margin: 12mm; }');
  expect(print).toContain('body:has(.wrong-note-shell) { page: wrong-note;');
  expect(print).toContain('.wrong-note { font-size: 10.5pt;');
  expect(print).toContain('.wrong-note .question-subject { font-size: 9.5pt;');
  expect(print).toContain('.wrong-note .question-title { font-size: 11pt;');
  expect(print).toMatch(/\.wrong-note-question\s*\{ break-inside: auto;/);
  expect(print).toContain('.wrong-note-question-heading, .wrong-note-choices, .wrong-note .stimulus { break-inside: avoid; }');
  expect(print).toMatch(/\.wrong-note-group > h2\s*\{ break-after: avoid;/);
  expect(print).toMatch(/\.wrong-note pre\s*\{[^}]*white-space: pre-wrap;/);
  // Every declaration in the print block is scoped to the note or its named page.
  const selectors = [...print.matchAll(/([^{}]+)\{/g)].map(match => match[1].trim());
  expect(selectors.every(selector => selector === '@media print' || selector.includes('wrong-note'))).toBe(true);
});

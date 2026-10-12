import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MathText } from './MathText';
afterEach(cleanup);
test('only an isolated stimulus formula uses display rendering', () => {
  const { container, rerender } = render(<MathText text={'  $\\frac{1}{2}$  '} display />);
  expect(container.querySelector('.katex-display')).not.toBeNull();
  rerender(<MathText text={'text $\\frac{1}{2}$'} display />);
  expect(container.querySelector('.katex-display')).toBeNull();
  rerender(<MathText text={'$x$ $y$'} display />);
  expect(container.querySelector('.katex-display')).toBeNull();
  rerender(<MathText text={'$\\frac{1}{2}$'} />);
  expect(container.querySelector('.katex-display')).toBeNull();
});
test('a failed display formula preserves the original text', () => {
  const text = '  $\\invalidcommand$  ';
  const { container } = render(<MathText text={text} display />);
  expect(container.textContent).toBe(text);
  expect(container.querySelector('.formula')).toBeNull();
});
test.each(['plain <text>', 'odd $x', '$x$ and $y$', '$한글 − 2$', '$x$'])('renders text and formulas: %s', text => {
  const { container } = render(<MathText text={text} />);
  if (!text.includes('$') || text === 'odd $x') expect(container.textContent).toBe(text);
  else expect(container.querySelectorAll('.katex').length).toBe(text === '$x$ and $y$' ? 2 : 1);
});
test('a failed formula preserves delimiters without breaking the next formula', () => {
  const { container } = render(<MathText text={'before $\\invalidcommand$ after $x$'} />);
  expect(container.textContent).toContain('$\\invalidcommand$');
  expect(container.querySelectorAll('.katex').length).toBe(1);
});

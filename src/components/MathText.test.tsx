import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MathText } from './MathText';
afterEach(cleanup);
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

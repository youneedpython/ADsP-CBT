import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MathText } from './MathText';
afterEach(cleanup);
test('only an isolated stimulus formula uses display rendering', async () => {
  const { container, rerender } = render(<MathText text={'  $\\frac{1}{2}$  '} display />);
  await waitFor(() => expect(container.querySelector('.katex-display')).not.toBeNull());
  rerender(<MathText text={'text $\\frac{1}{2}$'} display />);
  expect(container.querySelector('.katex-display')).toBeNull();
  rerender(<MathText text={'$x$ $y$'} display />);
  expect(container.querySelector('.katex-display')).toBeNull();
  rerender(<MathText text={'$\\frac{1}{2}$'} />);
  expect(container.querySelector('.katex-display')).toBeNull();
});
test('a failed display formula preserves the original text', async () => {
  const text = '  $\\invalidcommand$  ';
  const { container } = render(<MathText text={text} display />);
  await waitFor(() => expect(container.textContent).toBe(text));
  expect(container.querySelector('.formula')).toBeNull();
});
test.each(['plain <text>', 'odd $x', '$x$ and $y$', '$한글 − 2$', '$x$'])('renders text and formulas: %s', async text => {
  const { container } = render(<MathText text={text} />);
  if (!text.includes('$') || text === 'odd $x') expect(container.textContent).toBe(text);
  else await waitFor(() => expect(container.querySelectorAll('.katex').length).toBe(text === '$x$ and $y$' ? 2 : 1));
});
test('a failed formula preserves delimiters without breaking the next formula', async () => {
  const { container } = render(<MathText text={'before $\\invalidcommand$ after $x$'} />);
  await waitFor(() => expect(container.textContent).toContain('$\\invalidcommand$'));
  await waitFor(() => expect(container.querySelectorAll('.katex').length).toBe(1));
});

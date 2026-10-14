import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MathText } from './MathText';
import { loadMath } from './loadMath';
vi.mock('./loadMath', () => ({ loadMath: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
test('plain and unmatched text do not request math', () => {
  const { container, rerender } = render(<MathText text="plain <text>" />);
  expect(container.textContent).toBe('plain <text>');
  rerender(<MathText text="odd $x" />);
  expect(container.textContent).toBe('odd $x');
  expect(loadMath).not.toHaveBeenCalled();
});
test('loading shows bare expression and rejection restores delimiters', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(loadMath).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  const { container } = render(<MathText text="before $x$ after" />);
  expect(container.textContent).toBe('before x after');
  reject(new Error('sample load failure'));
  await waitFor(() => expect(container.textContent).toBe('before $x$ after'));
  expect(container.querySelector('.formula')).toBeNull();
});

import type katex from 'katex';

let pending: Promise<typeof katex> | undefined;
export function loadMath(): Promise<typeof katex> {
  pending ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')])
    .then(([module]) => module.default);
  return pending;
}

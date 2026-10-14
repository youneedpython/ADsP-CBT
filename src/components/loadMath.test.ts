import { expect, test } from 'vitest';
import { loadMath } from './loadMath';
test('concurrent and later calls share the same completed load', async () => {
  const first = loadMath();
  expect(loadMath()).toBe(first);
  const renderer = await first;
  expect(typeof renderer.renderToString).toBe('function');
  expect(loadMath()).toBe(first);
  expect(await loadMath()).toBe(renderer);
});

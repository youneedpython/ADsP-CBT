// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const rules = runInNewContext(`${source}\n({ strategyFor, oldCacheNames })`, { URL });
const worker = 'https://example.test/ADsP-CBT/sw.js';
const request = (path: string, options = {}) => ({ url: new URL(path, worker).href, method: 'GET', headers: new Headers(), ...options });
test('routes only eligible same-origin requests within the worker base', () => {
  for (const path of ['index.html', './']) expect(rules.strategyFor(request(path, { mode: 'navigate' }), worker)).toBe('document');
  expect(rules.strategyFor(request('index.html'), worker)).toBe('document');
  for (const path of ['assets/index-AbCd1234.js', 'assets/page-AbCd1234.css', 'fonts/font.woff2', 'notes/picture.webp', 'icon-192.png', 'favicon.svg', 'data/image.jpg']) expect(rules.strategyFor(request(path), worker)).toBe('cache-first');
  expect(rules.strategyFor(request('data/sqld/62.json'), worker)).toBe('network-first');
  for (const path of ['pdf/round.pdf', 'assets/plain.js', 'manifest.webmanifest', '/outside.png', 'https://other.test/icon.png']) expect(rules.strategyFor(request(path), worker)).toBeNull();
  expect(rules.strategyFor(request('pdf/round.pdf', { mode: 'navigate' }), worker)).toBeNull();
  expect(rules.strategyFor(request('data/50.json', { method: 'POST' }), worker)).toBeNull();
  expect(rules.strategyFor(request('icon-192.png', { headers: new Headers({ Range: 'bytes=0-10' }) }), worker)).toBeNull();
});
test('removes previous app caches while preserving current and unrelated caches', () => {
  expect(Array.from(rules.oldCacheNames(['cbt-v0', 'cbt-v1', 'other-app']))).toEqual(['cbt-v0']);
});
test('offline navigation falls back to index and JSON falls back to its saved response', async () => {
  const shell = { body: 'shell' };
  const json = { body: 'saved questions' };
  const runtime = runInNewContext(`${source}\n({ respond })`, {
    URL, self: { location: { href: worker } },
    fetch: async () => { throw new Error('offline'); },
    caches: { open: async () => ({ match: async (key: string | { url: string }) => {
      const url = typeof key === 'string' ? key : key.url;
      return url.endsWith('index.html') ? shell : url.endsWith('50.json') ? json : undefined;
    } }) },
  });
  expect(await runtime.respond(request('./'), 'document')).toBe(shell);
  expect(await runtime.respond(request('data/50.json'), 'network-first')).toBe(json);
  await expect(runtime.respond(request('data/missing.json'), 'network-first')).rejects.toThrow('offline');
});

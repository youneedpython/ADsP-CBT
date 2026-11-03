import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
const css = readFileSync('src/styles/main.css', 'utf8');

test('explicit dark and system fallback share their palette and print restores light', () => {
  const explicit = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)![1];
  const system = css.match(/:root:not\(\[data-theme\]\) \{([^}]+)\}/)![1];
  expect(explicit.trim()).toBe(system.trim());
  expect(explicit).toContain('color-scheme: dark;');
  expect(css).toContain('@media (prefers-color-scheme: dark)');
  const print = css.slice(css.lastIndexOf('@media print'));
  expect(print).toContain('color-scheme: light;');
  expect(print).toContain('--background: #f4f5f7;');
  expect(print).toContain('--text: #1c2330;');
  expect(css).toContain('--accent: var(--sqld-accent)');
});

test('progress colors resolve without cycles in light, dark and SQLD palettes', () => {
  const light = css.match(/^:root \{([^}]+)\}/)![1];
  const dark = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)![1];
  const system = css.match(/:root:not\(\[data-theme\]\) \{([^}]+)\}/)![1];
  const sqld = css.match(/\.exam-sqld \{([^}]+)\}/)![1];
  for (const [palette, color] of [[light, '#2f54d6'], [dark, '#8aa6ff'], [system, '#8aa6ff']]) {
    expect(palette).toContain(`--progress-color: ${color};`);
  }
  expect(sqld).toContain('--progress-color: var(--sqld-button);');
  expect(light).toContain('--sqld-button: #f2c200;');
  // Resolve every dependency so indirect cycles and missing variables also fail.
  function resolve(name: string, palette: string, path: string[] = []): string {
    expect(path).not.toContain(name);
    const values = new Map([...palette.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2]]));
    const value = values.get(name);
    expect(value).toBeDefined();
    return value!.replace(/var\((--[\w-]+)\)/g, (_, dependency: string) => resolve(dependency, palette, [...path, name]));
  }
  for (const palette of [light, light + dark, light + system]) {
    expect(resolve('--progress-color', palette)).toMatch(/^#[\da-f]{6}$/);
    expect(resolve('--track', palette)).toMatch(/^#[\da-f]{6}$/);
    expect(resolve('--progress-color', palette + sqld)).toBe('#f2c200');
  }
  expect(css).toContain('progress::-webkit-progress-bar { background: var(--track);');
  expect(css).toContain('progress::-webkit-progress-value { background: var(--progress-color);');
  expect(css).toContain('progress::-moz-progress-bar { background: var(--progress-color);');
  expect(css).toContain('.subject-results progress { --progress-color: var(--pass-text);');
  expect(css).toContain('.subject-results .subject-failed progress { --progress-color: var(--fail-text);');
});

test('light screen and print keep the original decorative borders and notes colors', () => {
  for (const palette of [css.match(/^:root \{([^}]+)\}/)![1], css.slice(css.lastIndexOf('@media print'))]) {
    expect(palette).toContain('--border: #e2e5ea;');
    expect(palette).toContain('--stimulus-border: #b9c0cc;');
    expect(palette).toContain('--notes-exam-bg: #effaf3;');
    expect(palette).toContain('--notes-exam-border: #a9d6ba;');
    expect(palette).toContain('--notes-exam-text: #276340;');
  }
});

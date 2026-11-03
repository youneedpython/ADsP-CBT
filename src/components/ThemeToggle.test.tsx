import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.head.querySelector('meta[name="theme-color"]')?.remove();
});

test('toggle exposes its action and pressed state, persists choice and updates browser color', () => {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
  render(<ThemeToggle />);
  const button = screen.getByRole('button', { name: '어두운 화면으로 바꾸기' });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('cbt:v1:theme')).toBe('dark');
  expect(screen.getByRole('button', { name: '밝은 화면으로 바꾸기' }).getAttribute('aria-pressed')).toBe('true');
  expect(meta.content).toBe('#0f141b');
  fireEvent.click(button);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(meta.content).toBe('#2f54d6');
});

test('starts with a saved theme', () => {
  localStorage.setItem('cbt:v1:theme', 'dark');
  render(<ThemeToggle />);
  expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('follows system changes only until a choice is made, even when storage fails', () => {
  const media = new EventTarget() as EventTarget & { matches: boolean };
  media.matches = false;
  vi.stubGlobal('matchMedia', () => media);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable'); });
  const { unmount } = render(<ThemeToggle />);
  const remove = vi.spyOn(media, 'removeEventListener');
  act(() => { media.dispatchEvent(new Event('change')); });
  media.matches = true;
  act(() => { media.dispatchEvent(new Event('change')); });
  expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  fireEvent.click(screen.getByRole('button'));
  expect(document.documentElement.dataset.theme).toBe('light');
  media.matches = false;
  act(() => { media.dispatchEvent(new Event('change')); });
  media.matches = true;
  act(() => { media.dispatchEvent(new Event('change')); });
  expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  unmount();
  expect(remove).toHaveBeenCalled();
});

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const key = 'cbt:v1:theme';
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
}
function systemDark() { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false; }

export function ThemeToggle() {
  const [choice, setChoice] = useState<Theme | null>(storedTheme);
  const [dark, setDark] = useState(systemDark);
  const theme = choice ?? (dark ? 'dark' : 'light');
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    setDark(media.matches);
    const change = () => setDark(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (choice) document.documentElement.dataset.theme = choice;
    else document.documentElement.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f141b' : '#2f54d6');
  }, [choice, theme]);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setChoice(next);
    try { localStorage.setItem(key, next); } catch { /* Keep the choice for this visit. */ }
  }
  return <button type="button" className="theme-toggle" aria-label={theme === 'dark' ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기'} aria-pressed={theme === 'dark'} onClick={toggle}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></> : <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />}
    </svg>
  </button>;
}

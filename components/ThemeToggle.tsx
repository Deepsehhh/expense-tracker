'use client';
import { useEffect, useState } from 'react';
import * as core from '@capacitor/core';

type Theme = 'dark' | 'light';

function applySystemBars(theme: Theme) {
  try {
    // Dark theme -> light status-bar icons; light theme -> dark icons.
    const bars = (core as any).SystemBars;
    bars?.setStyle?.({ style: theme === 'dark' ? 'DARK' : 'LIGHT' });
  } catch {}
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const t = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setTheme(t);
    applySystemBars(t);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('et-theme', next); } catch {}
    setTheme(next);
    applySystemBars(next);
  }

  return (
    <button className="btn small" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}

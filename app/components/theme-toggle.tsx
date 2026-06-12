'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="theme-toggle-icon"
      fill="none"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="theme-toggle-icon"
      fill="none"
    >
      <path d="M20.5 14.5A7.7 7.7 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
    </svg>
  )
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      applyTheme(saved)
      return
    }

    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
    const initialTheme: Theme = prefersLight ? 'light' : 'dark'
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Toggle } from './ui/toggle'

type Theme = 'light' | 'dark'

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

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
  }

  return (
    <Toggle
      className="theme-toggle"
      pressed={theme === 'dark'}
      onPressedChange={(pressed) => updateTheme(pressed ? 'dark' : 'light')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Moon aria-hidden="true" className="theme-toggle-icon" />
      ) : (
        <Sun aria-hidden="true" className="theme-toggle-icon" />
      )}
    </Toggle>
  )
}

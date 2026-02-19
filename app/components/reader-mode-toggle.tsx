'use client'

import { useEffect, useState } from 'react'

type ReaderMode = 'on' | 'off'
type ReaderModeToggleProps = {
  iconOnly?: boolean
}

function applyReaderMode(mode: ReaderMode) {
  document.documentElement.setAttribute('data-reader-mode', mode)
}

export function ReaderModeToggle({ iconOnly = false }: ReaderModeToggleProps) {
  const [mode, setMode] = useState<ReaderMode>('off')

  useEffect(() => {
    const saved = localStorage.getItem('reader-mode') as ReaderMode | null
    const initialMode: ReaderMode = saved === 'on' ? 'on' : 'off'
    setMode(initialMode)
    applyReaderMode(initialMode)
  }, [])

  function toggleReaderMode() {
    const nextMode: ReaderMode = mode === 'off' ? 'on' : 'off'
    setMode(nextMode)
    applyReaderMode(nextMode)
    localStorage.setItem('reader-mode', nextMode)
  }

  return (
    <button
      type="button"
      className={`reader-toggle ${iconOnly ? 'reader-toggle-icon' : ''}`}
      onClick={toggleReaderMode}
      aria-label={mode === 'on' ? 'Disable reader mode' : 'Enable reader mode'}
      aria-pressed={mode === 'on'}
      title={mode === 'on' ? 'Reader mode on' : 'Reader mode off'}
    >
      {iconOnly ? (
        <>
          <span aria-hidden="true">Aa</span>
          <span className="sr-only">
            {mode === 'on' ? 'Reader mode on' : 'Reader mode off'}
          </span>
        </>
      ) : (
        <>{mode === 'on' ? 'reader mode: on' : 'reader mode: off'}</>
      )}
    </button>
  )
}

'use client'

import { usePwa } from '@/lib/pwa-context'
import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const {
    canInstall,
    installApp,
    isIOS,
    isStandalone,
  } = usePwa()

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (canInstall && !isStandalone) {
      const timeout = setTimeout(() => setIsVisible(true), 3000)
      return () => clearTimeout(timeout)
    }
  }, [canInstall, isStandalone])

  if (isStandalone) {
    return null
  }

  if (isIOS && isVisible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-lg z-40">
        <div className="max-w-md mx-auto flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install App</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tap the share icon ⎋ and select "Add to Home Screen" ➕
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (!isIOS && canInstall && isVisible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg z-40">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm mb-1">
              Install App
            </h3>
            <p className="text-blue-100 text-xs">
              Get instant access from your home screen
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setIsVisible(false)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded hover:bg-blue-50 transition-colors"
            >
              Later
            </button>
            <button
              onClick={async () => {
                await installApp()
                setIsVisible(false)
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-800 rounded hover:bg-blue-900 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

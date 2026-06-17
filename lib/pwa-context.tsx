'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaContextType {
  isOnline: boolean
  isStandalone: boolean
  canInstall: boolean
  installPrompt: BeforeInstallPromptEvent | null
  installApp: () => Promise<void>
  updateAvailable: boolean
  installUpdate: () => void
  isIOS: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [isStandalone, setIsStandalone] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream
    )

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  setUpdateAvailable(true)
                }
              })
            }
          })

          setInterval(() => {
            registration.update().catch(() => {})
          }, 60 * 60 * 1000)
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('PWA installed')
      }

      setDeferredPrompt(null)
      setCanInstall(false)
    } catch (error) {
      console.error('Installation failed:', error)
    }
  }

  const installUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })

          const onControllerChange = () => {
            window.location.reload()
            window.removeEventListener('controllerchange', onControllerChange)
          }

          window.addEventListener('controllerchange', onControllerChange)
          setUpdateAvailable(false)
        }
      })
    }
  }

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isStandalone,
        canInstall,
        installPrompt: deferredPrompt,
        installApp,
        updateAvailable,
        installUpdate,
        isIOS,
        deferredPrompt,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return context
}

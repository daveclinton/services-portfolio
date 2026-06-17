'use client'

import { usePwa } from '@/lib/pwa-context'

export function OfflineIndicator() {
  const { isOnline, updateAvailable, installUpdate } = usePwa()

  if (isOnline && !updateAvailable) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-sm font-medium">You're offline</span>
        </div>
      )}

      {updateAvailable && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            A new version is available
          </span>
          <button
            onClick={installUpdate}
            className="text-sm font-semibold hover:underline"
          >
            Update
          </button>
        </div>
      )}
    </div>
  )
}

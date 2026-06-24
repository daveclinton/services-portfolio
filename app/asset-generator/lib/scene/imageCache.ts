import type { AssetFile } from '../editor/types'

const cache = new Map<string, HTMLImageElement>()
const loading = new Map<string, Promise<HTMLImageElement>>()
const listeners = new Set<() => void>()

function notifyListeners() {
  for (const listener of Array.from(listeners)) {
    listener()
  }
}

export function subscribeToImageCache(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getCachedImage(fileId: string, file: AssetFile) {
  const cached = cache.get(fileId)
  if (cached) {
    return cached
  }

  const pending = loading.get(fileId)
  if (pending) {
    return null
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      cache.set(fileId, image)
      loading.delete(fileId)
      notifyListeners()
      resolve(image)
    }
    image.onerror = () => {
      loading.delete(fileId)
      reject(new Error(`Failed to load image ${fileId}`))
    }
    image.src = file.dataURL
  })

  loading.set(fileId, promise)
  return null
}

export function preloadImages(files: Record<string, AssetFile>) {
  for (const [fileId, file] of Object.entries(files)) {
    getCachedImage(fileId, file)
  }
}

export function getReadyImage(fileId: string, file: AssetFile | undefined) {
  if (!file) return null
  return cache.get(fileId) ?? getCachedImage(fileId, file)
}

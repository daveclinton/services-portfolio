/** RAF-throttled handler — same pattern as Excalidraw reactUtils.withBatchedUpdatesThrottled. */
export function throttleRAF<T extends (...args: never[]) => void>(fn: T) {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (lastArgs) fn(...lastArgs)
    })
  }) as T & { flush: () => void; cancel: () => void }

  throttled.flush = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (lastArgs) fn(...lastArgs)
  }

  throttled.cancel = () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
    lastArgs = null
  }

  return throttled
}
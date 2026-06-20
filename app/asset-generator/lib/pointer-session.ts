import { throttleRAF } from './throttle-raf'

export type PointerSession = {
  cleanup: () => void
  flushMoves: () => void
}

/** Window-level pointer session — Excalidraw attaches move/up outside React handlers. */
export function startPointerSession(options: {
  canvas: HTMLCanvasElement
  pointerId: number
  onMove: (event: PointerEvent) => void
  onUp: (event: PointerEvent) => void
  throttleMoves?: boolean
}): PointerSession {
  options.canvas.setPointerCapture(options.pointerId)

  const throttledMove =
    options.throttleMoves === false ? null : throttleRAF(options.onMove)
  const onMoveHandler = throttledMove ?? options.onMove

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== options.pointerId) return
    onMoveHandler(event)
  }

  const finish = (event: PointerEvent) => {
    if (event.pointerId !== options.pointerId) return
    throttledMove?.flush()
    cleanup()
    options.onUp(event)
  }

  const cleanup = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    throttledMove?.cancel()
    if (options.canvas.hasPointerCapture(options.pointerId)) {
      options.canvas.releasePointerCapture(options.pointerId)
    }
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', finish)
  window.addEventListener('pointercancel', finish)

  return {
    cleanup,
    flushMoves: () => {
      throttledMove?.flush()
    },
  }
}
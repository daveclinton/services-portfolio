import { DOUBLE_TAP_POSITION_THRESHOLD, TAP_TWICE_TIMEOUT } from './interaction-constants'

type TapPosition = { x: number; y: number }

let didTapTwice = false
let tappedTwiceTimer = 0
let firstTapPosition: TapPosition | null = null

function resetTapTwice() {
  didTapTwice = false
  firstTapPosition = null
}

function distanceBetween(a: TapPosition, b: TapPosition) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** First call arms the timer; second call within threshold returns true (Excalidraw onTouchStart). */
export function registerTextTap(clientX: number, clientY: number) {
  if (!didTapTwice) {
    didTapTwice = true
    firstTapPosition = { x: clientX, y: clientY }
    clearTimeout(tappedTwiceTimer)
    tappedTwiceTimer = window.setTimeout(resetTapTwice, TAP_TWICE_TIMEOUT)
    return false
  }

  if (!firstTapPosition) {
    resetTapTwice()
    return false
  }

  const isSecondTap =
    distanceBetween(firstTapPosition, { x: clientX, y: clientY }) <= DOUBLE_TAP_POSITION_THRESHOLD

  resetTapTwice()
  clearTimeout(tappedTwiceTimer)
  return isSecondTap
}

export function clearTextTapState() {
  resetTapTwice()
  clearTimeout(tappedTwiceTimer)
}
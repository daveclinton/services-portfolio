import { ROTATION_HANDLE_GAP } from './text-constants'
import type { CanvasRect } from '../utils/geometry'
import { rotatePoint } from './resize-handles'

export function getRotationHandlePosition(rect: CanvasRect, rotation = 0) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const position = {
    x: rect.x + rect.width / 2,
    y: rect.y - ROTATION_HANDLE_GAP,
  }

  if (rotation === 0) return position
  return rotatePoint(position.x, position.y, cx, cy, (rotation * Math.PI) / 180)
}

export function getPointerAngleDegrees(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
) {
  return (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI
}

export function computeRotatedAngle(
  startRotation: number,
  startPointerAngle: number,
  currentPointerAngle: number,
  shiftKey: boolean,
) {
  let angle = startRotation + (currentPointerAngle - startPointerAngle)

  if (shiftKey) {
    angle = Math.round(angle / 15) * 15
  }

  return ((angle % 360) + 360) % 360
}
import { ICON_RADIUS, ICON_SIZE, SAFE_AREA_SIZE } from '../common/constants'
import { renderTransformHandles } from './interactiveScene'
import { renderElement } from './renderElement'
import type { StaticSceneRenderConfig } from './types'

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + clampedRadius, y)
  ctx.lineTo(x + width - clampedRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
  ctx.lineTo(x + width, y + height - clampedRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height)
  ctx.lineTo(x + clampedRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius)
  ctx.lineTo(x, y + clampedRadius)
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y)
  ctx.closePath()
}

function renderGuides(ctx: CanvasRenderingContext2D) {
  const safeMargin = (ICON_SIZE - SAFE_AREA_SIZE) / 2

  roundedRect(ctx, 0, 0, ICON_SIZE, ICON_SIZE, ICON_RADIUS)
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#e9ecef'
  ctx.stroke()

  roundedRect(ctx, safeMargin, safeMargin, SAFE_AREA_SIZE, SAFE_AREA_SIZE, 64)
  ctx.lineWidth = 4
  ctx.setLineDash([2, 14])
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#ced4da'
  ctx.stroke()
  ctx.setLineDash([])
}

function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
) {
  ctx.save()
  ctx.fillStyle = 'rgba(105, 101, 219, 0.08)'
  ctx.strokeStyle = '#6965db'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.fillRect(box.x, box.y, box.width, box.height)
  ctx.strokeRect(box.x, box.y, box.width, box.height)
  ctx.restore()
}

function prepareCanvas(canvas: HTMLCanvasElement) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const pixelSize = Math.round(ICON_SIZE * dpr)

  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize
    canvas.height = pixelSize
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  return ctx
}

export function renderStaticScene({
  canvas,
  elements,
  files,
  backgroundColor,
  selectedElementIds,
  draftElement,
  selectionBox,
  editingElementId = null,
  showGuides,
  safeAreaViolationIds,
}: StaticSceneRenderConfig) {
  const ctx = prepareCanvas(canvas)
  if (!ctx) return

  const selectedCount = Object.keys(selectedElementIds).length

  roundedRect(ctx, 0, 0, ICON_SIZE, ICON_SIZE, ICON_RADIUS)
  ctx.fillStyle = backgroundColor
  ctx.fill()

  for (const element of elements) {
    if (editingElementId && element.id === editingElementId && element.type === 'text') {
      continue
    }

    const isSelected = Boolean(selectedElementIds[element.id])
    const violatesSafeArea = Boolean(safeAreaViolationIds?.[element.id])
    renderElement(element, ctx, isSelected, files)

    if (violatesSafeArea) {
      ctx.save()
      ctx.strokeStyle = '#e03131'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 8])
      ctx.strokeRect(element.x, element.y, element.width, element.height)
      ctx.restore()
    }

    if (isSelected && selectedCount === 1) {
      renderTransformHandles(ctx, element)
    }
  }

  if (draftElement) {
    renderElement(draftElement, ctx, false, files)
  }

  if (selectionBox) {
    renderSelectionBox(ctx, selectionBox)
  }

  if (showGuides) {
    renderGuides(ctx)
  }
}

'use client'

import { useEffect, useRef } from 'react'

const ICON_SIZE = 1024
const SAFE_AREA_SIZE = 820
const ICON_RADIUS = 226

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

function prepareCanvas(canvas: HTMLCanvasElement, dpr: number) {
  const pixelSize = Math.round(ICON_SIZE * dpr)
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize
    canvas.height = pixelSize
  }
}

function drawStaticIcon(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  prepareCanvas(canvas, dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  roundedRect(ctx, 0, 0, ICON_SIZE, ICON_SIZE, ICON_RADIUS)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeStyle = '#e9ecef'
  ctx.stroke()

  const safeMargin = (ICON_SIZE - SAFE_AREA_SIZE) / 2
  roundedRect(ctx, safeMargin, safeMargin, SAFE_AREA_SIZE, SAFE_AREA_SIZE, 64)
  ctx.lineWidth = 4
  ctx.setLineDash([2, 14])
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#495057'
  ctx.stroke()

  ctx.setLineDash([])
  ctx.font = '700 34px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#343a40'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('APP ICON CANVAS', ICON_SIZE / 2, ICON_SIZE / 2)
}

function clearInteractiveCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  prepareCanvas(canvas, dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export function AppIconCanvas() {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const render = () => {
      if (staticCanvasRef.current) {
        drawStaticIcon(staticCanvasRef.current)
      }
      if (interactiveCanvasRef.current) {
        clearInteractiveCanvas(interactiveCanvasRef.current)
      }
    }

    render()
    window.addEventListener('resize', render)
    return () => window.removeEventListener('resize', render)
  }, [])

  return (
    <div className="asset-excalidraw-canvas" aria-label="1024 by 1024 app icon canvas">
      <canvas
        ref={staticCanvasRef}
        className="asset-excalidraw-canvas-layer"
        aria-hidden="true"
        width={ICON_SIZE}
        height={ICON_SIZE}
      />
      <canvas
        ref={interactiveCanvasRef}
        className="asset-excalidraw-canvas-layer asset-excalidraw-canvas-layer--interactive"
        aria-label="Interactive app icon canvas"
        width={ICON_SIZE}
        height={ICON_SIZE}
      />
    </div>
  )
}

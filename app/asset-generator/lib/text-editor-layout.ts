import { getAppIconSafeAreaMargin } from './app-icon-bounds'
import { masterSize } from '../constants'
import { TEXT_SELECTION_PADDING } from './text-constants'
import type { TextLayer } from '../types'
import { getTextFontString, getTextLayerLayout } from '../utils/text'

export type TextEditorOverlayStyle = {
  left: number
  top: number
  width: number
  height: number
  maxHeight: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  opacity: number
  textAlign: TextLayer['textAlign']
  lineHeight: number
}

/** Scene-space editor box captured once at edit start (Excalidraw element x/y/width/height). */
export type TextEditorBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type FrozenTextEditorBounds = TextEditorBounds

/** Full overlay snapshot — position never recomputed from live layout on edit entry. */
export type FrozenTextEditorStyle = TextEditorOverlayStyle & {
  canvasFontSize: number
  canvasBounds: TextEditorBounds
}

export function getTextSelectionBounds(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  size = masterSize,
  options: { frozenFontSize?: number } = {},
) {
  const layout = getTextLayerLayout(ctx, layer, size, {
    forEditor: true,
    frozenFontSize: options.frozenFontSize,
  })
  const scale = size / masterSize
  const padding = TEXT_SELECTION_PADDING * scale

  return {
    x: layout.bounds.x - padding,
    y: layout.bounds.y - padding,
    width: layout.bounds.width + padding * 2,
    height: layout.bounds.height + padding * 2,
    layout,
  }
}

export function getFrozenFontSizeForEditing(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  size = masterSize,
) {
  return getTextLayerLayout(ctx, layer, size).fontSize / (size / masterSize)
}

export function getTextEditorBounds(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  size = masterSize,
  options: { frozenFontSize?: number } = {},
): TextEditorBounds {
  const scale = size / masterSize
  const layout = getTextLayerLayout(ctx, layer, size, {
    frozenFontSize: options.frozenFontSize,
  })
  const boxWidth = layer.maxWidth * scale

  return {
    x: layer.x * scale - boxWidth / 2,
    y: layout.bounds.y,
    width: boxWidth,
    height: layout.bounds.height * 1.05,
  }
}

export function getFrozenTextEditorBounds(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  frozenFontSize?: number,
  size = masterSize,
): FrozenTextEditorBounds {
  return getTextEditorBounds(ctx, layer, size, { frozenFontSize })
}

function getContainerOffsets(canvas: HTMLCanvasElement, container: HTMLElement) {
  const canvasRect = canvas.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const scale = canvasRect.width / masterSize

  return {
    offsetX: canvasRect.left - containerRect.left,
    offsetY: canvasRect.top - containerRect.top,
    scale,
  }
}

/** Capture editor style once — mirrors Excalidraw using stored element box, not live reflow. */
export function captureFrozenTextEditorStyle(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
): FrozenTextEditorStyle {
  const canvasFontSize = getFrozenFontSizeForEditing(ctx, layer)
  const layout = getTextLayerLayout(ctx, layer, masterSize, { frozenFontSize: canvasFontSize })
  const canvasBounds = getTextEditorBounds(ctx, layer, masterSize, { frozenFontSize: canvasFontSize })
  const { offsetX, offsetY, scale } = getContainerOffsets(canvas, container)
  const cssFontSize = canvasFontSize * scale
  const lineHeight = layout.lineHeight / layout.fontSize

  return {
    left: offsetX + canvasBounds.x * scale,
    top: offsetY + canvasBounds.y * scale,
    width: canvasBounds.width * scale,
    height: canvasBounds.height * scale,
    maxHeight: (masterSize - getAppIconSafeAreaMargin(masterSize) - canvasBounds.y) * scale,
    fontSize: cssFontSize,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle === 'italic' ? 'italic' : 'normal',
    color: layer.color,
    opacity: layer.opacity * layer.colorOpacity,
    textAlign: layer.textAlign,
    lineHeight,
    canvasFontSize,
    canvasBounds,
  }
}

export function scaleFrozenTextEditorStyle(
  frozen: FrozenTextEditorStyle,
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  heightOverride?: number,
): TextEditorOverlayStyle {
  const { offsetX, offsetY, scale } = getContainerOffsets(canvas, container)
  const { canvasBounds, canvasFontSize } = frozen
  const height = heightOverride ?? canvasBounds.height

  return {
    left: offsetX + canvasBounds.x * scale,
    top: offsetY + canvasBounds.y * scale,
    width: canvasBounds.width * scale,
    height: height * scale,
    maxHeight: (masterSize - getAppIconSafeAreaMargin(masterSize) - canvasBounds.y) * scale,
    fontSize: canvasFontSize * scale,
    fontFamily: frozen.fontFamily,
    fontWeight: frozen.fontWeight,
    fontStyle: frozen.fontStyle,
    color: frozen.color,
    opacity: frozen.opacity,
    textAlign: frozen.textAlign,
    lineHeight: frozen.lineHeight,
  }
}

export function getTextEditorOverlayStyle(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  layer: TextLayer,
  frozenStyle?: FrozenTextEditorStyle,
  heightOverride?: number,
): TextEditorOverlayStyle {
  if (frozenStyle) {
    return scaleFrozenTextEditorStyle(frozenStyle, canvas, container, heightOverride)
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      maxHeight: 0,
      fontSize: 0,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      fontStyle: 'normal',
      color: layer.color,
      opacity: layer.opacity * layer.colorOpacity,
      textAlign: layer.textAlign,
      lineHeight: 0.92,
    }
  }

  return captureFrozenTextEditorStyle(canvas, container, ctx, layer)
}
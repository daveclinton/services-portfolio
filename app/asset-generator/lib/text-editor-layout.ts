import { masterSize } from '../constants'
import type { TextLayer } from '../types'
import { getTextLayerLayout } from '../utils/text'

export type TextEditorOverlayStyle = {
  left: number
  top: number
  width: number
  minHeight: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  opacity: number
  textAlign: TextLayer['textAlign']
  lineHeight: number
}

export function getTextEditorOverlayStyle(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  layer: TextLayer,
): TextEditorOverlayStyle {
  const canvasRect = canvas.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const scale = canvasRect.width / masterSize
  const ctx = canvas.getContext('2d')
  const layout = ctx ? getTextLayerLayout(ctx, layer, masterSize) : null
  const fontSize = layout?.fontSize ?? layer.maxFontSize * scale
  const lineHeight = layout?.lineHeight ?? fontSize * 0.92

  return {
    left: canvasRect.left - containerRect.left + layer.x * scale,
    top: canvasRect.top - containerRect.top + layer.y * scale,
    width: layer.maxWidth * scale,
    minHeight: lineHeight,
    fontSize,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle === 'italic' ? 'italic' : 'normal',
    color: layer.color,
    opacity: layer.opacity * layer.colorOpacity,
    textAlign: layer.textAlign,
    lineHeight: lineHeight / fontSize,
  }
}
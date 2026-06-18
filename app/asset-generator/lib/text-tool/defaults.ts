import type { TextObject } from './types'

export const TEXT_TOOL_DEFAULTS = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 400,
  color: '#000000',
  textAlign: 'left' as const,
  lineHeight: 1.2,
  letterSpacing: 0,
  textTransform: 'none' as const,
  decoration: 'none' as const,
}

let nextTextId = 1

export function resetTextIdCounter() {
  nextTextId = 1
}

export function createTextId() {
  const id = `text-${nextTextId}`
  nextTextId += 1
  return id
}

export function createDefaultTextObject(point: { x: number; y: number }, width: number | null = null): TextObject {
  return {
    id: createTextId(),
    text: '',
    x: point.x,
    y: point.y,
    width,
    height: width === null ? null : 48,
    fontFamily: TEXT_TOOL_DEFAULTS.fontFamily,
    fontSize: TEXT_TOOL_DEFAULTS.fontSize,
    fontWeight: TEXT_TOOL_DEFAULTS.fontWeight,
    fontStyle: 'normal',
    color: TEXT_TOOL_DEFAULTS.color,
    textAlign: TEXT_TOOL_DEFAULTS.textAlign,
    lineHeight: TEXT_TOOL_DEFAULTS.lineHeight,
    letterSpacing: TEXT_TOOL_DEFAULTS.letterSpacing,
    textTransform: TEXT_TOOL_DEFAULTS.textTransform,
    decoration: TEXT_TOOL_DEFAULTS.decoration,
    bold: false,
    italic: false,
    underline: false,
  }
}
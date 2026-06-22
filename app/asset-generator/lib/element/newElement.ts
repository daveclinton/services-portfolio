import { DEFAULT_ELEMENT_PROPS, DEFAULT_FONT_SIZE } from '../common/defaults'
import { randomId, randomSeed } from '../common/random'
import type { AssetElement, AssetElementType, ToolType } from './types'

export function toolToElementType(tool: ToolType): AssetElementType | null {
  if (tool === 'selection') return null
  return tool
}

export function normalizeRect(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number,
) {
  const x = Math.min(originX, currentX)
  const y = Math.min(originY, currentY)
  const width = Math.abs(currentX - originX)
  const height = Math.abs(currentY - originY)

  return { x, y, width, height }
}

type NewElementOpts = {
  x: number
  y: number
  strokeColor?: string
  backgroundColor?: string
  strokeWidth?: number
  opacity?: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  fileId?: string
}

// Step 3 (PR #207): single factory, same shape as Excalidraw's first newElement().
export function newElement(
  type: AssetElementType,
  {
    x,
    y,
    strokeColor = DEFAULT_ELEMENT_PROPS.strokeColor,
    backgroundColor = DEFAULT_ELEMENT_PROPS.backgroundColor,
    strokeWidth = DEFAULT_ELEMENT_PROPS.strokeWidth,
    opacity = DEFAULT_ELEMENT_PROPS.opacity,
    width = 0,
    height = 0,
    text,
    fontSize,
    fileId,
  }: NewElementOpts,
): AssetElement {
  return {
    id: randomId(),
    type,
    x,
    y,
    width,
    height,
    strokeColor,
    backgroundColor,
    strokeWidth,
    opacity,
    version: 1,
    seed: randomSeed(),
    text: type === 'text' ? text ?? 'Label' : undefined,
    fontSize: type === 'text' ? fontSize ?? DEFAULT_FONT_SIZE : undefined,
    fileId: type === 'image' ? fileId : undefined,
  }
}

export function newRectangleElement(opts: NewElementOpts) {
  return newElement('rectangle', opts)
}

export function newEllipseElement(opts: NewElementOpts) {
  return newElement('ellipse', opts)
}

export function newDiamondElement(opts: NewElementOpts) {
  return newElement('diamond', opts)
}

export function newTextElement(opts: NewElementOpts) {
  return newElement('text', opts)
}

export function newImageElement(
  opts: Pick<NewElementOpts, 'x' | 'y' | 'width' | 'height' | 'fileId'> & Partial<NewElementOpts>,
) {
  if (!opts.fileId) {
    throw new Error('Image elements require a fileId')
  }

  return newElement('image', {
    x: opts.x,
    y: opts.y,
    width: opts.width ?? 240,
    height: opts.height ?? 240,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    strokeWidth: 0,
    fileId: opts.fileId,
    opacity: opts.opacity,
  })
}

export function newElementForTool(tool: ToolType, opts: NewElementOpts): AssetElement | null {
  const type = toolToElementType(tool)
  if (!type) return null

  switch (type) {
    case 'rectangle':
      return newRectangleElement(opts)
    case 'ellipse':
      return newEllipseElement(opts)
    case 'diamond':
      return newDiamondElement(opts)
    case 'text':
      return newTextElement(opts)
    default:
      return null
  }
}
export type ToolType = 'selection' | 'rectangle' | 'ellipse' | 'diamond' | 'text'

export type AssetElementType = 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'image'

export type AssetElement = {
  id: string
  type: AssetElementType
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  backgroundColor: string
  strokeWidth: number
  opacity: number
  version: number
  seed: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fontStyle?: string
  fileId?: string
}

export type ElementsMap = Record<AssetElement['id'], AssetElement>

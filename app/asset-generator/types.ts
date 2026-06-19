export type PngAssetDefinition = {
  name: string
  imageSize: { width: number; height: number }
  dpi: number
  format: 'png'
}

export type FontKey = 'sans' | 'rounded' | 'display' | 'mono'
export type FontWeight = '700' | '800' | '900'
export type TextSizeKey = 'sm' | 'md' | 'lg' | 'xl'
export type TextAlign = 'left' | 'center' | 'right'
export type TextVerticalAlign = 'top' | 'middle' | 'bottom'

export type BackgroundLayer = {
  id: 'background'
  type: 'background'
  color: string
  opacity: number
}

export type TextLayer = {
  id: 'text'
  type: 'text'
  text: string
  color: string
  colorOpacity: number
  fontFamily: string
  fontKey: FontKey
  fontWeight: FontWeight
  fontStyle: 'normal' | 'italic'
  underline: boolean
  textAlign: TextAlign
  verticalAlign: TextVerticalAlign
  textSize: TextSizeKey
  opacity: number
  x: number
  y: number
  maxWidth: number
  maxFontSize: number
}

export type FrameLayer = {
  id: `frame-${string}`
  type: 'frame'
  name: string | null
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  backgroundColor: string
  opacity: number
}

export type ShapeType = 'rectangle' | 'diamond' | 'ellipse'
export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted'
export type ShapeFillStyle = 'solid'

export type ShapeCornerRadius =
  | number
  | {
      topLeft: number
      topRight: number
      bottomRight: number
      bottomLeft: number
    }

export type ShapeLayer = {
  id: `shape-${string}`
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  backgroundColor: string
  strokeWidth: number
  strokeStyle: ShapeStrokeStyle
  fillStyle: ShapeFillStyle
  opacity: number
  roughness: number
  cornerRadius: ShapeCornerRadius
  rotation: number
}

export type DesignLayer = BackgroundLayer | TextLayer | FrameLayer | ShapeLayer

export type IconDesign = {
  layers: DesignLayer[]
}

export type AssetDocument = {
  version: 1
  icon: IconDesign
  preview: {
    splashBackgroundColor: string
    splashBackgroundOpacity: number
  }
}

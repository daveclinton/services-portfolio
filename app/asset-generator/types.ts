export type AssetDefinition = {
  name: string
  imageSize: { width: number; height: number }
  dpi: number
  format: 'png'
}

export type FontKey = 'sans' | 'rounded' | 'display' | 'mono'
export type FontWeight = '700' | '800' | '900'

export type BackgroundLayer = {
  id: 'background'
  type: 'background'
  color: string
}

export type TextLayer = {
  id: 'text'
  type: 'text'
  text: string
  color: string
  fontFamily: string
  fontKey: FontKey
  fontWeight: FontWeight
  x: number
  y: number
  maxWidth: number
  maxFontSize: number
}

export type DesignLayer = BackgroundLayer | TextLayer

export type IconDesign = {
  layers: DesignLayer[]
}

export type AssetFontFamily = 'hand-drawn' | 'normal' | 'code'
export type AssetFontStyle = 'regular' | 'bold' | 'italic' | 'bold-italic'

export type AssetFontOption = {
  id: AssetFontFamily
  label: string
  css: string
}

export type AssetFontStyleOption = {
  id: AssetFontStyle
  label: string
  fontStyle: 'normal' | 'italic'
  fontWeight: 400 | 700
}

export const ASSET_FONT_OPTIONS: AssetFontOption[] = [
  {
    id: 'hand-drawn',
    label: 'Hand-drawn',
    css: "'STIX Two Text', Georgia, serif",
  },
  {
    id: 'normal',
    label: 'Normal',
    css: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'code',
    label: 'Code',
    css: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },
]

export const DEFAULT_FONT_FAMILY: AssetFontFamily = 'normal'
export const DEFAULT_FONT_STYLE: AssetFontStyle = 'bold'

export const ASSET_FONT_STYLE_OPTIONS: AssetFontStyleOption[] = [
  {
    id: 'regular',
    label: 'Regular',
    fontStyle: 'normal',
    fontWeight: 400,
  },
  {
    id: 'bold',
    label: 'Bold',
    fontStyle: 'normal',
    fontWeight: 700,
  },
  {
    id: 'italic',
    label: 'Italic',
    fontStyle: 'italic',
    fontWeight: 400,
  },
  {
    id: 'bold-italic',
    label: 'Bold italic',
    fontStyle: 'italic',
    fontWeight: 700,
  },
]

export function getAssetFontOption(fontFamily?: string) {
  return (
    ASSET_FONT_OPTIONS.find((option) => option.id === fontFamily) ??
    ASSET_FONT_OPTIONS.find((option) => option.id === DEFAULT_FONT_FAMILY)!
  )
}

export function getAssetFontStyleOption(fontStyle?: string) {
  return (
    ASSET_FONT_STYLE_OPTIONS.find((option) => option.id === fontStyle) ??
    ASSET_FONT_STYLE_OPTIONS.find((option) => option.id === DEFAULT_FONT_STYLE)!
  )
}

export function getCanvasFont({
  fontFamily,
  fontSize,
  fontStyle,
}: {
  fontFamily?: string
  fontSize: number
  fontStyle?: string
}) {
  const family = getAssetFontOption(fontFamily).css
  const style = getAssetFontStyleOption(fontStyle)
  const italicPrefix = style.fontStyle === 'italic' ? 'italic ' : ''

  return `${italicPrefix}${style.fontWeight} ${fontSize}px ${family}`
}

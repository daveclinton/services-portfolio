import type { AssetElement } from './types'

export const MAX_CUSTOM_COLORS_USED_IN_CANVAS = 5
export const DEFAULT_ELEMENT_STROKE_COLOR_INDEX = 4
export const DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = 1

export const COLOR_PALETTE = {
  transparent: 'transparent',
  black: '#1e1e1e',
  white: '#ffffff',
  gray: ['#f8f9fa', '#e9ecef', '#ced4da', '#868e96', '#343a40'],
  red: ['#fff5f5', '#ffc9c9', '#ff8787', '#fa5252', '#e03131'],
  pink: ['#fff0f6', '#fcc2d7', '#f783ac', '#e64980', '#c2255c'],
  grape: ['#f8f0fc', '#eebefa', '#da77f2', '#be4bdb', '#9c36b5'],
  violet: ['#f3f0ff', '#d0bfff', '#9775fa', '#7950f2', '#6741d9'],
  blue: ['#e7f5ff', '#a5d8ff', '#4dabf7', '#228be6', '#1971c2'],
  cyan: ['#e3fafc', '#99e9f2', '#3bc9db', '#15aabf', '#0c8599'],
  teal: ['#e6fcf5', '#96f2d7', '#38d9a9', '#12b886', '#099268'],
  green: ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2f9e44'],
  yellow: ['#fff9db', '#ffec99', '#ffd43b', '#fab005', '#f08c00'],
  orange: ['#fff4e6', '#ffd8a8', '#ffa94d', '#fd7e14', '#e8590c'],
  bronze: ['#f8f1ee', '#eaddd7', '#d2bab0', '#a18072', '#846358'],
} as const

const COMMON_ELEMENT_SHADES = {
  cyan: COLOR_PALETTE.cyan,
  blue: COLOR_PALETTE.blue,
  violet: COLOR_PALETTE.violet,
  grape: COLOR_PALETTE.grape,
  pink: COLOR_PALETTE.pink,
  green: COLOR_PALETTE.green,
  teal: COLOR_PALETTE.teal,
  yellow: COLOR_PALETTE.yellow,
  orange: COLOR_PALETTE.orange,
  red: COLOR_PALETTE.red,
} as const

export const DEFAULT_ELEMENT_STROKE_PICKS = [
  COLOR_PALETTE.black,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
] as const

export const DEFAULT_ELEMENT_BACKGROUND_PICKS = [
  COLOR_PALETTE.transparent,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
] as const

export const DEFAULT_CANVAS_BACKGROUND_PICKS = [
  '#67CA16',
  '#0C287B',
  '#F5BF0F',
  '#D3045D',
  '#CDBAB0',
] as const

export const DEFAULT_COLOR_PALETTE = {
  transparent: COLOR_PALETTE.transparent,
  white: COLOR_PALETTE.white,
  gray: COLOR_PALETTE.gray,
  black: COLOR_PALETTE.black,
  bronze: COLOR_PALETTE.bronze,
  ...COMMON_ELEMENT_SHADES,
} as const

export type AssetColorPickerType = 'canvasBackground' | 'elementBackground' | 'elementStroke'
export type AssetColorPalette = typeof DEFAULT_COLOR_PALETTE
export type AssetColorName = keyof AssetColorPalette

export function getDefaultTopPicks(type: AssetColorPickerType) {
  if (type === 'elementStroke') {
    return DEFAULT_ELEMENT_STROKE_PICKS
  }

  if (type === 'elementBackground') {
    return DEFAULT_ELEMENT_BACKGROUND_PICKS
  }

  return DEFAULT_CANVAS_BACKGROUND_PICKS
}

export function getColorNameAndShadeFromColor({
  palette = DEFAULT_COLOR_PALETTE,
  color,
}: {
  palette?: AssetColorPalette
  color: string | null
}): { colorName: AssetColorName; shade: number | null } | null {
  if (!color) {
    return null
  }

  for (const [colorName, colorValue] of Object.entries(palette)) {
    if (Array.isArray(colorValue)) {
      const shade = colorValue.indexOf(color)
      if (shade > -1) {
        return { colorName: colorName as AssetColorName, shade }
      }
    } else if (colorValue === color) {
      return { colorName: colorName as AssetColorName, shade: null }
    }
  }

  return null
}

export function isCustomColor({
  palette = DEFAULT_COLOR_PALETTE,
  color,
}: {
  palette?: AssetColorPalette
  color: string
}) {
  const paletteValues = Object.values(palette).flat() as readonly string[]
  return !paletteValues.includes(color)
}

export function getMostUsedCustomColors(
  elements: readonly AssetElement[],
  type: Exclude<AssetColorPickerType, 'canvasBackground'>,
  palette = DEFAULT_COLOR_PALETTE,
) {
  const colorProperty = type === 'elementBackground' ? 'backgroundColor' : 'strokeColor'
  const colorCountMap = new Map<string, number>()

  elements.forEach((element) => {
    const color = element[colorProperty]
    if (!isCustomColor({ color, palette })) {
      return
    }

    colorCountMap.set(color, (colorCountMap.get(color) ?? 0) + 1)
  })

  return Array.from(colorCountMap.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([color]) => color)
    .slice(0, MAX_CUSTOM_COLORS_USED_IN_CANVAS)
}

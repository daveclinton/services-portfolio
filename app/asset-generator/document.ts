import { defaults, masterSize, textSizeOptions } from './constants'
import type { AssetDocument, TextSizeKey } from './types'
import { getFontFamily } from './utils/'

export function parseOpacityPercent(value: string, fallback: string) {
  const parsed = Number.parseInt(value, 10)
  const fallbackValue = Number.parseInt(fallback, 10)
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : fallbackValue))
}

export function getTextSizeOption(textSize: TextSizeKey) {
  return textSizeOptions.find((option) => option.key === textSize) ?? textSizeOptions[1]
}

export function getDefaultAssetDocument(): AssetDocument {
  const textSize = defaults.textSize
  const textSizeOption = getTextSizeOption(textSize)

  return {
    version: 1,
    icon: {
      layers: [
        {
          id: 'background',
          type: 'background',
          color: defaults.backgroundColor,
          opacity: parseOpacityPercent(defaults.backgroundOpacity, '100') / 100,
        },
        {
          id: 'text',
          type: 'text',
          text: defaults.text,
          color: defaults.textColor,
          colorOpacity: parseOpacityPercent(defaults.textColorOpacity, '100') / 100,
          fontFamily: getFontFamily(defaults.font),
          fontKey: defaults.font,
          fontWeight: defaults.fontWeight,
          fontStyle: 'normal',
          underline: false,
          textAlign: defaults.textAlign,
          verticalAlign: defaults.textVerticalAlign,
          textSize,
          opacity: parseOpacityPercent(defaults.textOpacity, '100') / 100,
          x: masterSize / 2,
          y: masterSize / 2,
          maxWidth: masterSize * 0.72,
          maxFontSize: textSizeOption.maxFontSize,
        },
      ],
    },
    preview: {
      splashBackgroundColor: defaults.splashBackgroundColor,
      splashBackgroundOpacity: parseOpacityPercent(defaults.splashBackgroundOpacity, '100') / 100,
    },
  }
}
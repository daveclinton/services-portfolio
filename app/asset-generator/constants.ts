import type { FontKey, TextAlign, TextSizeKey, TextVerticalAlign } from './types'

/** Full app icon canvas (iOS App Store / design master). */
export const masterSize = 1024

/**
 * Cross-platform safe area for logos, text, and key graphics.
 * iOS: 820×820 px centered in 1024×1024 (~100 px padding per side).
 * Android adaptive (432 px export): 264×264 safe zone, 72 px margin — same ratio.
 */
export const APP_ICON_SAFE_AREA_SIZE = 820
export const APP_ICON_SAFE_AREA_MARGIN = (masterSize - APP_ICON_SAFE_AREA_SIZE) / 2

/** Android adaptive icon reference (108 dp canvas, 66 dp safe zone). */
export const ANDROID_ICON_CANVAS_DP = 108
export const ANDROID_ICON_SAFE_ZONE_DP = 66
export const ANDROID_ICON_SAFE_MARGIN_DP = 18

/** Android @4× export reference. */
export const ANDROID_ICON_EXPORT_SIZE = 432
export const ANDROID_ICON_SAFE_ZONE_PX = 264
export const ANDROID_ICON_SAFE_MARGIN_PX = 72

export const defaults = {
  text: 'David',
  backgroundColor: '#101114',
  backgroundOpacity: '100',
  textColor: '#f8fafc',
  textColorOpacity: '100',
  splashBackgroundColor: '#ffffff',
  splashBackgroundOpacity: '100',
  font: 'sans' as FontKey,
  fontWeight: '800' as const,
  textSize: 'md' as TextSizeKey,
  textAlign: 'center' as TextAlign,
  textVerticalAlign: 'middle' as TextVerticalAlign,
  textOpacity: '100',
}

export const fontOptions: Array<{ key: FontKey; label: string; family: string }> = [
  { key: 'sans', label: 'Sans', family: 'Inter, system-ui, sans-serif' },
  {
    key: 'rounded',
    label: 'Rounded',
    family: '"Arial Rounded MT Bold", Nunito, Inter, system-ui, sans-serif',
  },
  { key: 'display', label: 'Display', family: '"Arial Black", Impact, Inter, system-ui, sans-serif' },
  { key: 'mono', label: 'Mono', family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
]

export const textSizeOptions: Array<{ key: TextSizeKey; label: string; maxFontSize: number }> = [
  { key: 'sm', label: 'S', maxFontSize: 156 },
  { key: 'md', label: 'M', maxFontSize: 225 },
  { key: 'lg', label: 'L', maxFontSize: 288 },
  { key: 'xl', label: 'XL', maxFontSize: 348 },
]
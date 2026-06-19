import type { FontKey, TextAlign, TextSizeKey, TextVerticalAlign } from './types'

export const masterSize = 1024

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
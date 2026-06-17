import type { AssetDefinition, FontKey, TextAlign, TextSizeKey, TextVerticalAlign } from './types'

export const masterSize = 1024
export const platforms = ['ios', 'android'] as const
export const tools = ['select', 'hand', 'rectangle', 'diamond', 'ellipse', 'frame', 'text'] as const
export const previewStates = ['open', 'closed'] as const
export const fontKeys = ['sans', 'rounded', 'display', 'mono'] as const
export const fontWeights = ['700', '800', '900'] as const
export const textSizeKeys = ['sm', 'md', 'lg', 'xl'] as const
export const textAlignments = ['left', 'center', 'right'] as const
export const textVerticalAlignments = ['top', 'middle', 'bottom'] as const

export const defaults = {
  text: 'David',
  backgroundColor: '#101114',
  backgroundOpacity: '100',
  textColor: '#f8fafc',
  textColorOpacity: '100',
  splashBackgroundColor: '#ffffff',
  splashBackgroundOpacity: '100',
  font: 'sans',
  fontWeight: '800',
  textSize: 'md',
  textAlign: 'center',
  textVerticalAlign: 'middle',
  textOpacity: '100',
  platform: 'ios',
  tool: 'select',
  preview: 'closed',
} as const

export const textSizeOptions: Array<{ key: TextSizeKey; label: string; maxFontSize: number }> = [
  { key: 'sm', label: 'S', maxFontSize: 156 },
  { key: 'md', label: 'M', maxFontSize: 225 },
  { key: 'lg', label: 'L', maxFontSize: 288 },
  { key: 'xl', label: 'XL', maxFontSize: 348 },
]

export const textAlignOptions: Array<{ key: TextAlign; label: string }> = [
  { key: 'left', label: 'Left' },
  { key: 'center', label: 'Center' },
  { key: 'right', label: 'Right' },
]

export const textVerticalAlignOptions: Array<{ key: TextVerticalAlign; label: string }> = [
  { key: 'top', label: 'Top' },
  { key: 'middle', label: 'Middle' },
  { key: 'bottom', label: 'Bottom' },
]

export const fontOptions: Array<{ key: FontKey; label: string; family: string }> = [
  {
    key: 'sans',
    label: 'Sans',
    family: 'Inter, system-ui, sans-serif',
  },
  {
    key: 'rounded',
    label: 'Rounded',
    family: '"Arial Rounded MT Bold", Nunito, Inter, system-ui, sans-serif',
  },
  {
    key: 'display',
    label: 'Display',
    family: '"Arial Black", Impact, Inter, system-ui, sans-serif',
  },
  {
    key: 'mono',
    label: 'Mono',
    family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
]

export const colorSwatches = [
  '#7f56d9',
  '#12b76a',
  '#0ea5e9',
  '#2563eb',
  '#4f46e5',
  '#9333ea',
  '#c026d3',
  '#e11d48',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#101114',
  '#f8fafc',
] as const

export const assets: AssetDefinition[] = [
  { name: 'logo-glow.png', imageSize: { width: 604, height: 604 }, dpi: 216, format: 'png' },
  { name: 'icon.png', imageSize: { width: 1024, height: 1024 }, dpi: 72, format: 'png' },
  { name: 'favicon.png', imageSize: { width: 48, height: 48 }, dpi: 108, format: 'png' },
  { name: 'splash-icon.png', imageSize: { width: 228, height: 213 }, dpi: 216, format: 'png' },
  {
    name: 'android-icon-background.png',
    imageSize: { width: 512, height: 512 },
    dpi: 72,
    format: 'png',
  },
  {
    name: 'android-icon-foreground.png',
    imageSize: { width: 512, height: 512 },
    dpi: 72,
    format: 'png',
  },
  {
    name: 'android-icon-monochrome.png',
    imageSize: { width: 432, height: 432 },
    dpi: 288,
    format: 'png',
  },
]

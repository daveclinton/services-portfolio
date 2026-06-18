export type ColorPaletteEntry = string | readonly string[]

export const COLOR_PALETTE = {
  transparent: 'transparent',
  white: '#ffffff',
  gray: ['#f8f9fa', '#e9ecef', '#ced4da', '#868e96', '#343a40'] as const,
  black: '#1e1e1e',
  bronze: ['#fdf8f6', '#f8ede8', '#eaddd7', '#d2bab0', '#a18072'] as const,
  cyan: ['#e3fafc', '#c5f6fa', '#99e9f2', '#3bc9db', '#1098ad'] as const,
  blue: ['#e7f5ff', '#d0ebff', '#74c0fc', '#339af0', '#1c7ed6'] as const,
  violet: ['#f3f0ff', '#e5dbff', '#b197fc', '#845ef7', '#5f3dc4'] as const,
  grape: ['#f8f0fc', '#eebefa', '#da77f2', '#be4bdb', '#9c36b5'] as const,
  pink: ['#fff0f6', '#fcc2d7', '#f783ac', '#e64980', '#c2255c'] as const,
  green: ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2b8a3e'] as const,
  teal: ['#e6fcf5', '#c3fae8', '#63e6be', '#20c997', '#0ca678'] as const,
  yellow: ['#fff9db', '#ffec99', '#ffd43b', '#fab005', '#f08c00'] as const,
  orange: ['#fff4e6', '#ffe8cc', '#ffc078', '#ff922b', '#e8590c'] as const,
  red: ['#fff5f5', '#ffc9c9', '#ff6b6b', '#f03e3e', '#c92a2a'] as const,
} as const

export type PaletteColorName = keyof typeof COLOR_PALETTE

export const STROKE_TOP_PICKS = [
  COLOR_PALETTE.black,
  COLOR_PALETTE.red[3],
  COLOR_PALETTE.green[3],
  COLOR_PALETTE.blue[3],
  COLOR_PALETTE.yellow[3],
] as const

export const BACKGROUND_TOP_PICKS = [
  COLOR_PALETTE.transparent,
  COLOR_PALETTE.red[1],
  COLOR_PALETTE.green[1],
  COLOR_PALETTE.blue[1],
  COLOR_PALETTE.yellow[1],
] as const

export const TEXT_TOP_PICKS = [
  COLOR_PALETTE.white,
  COLOR_PALETTE.black,
  COLOR_PALETTE.blue[3],
  COLOR_PALETTE.red[3],
  COLOR_PALETTE.yellow[3],
] as const

export const PALETTE_GRID_ORDER: PaletteColorName[] = [
  'transparent',
  'white',
  'gray',
  'black',
  'bronze',
  'cyan',
  'blue',
  'violet',
  'grape',
  'pink',
  'green',
  'teal',
  'yellow',
  'orange',
  'red',
]

const RECENT_COLORS_KEY = 'asset-generator-recent-colors'
const MAX_RECENT = 5

export function getPaletteColor(name: PaletteColorName, shade = 2): string {
  const entry = COLOR_PALETTE[name]
  if (typeof entry === 'string') return entry
  return entry[Math.min(Math.max(shade, 0), entry.length - 1)]
}

export function getColorNameAndShade(color: string): { name: PaletteColorName; shade: number } | null {
  const normalized = color.toLowerCase()
  for (const name of PALETTE_GRID_ORDER) {
    const entry = COLOR_PALETTE[name]
    if (typeof entry === 'string') {
      if (entry.toLowerCase() === normalized) return { name, shade: 0 }
      continue
    }
    const shade = entry.findIndex((value) => value.toLowerCase() === normalized)
    if (shade >= 0) return { name, shade }
  }
  return null
}

export function getShadesForColor(color: string): readonly string[] | null {
  const match = getColorNameAndShade(color)
  if (!match) return null
  const entry = COLOR_PALETTE[match.name]
  return Array.isArray(entry) ? entry : null
}

export function readRecentColors(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(RECENT_COLORS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

export function pushRecentColor(color: string) {
  if (typeof window === 'undefined' || !color || color === 'transparent') return
  const recent = readRecentColors().filter((value) => value.toLowerCase() !== color.toLowerCase())
  recent.unshift(color)
  window.sessionStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

export function getTopPicksForTarget(target: 'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash') {
  if (target === 'bg' || target === 'splash') return BACKGROUND_TOP_PICKS
  if (target === 'fg') return TEXT_TOP_PICKS
  return STROKE_TOP_PICKS
}
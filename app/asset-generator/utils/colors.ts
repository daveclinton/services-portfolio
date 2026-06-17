export function getValidColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

export function normalizeHexColor(value: string, fallback: string) {
  const stripped = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  if (stripped.length === 6) {
    return `#${stripped}`.toLowerCase()
  }
  return fallback
}

export function getColorWithOpacity(value: string, opacity: number, fallback = '#000000') {
  const color = getValidColor(value, fallback)
  const alpha = Math.min(1, Math.max(0, opacity))
  const hex = color.slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

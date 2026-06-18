/**
 * Approximate word-wrap for fixed-width text boxes (canvas-independent).
 * Uses a simple character-width estimate for testability.
 */
export function estimateCharWidth(fontSize: number) {
  return fontSize * 0.55
}

export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  if (maxWidth <= 0) return [text]

  const charWidth = estimateCharWidth(fontSize)
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth))
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return ['']

  const lines: string[] = []
  let current = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`
    if (candidate.length <= maxCharsPerLine) {
      current = candidate
    } else {
      lines.push(current)
      current = words[index]
    }
  }

  lines.push(current)
  return lines
}

export function getDisplayLines(textObject: { text: string; width: number | null; fontSize: number }): string[] {
  if (textObject.width === null) {
    return textObject.text.split('\n')
  }

  const paragraphs = textObject.text.split('\n')
  return paragraphs.flatMap((paragraph) => wrapText(paragraph, textObject.width!, textObject.fontSize))
}
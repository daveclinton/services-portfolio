export type TocHeading = {
  id: string
  title: string
  level: number
}

export function slugifyHeading(input: string) {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

function cleanHeadingTitle(raw: string) {
  return raw
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
}

export function extractHeadingsFromMdx(source: string): TocHeading[] {
  const lines = source.split('\n')
  const headings: TocHeading[] = []
  let inFence = false

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence
      continue
    }

    if (inFence) {
      continue
    }

    const match = line.match(/^(#{2,4})\s+(.+?)\s*#*$/)
    if (!match) {
      continue
    }

    const level = match[1].length
    const title = cleanHeadingTitle(match[2])
    if (!title) {
      continue
    }

    headings.push({
      id: slugifyHeading(title),
      title,
      level,
    })
  }

  return headings
}


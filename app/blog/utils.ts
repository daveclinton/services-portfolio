import fs from 'fs'
import path from 'path'

type Metadata = {
  relatedPosts?: string[]
  tags?: string[]
  recommendedReads?: {
    title: string
    url: string
    source?: string
    note?: string
  }[]
  title: string
  publishedAt: string
  summary: string
  published?: boolean
  image?: string
  audioSrc?: string
  audioDuration?: string
  transcriptUrl?: string
  originalUrl?: string
  originalPlatform?: string
  substackUrl?: string
}

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  let match = frontmatterRegex.exec(fileContent)
  let frontMatterBlock = match![1]
  let content = fileContent.replace(frontmatterRegex, '').trim()
  let frontMatterLines = frontMatterBlock.trim().split('\n')
  let metadata: Partial<Metadata> = {}

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(': ')
    let value = valueArr.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes
    const normalizedKey = key.trim()
    const metadataMap = metadata as Record<string, unknown>
    if (value === 'true') {
      metadataMap[normalizedKey] = true
      return
    }
    if (value === 'false') {
      metadataMap[normalizedKey] = false
      return
    }
    if (
      ['recommendedReads', 'relatedPosts', 'tags'].includes(normalizedKey) &&
      value.startsWith('[') &&
      value.endsWith(']')
    ) {
      try {
        metadataMap[normalizedKey] = JSON.parse(value)
        return
      } catch {
        metadataMap[normalizedKey] = []
        return
      }
    }
    metadataMap[normalizedKey] = value
  })

  return { metadata: metadata as Metadata, content }
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath) {
  let rawContent = fs.readFileSync(filePath, 'utf-8')
  return parseFrontmatter(rawContent)
}

function getMDXData(dir) {
  let mdxFiles = getMDXFiles(dir)
  return mdxFiles.map((file) => {
    let { metadata, content } = readMDXFile(path.join(dir, file))
    let slug = path.basename(file, path.extname(file))

    return {
      metadata,
      slug,
      content,
    }
  })
}

export function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'))
}

export function getPublishedBlogPosts() {
  return getBlogPosts().filter((post) => post.metadata.published === true)
}

export type BlogPost = ReturnType<typeof getBlogPosts>[number]

export function formatDate(date: string, includeRelative = false) {
  let currentDate = new Date()
  if (!date.includes('T')) {
    date = `${date}T00:00:00`
  }
  let targetDate = new Date(date)

  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear()
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth()
  let daysAgo = currentDate.getDate() - targetDate.getDate()

  let formattedDate = ''

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`
  } else {
    formattedDate = 'Today'
  }

  let fullDate = targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!includeRelative) {
    return fullDate
  }

  return `${fullDate} (${formattedDate})`
}

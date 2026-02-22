import fs from 'node:fs'
import path from 'node:path'

const postsDir = path.join(process.cwd(), 'app', 'blog', 'posts')
const required = ['title', 'publishedAt', 'summary', 'published']
const optionalUrlFields = ['audioSrc', 'transcriptUrl', 'originalUrl']
const minSummaryLength = 130
const maxSummaryLength = 160

function parseFrontmatter(raw) {
  const match = raw.match(/---\s*([\s\S]*?)\s*---/)
  if (!match) {
    return { meta: {}, content: raw }
  }

  const meta = {}
  const lines = match[1].trim().split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split(': ')
    if (!key) continue
    let value = rest.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1')
    if (value === 'true') value = true
    if (value === 'false') value = false
    if (
      ['recommendedReads', 'relatedPosts', 'tags'].includes(key.trim()) &&
      value.startsWith('[') &&
      value.endsWith(']')
    ) {
      try {
        value = JSON.parse(value)
      } catch {
        value = []
      }
    }
    meta[key.trim()] = value
  }

  const content = raw.replace(/---\s*([\s\S]*?)\s*---/, '').trim()
  return { meta, content }
}

function validDate(value) {
  return !!value && !Number.isNaN(new Date(value).getTime())
}

function validUrl(value) {
  if (!value) return true
  return /^https?:\/\//.test(value) || value.startsWith('/')
}

const files = fs.readdirSync(postsDir).filter((file) => file.endsWith('.mdx'))
const errors = []
const warnings = []

for (const file of files) {
  const fullPath = path.join(postsDir, file)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const { meta, content } = parseFrontmatter(raw)
  const prefix = `app/blog/posts/${file}`
  const isPublished = meta.published === true

  for (const field of required) {
    if (meta[field] === undefined || meta[field] === '') {
      errors.push(`${prefix}: missing required field "${field}"`)
    }
  }

  if (meta.published !== undefined && typeof meta.published !== 'boolean') {
    errors.push(`${prefix}: "published" must be true or false`)
  }

  if (!validDate(meta.publishedAt)) {
    errors.push(`${prefix}: "publishedAt" must be a valid date`)
  }

  for (const field of optionalUrlFields) {
    if (!validUrl(meta[field])) {
      errors.push(`${prefix}: "${field}" must be a valid URL (absolute or /relative)`)
    }
  }

  if (isPublished) {
    const summary = typeof meta.summary === 'string' ? meta.summary.trim() : ''
    if (summary.length < minSummaryLength || summary.length > maxSummaryLength) {
      errors.push(
        `${prefix}: "summary" must be ${minSummaryLength}-${maxSummaryLength} chars for published posts (current: ${summary.length})`
      )
    }

    if (!Array.isArray(meta.tags) || meta.tags.length === 0) {
      errors.push(`${prefix}: published posts must include at least one tag`)
    }

    if (!Array.isArray(meta.relatedPosts) || meta.relatedPosts.length === 0) {
      warnings.push(`${prefix}: "relatedPosts" is empty; add 1-3 internal slugs`)
    }

    if (meta.audioSrc) {
      if (!meta.audioDuration) {
        errors.push(`${prefix}: published posts with "audioSrc" must include "audioDuration"`)
      }
      if (!meta.transcriptUrl) {
        errors.push(`${prefix}: published posts with "audioSrc" must include "transcriptUrl"`)
      }
    }

    const internalLinkMatches = content.match(/\]\(\/(blog\/)?[^\)\s]+\)/g) || []
    if (internalLinkMatches.length < 2) {
      warnings.push(
        `${prefix}: only ${internalLinkMatches.length} internal markdown links found; target at least 2`
      )
    }
  }
}

if (errors.length) {
  console.error('SEO/Frontmatter checks failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  if (warnings.length) {
    console.error('\nWarnings:')
    for (const warning of warnings) console.error(`- ${warning}`)
  }
  process.exit(1)
}

if (warnings.length) {
  console.warn('SEO/Frontmatter checks passed with warnings:\n')
  for (const warning of warnings) console.warn(`- ${warning}`)
  console.warn('')
}

console.log(`SEO/Frontmatter checks passed for ${files.length} posts.`)

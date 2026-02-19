import fs from 'node:fs'
import path from 'node:path'

const postsDir = path.join(process.cwd(), 'app', 'blog', 'posts')
const required = ['title', 'publishedAt', 'summary', 'published']
const optionalUrlFields = ['audioSrc', 'transcriptUrl', 'originalUrl']

function parseFrontmatter(raw) {
  const match = raw.match(/---\s*([\s\S]*?)\s*---/)
  if (!match) {
    return {}
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
    meta[key.trim()] = value
  }
  return meta
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

for (const file of files) {
  const fullPath = path.join(postsDir, file)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const meta = parseFrontmatter(raw)
  const prefix = `app/blog/posts/${file}`

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
}

if (errors.length) {
  console.error('SEO/Frontmatter checks failed:\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`SEO/Frontmatter checks passed for ${files.length} posts.`)

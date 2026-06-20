import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const postsDir = path.join(__dirname, '..', 'app', 'blog', 'posts')

function parseFrontmatter(fileContent) {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  const match = frontmatterRegex.exec(fileContent)
  if (!match) throw new Error('No frontmatter found')

  const frontMatterBlock = match[1]
  const content = fileContent.replace(frontmatterRegex, '').trim()
  const frontMatterLines = frontMatterBlock.trim().split('\n')
  const metadata = {}

  frontMatterLines.forEach((line) => {
    const [key, ...valueArr] = line.split(': ')
    let value = valueArr.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes

    const normalizedKey = key.trim()

    if (value === 'true') {
      metadata[normalizedKey] = true
      return
    }
    if (value === 'false') {
      metadata[normalizedKey] = false
      return
    }
    if (
      ['recommendedReads', 'relatedPosts', 'tags'].includes(normalizedKey) &&
      value.startsWith('[') &&
      value.endsWith(']')
    ) {
      try {
        metadata[normalizedKey] = JSON.parse(value)
        return
      } catch {
        metadata[normalizedKey] = []
        return
      }
    }
    metadata[normalizedKey] = value
  })

  return { metadata, content }
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function getMDXData() {
  const mdxFiles = getMDXFiles(postsDir)
  return mdxFiles.map((file) => {
    const filePath = path.join(postsDir, file)
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    const { metadata, content } = parseFrontmatter(rawContent)
    const slug = path.basename(file, path.extname(file))

    return {
      title: metadata.title,
      slug,
      summary: metadata.summary,
      content,
      publishedAt: metadata.publishedAt,
      published: metadata.published === true,
      tags: metadata.tags,
      image: metadata.image,
      relatedPosts: metadata.relatedPosts,
      recommendedReads: metadata.recommendedReads,
      audioSrc: metadata.audioSrc,
      audioDuration: metadata.audioDuration,
      transcriptUrl: metadata.transcriptUrl,
      originalUrl: metadata.originalUrl,
      originalPlatform: metadata.originalPlatform,
      substackUrl: metadata.substackUrl,
    }
  })
}

const posts = getMDXData()
console.log(`Found ${posts.length} posts to migrate:\n`)
posts.forEach((p) => console.log(`  - ${p.slug}: "${p.title}"`))

// Export as JSON for manual inspection or to feed to an HTTP endpoint
const output = {
  timestamp: new Date().toISOString(),
  postsCount: posts.length,
  posts,
}

const outputPath = path.join(__dirname, '..', 'posts-to-migrate.json')
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
console.log(`\nExported to ${outputPath}`)
console.log('\nNext step: Use this data to seed Convex via the migration mutation')

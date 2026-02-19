import Link from 'next/link'

export function PostCta() {
  return (
    <section className="post-cta" aria-label="Next actions">
      <h3>Enjoyed this?</h3>
      <p>
        Follow for more platform and infrastructure notes, or jump to the next
        article.
      </p>
      <div className="post-cta-actions">
        <a href="https://substack.com/@daveclintonn" target="_blank" rel="noreferrer">
          Follow on Substack
        </a>
        <Link href="/blog">Read more posts</Link>
        <Link href="/contact">Contact</Link>
      </div>
    </section>
  )
}


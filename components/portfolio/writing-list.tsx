import Link from "next/link"
import { NumberedPage } from "@/components/portfolio/numbered-page"
import { formatPostDate, getPosts } from "@/lib/blog"
import { NewsletterSignup } from "@/components/portfolio/newsletter-signup"

export async function WritingList({ initial }: { initial?: number }) {
  const posts = await getPosts()

  return (
    <NumberedPage
      id="writing"
      heading="Writing"
      listPath="/blog"
      basePath="/writing"
      initial={initial}
      items={[
        ...posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          body: (
            <>
              <p className="signal-meta">
                <time dateTime={post.date}>{formatPostDate(post.date, "short")}</time> · {post.readingMinutes} min read
              </p>
              <p>{post.description}</p>
              <p><Link href={`/blog/${post.slug}`}>Read the article</Link></p>
            </>
          ),
        })),
        {
          slug: "follow-along",
          title: "Follow along",
          body: <NewsletterSignup showHeading={false} />,
        },
      ]}
    />
  )
}

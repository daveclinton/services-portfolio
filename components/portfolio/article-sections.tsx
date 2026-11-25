import { Children, isValidElement, type ReactNode } from "react"
import Link from "next/link"
import { Signals, type SignalItem } from "@/components/portfolio/signals"

// The MDX plugin supplies one section per h2, with the original content intact.
// Reuse the same native disclosures, numbering, colors and next control as Home.
export function ArticleSections({ id, children }: { id: string; children: ReactNode }) {
  const items: SignalItem[] = []
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ id: string; "data-section-title": string; children?: ReactNode }>(child)) continue
    items.push({
      slug: child.props.id,
      title: child.props["data-section-title"],
      body: <div className="blog-prose">{child.props.children}</div>,
    })
  }

  return (
    <Signals
      id={id}
      items={items}
      listPath=""
      basePath=""
      addressMode="hash"
      footer={<ul><li><Link href="/blog">All writing</Link></li><li><a href="#top">Back to top</a></li></ul>}
    />
  )
}

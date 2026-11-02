import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

// Adapted from prompt-kit's Markdown (MIT). The answer is split into blocks and
// each block is memoized, so while a reply streams only the last block
// re-renders. Styles live in .chat-markdown in app/globals.css.

const COMPONENTS: Partial<Components> = {
  a: function Link({ href, children, ...props }) {
    const external = href?.startsWith("http")
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    )
  },
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  return marked.lexer(markdown).map((token) => token.raw)
}

const MarkdownBlock = memo(
  function MarkdownBlock({ content }: { content: string }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    )
  },
  (previous, next) => previous.content === next.content
)

function MarkdownComponent({ children, className }: { children: string; className?: string }) {
  const id = useId()
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={cn("chat-markdown", className)}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${id}-${index}`} content={block} />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }

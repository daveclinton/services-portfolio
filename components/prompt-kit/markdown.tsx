import { marked } from "marked"
import { memo, useId, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

// Adapted from prompt-kit's Markdown (MIT). The answer is split into blocks and
// each block is memoized, so while a reply streams only the last block
// re-renders. Styles live in .chat-markdown in app/globals.css.

const COMPONENTS: Partial<Components> = {
  table: function Table({ children }) {
    return (
      <ScrollArea orientation="horizontal" viewportProps={{ role: "region", "aria-label": "Answer table" }}>
        <table>{children}</table>
      </ScrollArea>
    )
  },
  pre: function CodeBlock({ children }) {
    return (
      <ScrollArea orientation="horizontal" className="rounded-lg bg-muted" viewportProps={{ role: "region", "aria-label": "Code block" }}>
        <pre>{children}</pre>
      </ScrollArea>
    )
  },
  a: function Link({ href, children, title }) {
    const external = href?.startsWith("http")
    return (
      <a
        href={href}
        title={title}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    )
  },
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  return marked.lexer(markdown).filter((token) => token.type !== "space").map((token) => token.raw)
}

const MarkdownBlock = memo(
  function MarkdownBlock({ content, streaming }: { content: string; streaming: boolean }) {
    return (
      <div className={streaming ? "animate-in fade-in duration-200 ease-out motion-reduce:animate-none" : undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
          {content}
        </ReactMarkdown>
      </div>
    )
  },
  (previous, next) => previous.content === next.content && previous.streaming === next.streaming
)

function MarkdownComponent({ children, className, streaming = false }: { children: string; className?: string; streaming?: boolean }) {
  const id = useId()
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={cn("chat-markdown", className)}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${id}-${index}`} content={block} streaming={streaming} />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = "Markdown"

export { Markdown }

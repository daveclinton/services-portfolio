import type { MDXComponents } from "mdx/types"
import { AutomationFlowVisual } from "@/components/portfolio/automation-flow-visual"

function YouTubePreview({ videoId, title }: { videoId: string; title: string }) {
  return (
    <iframe
      title={title}
      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
      className="aspect-video w-full rounded-lg border border-border bg-card"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}

const components: MDXComponents = { YouTubePreview, AutomationFlowVisual }

export function useMDXComponents(): MDXComponents {
  return components
}

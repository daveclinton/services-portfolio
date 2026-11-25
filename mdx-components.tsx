import type { MDXComponents } from "mdx/types"
import { AutomationFlowVisual } from "@/components/portfolio/automation-flow-visual"
import { ModelConceptVisual } from "@/components/portfolio/model-concept-visual"
import { StudyUnits } from "@/components/portfolio/study-units"
import { ArticleSections } from "@/components/portfolio/article-sections"

export function YouTubePreview({ videoId, title }: { videoId: string; title: string }) {
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

const components: MDXComponents = { YouTubePreview, AutomationFlowVisual, ModelConceptVisual, StudyUnits, ArticleSections }

export function useMDXComponents(): MDXComponents {
  return components
}

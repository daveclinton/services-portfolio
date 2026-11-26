import { Children, isValidElement, memo, type ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import { marked } from "marked"
import remarkGfm from "remark-gfm"
import { ArticleSections } from "@/components/portfolio/article-sections"
import { ModelConceptVisual } from "@/components/portfolio/model-concept-visual"
import { AutomationFlowVisual } from "@/components/portfolio/automation-flow-visual"
import { AskAiChat } from "@/components/portfolio/ask-ai-chat"
import { StudyUnits } from "@/components/portfolio/study-units"
import { YouTubePreview } from "@/mdx-components"

// Only these existing components can be restored from a portable import block.
// The database never supplies executable MDX, module names, or arbitrary props.
function widget(source: string) {
  try {
    const value=JSON.parse(source)
    if(!value || typeof value!=="object" || !value.props || typeof value.props!=="object") return null
    const {name,props}=value
    if(name==="YouTubePreview" && typeof props.videoId==="string" && /^[a-zA-Z0-9_-]{11}$/.test(props.videoId) && typeof props.title==="string") {
      return <YouTubePreview videoId={props.videoId} title={props.title.slice(0,300)}/>
    }
    if(name==="ModelConceptVisual" && ["rules-vs-learning","training","tokens","prediction","generation","attention","fine-tuning","application"].includes(props.concept)) return <ModelConceptVisual concept={props.concept as ComponentProps<typeof ModelConceptVisual>["concept"]}/>
    if(name==="AutomationFlowVisual" && ["orders","fleet","policy","library-eval","model-training"].includes(props.flow)) return <AutomationFlowVisual flow={props.flow as ComponentProps<typeof AutomationFlowVisual>["flow"]}/>
    if(name==="AskAiChat" && props.embedded===true) return <AskAiChat embedded suggestedQuestion={typeof props.suggestedQuestion==="string" ? props.suggestedQuestion.slice(0,300) : undefined}/>
    if(name==="StudyUnits" && typeof props.markdown==="string" && props.markdown.length<=40000)return <StudyUnits title={typeof props.title==="string" ? props.title.slice(0,300) : undefined}><ReactMarkdown remarkPlugins={[remarkGfm]}>{props.markdown}</ReactMarkdown></StudyUnits>
  } catch {}
  return null
}

// One section per h2, as the public reader numbers them.
export function splitSections(markdown:string) {
  const sections:{title:string;id:string;markdown:string;lead?:boolean}[]=[]
  const used=new Set<string>()
  for(const token of marked.lexer(markdown)) {
    if(token.type==="heading" && token.depth===2) {
      const title=token.text.replace(/^\d+\.\s+/,"")
      const base=title.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"") || "section"
      let id=base;for(let n=2;used.has(id);n++)id=`${base}-${n}`
      used.add(id);sections.push({title,id,markdown:""})
    } else {
      if(!sections.length){sections.push({title:"Introduction",id:"introduction",markdown:"",lead:true});used.add("introduction")}
      sections.at(-1)!.markdown+=token.raw
    }
  }
  return sections
}

// The public body renderer, with portable blocks restored. Memoized so a live
// view only re-renders the section that changed.
export const PostMarkdown=memo(function PostMarkdown({markdown}:{markdown:string}) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{pre:({children})=>{
    const child=Children.toArray(children)[0]
    if(isValidElement<{className?:string;children?:string}>(child)&&child.props.className==="language-portfolio-widget") {
      const restored=widget(String(child.props.children??""));if(restored)return restored
    }
    return <pre>{children}</pre>
  }}}>{markdown}</ReactMarkdown>
})

export function PublishedPostContent({slug,markdown}:{slug:string;markdown:string}) {
  return <ArticleSections id={`article-${slug}`}>{splitSections(markdown).map((section)=><section key={section.id} id={section.id} data-section-title={section.title}>
    <PostMarkdown markdown={section.markdown}/>
  </section>)}</ArticleSections>
}

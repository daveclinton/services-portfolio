// Build the one-time PostgreSQL import from trusted repository MDX. The parser
// preserves Markdown/code and converts JSX to portable, non-executable blocks.
// Run: node backend/scripts/import-posts.mjs
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { readdir, readFile, writeFile } from "node:fs/promises"
const require=createRequire(import.meta.url)
const loader=createRequire(require.resolve("@mdx-js/loader"))
const { createProcessor }=await import(pathToFileURL(loader.resolve("@mdx-js/mdx")))
const posts=[]
for(const file of (await readdir("content/blog")).filter((file)=>file.endsWith(".mdx")).sort()){
 const source=await readFile(`content/blog/${file}`,"utf8")
 const tree=createProcessor().parse(source)
 const metadata=tree.children.find((node)=>node.type==="mdxjsEsm"&&node.value.includes("export const metadata"))
 const declaration=metadata?.data.estree.body.find((node)=>node.type==="ExportNamedDeclaration")?.declaration
 const object=declaration?.declarations.find((node)=>node.id.name==="metadata")?.init
 if(object?.type!=="ObjectExpression")throw Error(`Missing static metadata: ${file}`)
 const values=Object.fromEntries(object.properties.map((node)=>[node.key.name,node.value.value]))
 if(values.draft)continue
 function content(node){
  if(node.type==="mdxjsEsm")return ""
  if(node.type==="mdxJsxFlowElement"||node.type==="mdxJsxTextElement"){
   const props=Object.fromEntries(node.attributes.filter((attr)=>attr.type==="mdxJsxAttribute"&&(typeof attr.value==="string"||attr.value===null)).map((attr)=>[attr.name,attr.value??true]))
   if(node.name==="Image")return `![${String(props.alt??"").replaceAll("]","\\]")}](<${props.src}>)`
   if(["YouTubePreview","ModelConceptVisual","AutomationFlowVisual","AskAiChat"].includes(node.name))return `\n\n\`\`\`portfolio-widget\n${JSON.stringify({name:node.name,props})}\n\`\`\`\n\n`
   const children=node.children.map(content).join(node.type==="mdxJsxFlowElement" ? "\n\n" : "")
   if(node.name==="StudyUnits")return `\n\n\`\`\`portfolio-widget\n${JSON.stringify({name:node.name,props:{...props,markdown:children}})}\n\`\`\`\n\n`
   if(node.name==="a"&&props.href)return `[${children}](<${props.href}>)`
   if(["figure","figcaption","small"].includes(node.name))return `\n\n${children}\n\n`
   if(node.name==="br")return "\n"
   if(node.name==="hr")return "\n\n---\n\n"
   if(/^[A-Z]/.test(node.name??"") || !node.children.length)throw Error(`Unmapped component ${node.name} in ${file}`)
   return children
  }
  if(!node.children?.length)return source.slice(node.position.start.offset,node.position.end.offset)
  let result="",cursor=node.position.start.offset
  for(const child of node.children){result+=source.slice(cursor,child.position.start.offset)+content(child);cursor=child.position.end.offset}
  return result+source.slice(cursor,node.position.end.offset)
 }
 const markdown=tree.children.map(content).filter(Boolean).join("\n\n").replace(/\n{3,}/g,"\n\n").trim()
 if(Buffer.byteLength(markdown)>40000)throw Error(`Post exceeds editor limit: ${file}`)
 posts.push({...values,slug:file.replace(/\.mdx$/,""),markdown})
}
await writeFile("backend/internal/studio/posts.json",JSON.stringify(posts,null,2)+"\n")
console.log(`Prepared ${posts.length} published articles.`)

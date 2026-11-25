// MDX's remark extension point groups article content before it becomes JSX.
// Keep imports/exports at the root, and move original nodes without parsing or
// rewriting Markdown strings, code examples, tables, or interactive components.
export default function remarkArticleSections() {
  return (tree, file) => {
    const path = String(file.path ?? "").replaceAll("\\", "/")
    if (!path.includes("content/blog/")) return

    const declarations = []
    const sections = []
    const used = new Set()
    let current

    function text(node) {
      return node.value ?? node.alt ?? node.children?.map(text).join("") ?? ""
    }

    function section(title) {
      const base = title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section"
      let slug = base
      for (let suffix = 2; used.has(slug); suffix++) slug = `${base}-${suffix}`
      used.add(slug)
      const node = {
        type: "mdxJsxFlowElement", name: "section",
        attributes: [
          { type: "mdxJsxAttribute", name: "id", value: slug },
          { type: "mdxJsxAttribute", name: "data-section-title", value: title },
        ],
        children: [],
      }
      sections.push(node)
      return node
    }

    for (const node of tree.children) {
      if (["mdxjsEsm", "definition", "footnoteDefinition"].includes(node.type)) {
        declarations.push(node)
      } else if (node.type === "heading" && node.depth === 2) {
        current = section(text(node).replace(/^\d+\.\s+/, ""))
      } else {
        current ??= section("Introduction")
        current.children.push(node)
      }
    }

    const slug = path.split("/").at(-1).replace(/\.mdx?$/, "")
    tree.children = [...declarations, {
      type: "mdxJsxFlowElement", name: "ArticleSections",
      attributes: [{ type: "mdxJsxAttribute", name: "id", value: `article-${slug}` }],
      children: sections,
    }]
  }
}

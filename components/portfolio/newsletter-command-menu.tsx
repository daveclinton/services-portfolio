"use client"

import { forwardRef, useEffect, useId, useImperativeHandle, useState } from "react"
import { Extension, ReactRenderer } from "@tiptap/react"
import Suggestion, { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion"
import { PluginKey } from "@tiptap/pm/state"
import { shift } from "@floating-ui/dom"
import { Text, Heading1, Heading2, Heading3, List, ListOrdered, Quote, CodeXml, Minus, ImagePlus } from "lucide-react"
import { applyWritingBlock, writingBlocks, type WritingBlock } from "@/lib/newsletter-editor"

const icons = { paragraph: Text, heading1: Heading1, heading2: Heading2, heading3: Heading3, bulletList: List, orderedList: ListOrdered, blockquote: Quote, codeBlock: CodeXml, horizontalRule: Minus, image: ImagePlus }
export function WritingBlockLabel({ item }: { item: WritingBlock }) {
  const Icon = icons[item.id]
  return <><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border"><Icon className="size-4" /></span><span><span className="block text-body font-medium">{item.label}</span><span className="block text-caption text-muted-foreground">{item.description}</span></span></>
}
type MenuProps = Pick<SuggestionProps<WritingBlock, WritingBlock>, "items" | "command" | "query" | "editor">
type MenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean }

// Novel's searchable block rows and selection menu, adapted to Tiptap 3's
// managed popup lifecycle (no Tippy or Novel/Tiptap 2 dependency).
// https://github.com/steven-tey/novel/blob/main/apps/web/components/tailwind/slash-command.tsx
// https://tiptap.dev/docs/editor/api/utilities/suggestion
const BlockMenu = forwardRef<MenuHandle, MenuProps>(function BlockMenu({ items, command, query, editor }, ref) {
  const id = useId()
  const [selection, setSelection] = useState({ query, index: 0 })
  const selected = selection.query === query ? Math.min(selection.index, Math.max(0, items.length - 1)) : 0

  useEffect(() => {
    const element = editor.view.dom
    element.setAttribute("aria-controls", id)
    element.setAttribute("aria-expanded", "true")
    if (items.length) element.setAttribute("aria-activedescendant", `${id}-${selected}`)
    else element.removeAttribute("aria-activedescendant")
    document.getElementById(`${id}-${selected}`)?.scrollIntoView({ block: "nearest" })
    return () => { ["aria-controls", "aria-expanded", "aria-activedescendant"].forEach((name) => element.removeAttribute(name)) }
  }, [editor, id, selected, items.length])

  useImperativeHandle(ref, () => ({ onKeyDown(event) {
    if (!items.length) return false
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      setSelection({ query, index: (selected + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length })
      return true
    }
    if (event.key === "Enter") { command(items[selected]); return true }
    return false
  } }))

  return <div className="writing-block-menu" id={id} role="listbox" aria-label="Insert a block">
    <p className="px-2.5 py-2 text-caption text-muted-foreground">Add a block</p>
    {items.length ? items.map((item, index) => {
      return <button key={item.id} id={`${id}-${index}`} type="button" role="option" aria-selected={selected === index} className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-muted aria-selected:bg-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => command(item)}>
        <WritingBlockLabel item={item} />
      </button>
    }) : <p className="p-2.5 text-body text-muted-foreground">No matching blocks. Escape closes this menu.</p>}
  </div>
})

export function createWritingSlash(onImage: () => void) {
  const key = new PluginKey("writingSlash")
  return Extension.create({
    name: "writingSlash",
    addProseMirrorPlugins() {
      return [Suggestion<WritingBlock, WritingBlock>({
        editor: this.editor, pluginKey: key, char: "/", startOfLine: true,
        floatingUi: { middleware: [shift()] },
        allow: ({ state }) => state.selection.$from.parent.type.name !== "codeBlock",
        items: ({ query }) => writingBlocks.filter((item) => `${item.label} ${item.search}`.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          if (props.id === "image") onImage()
          else applyWritingBlock(editor, props.id)
        },
        render: () => {
          let menu: ReactRenderer<MenuHandle, MenuProps> | undefined
          let unmount: (() => void) | undefined
          return {
            onStart(props) { menu = new ReactRenderer(BlockMenu, { editor: props.editor, props }); unmount = props.mount(menu.element) },
            onUpdate(props) { menu?.updateProps(props) },
            onKeyDown({ event, view }) {
              if (event.key === "Escape") { exitSuggestion(view, key); return true }
              return menu?.ref?.onKeyDown(event) ?? false
            },
            onExit() { unmount?.(); menu?.destroy() },
          }
        },
      })]
    },
  })
}

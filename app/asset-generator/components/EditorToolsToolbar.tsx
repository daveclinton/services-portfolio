import type { CSSProperties } from 'react'
import { Circle, Diamond, MousePointer2, Square, Type } from 'lucide-react'
import type { EditorTool } from '../types'

const tools: Array<{ tool: EditorTool; label: string; title: string; icon: typeof Square }> = [
  { tool: 'select', label: 'Selection tool', title: 'Selection (V)', icon: MousePointer2 },
  { tool: 'text', label: 'Text tool', title: 'Text (T)', icon: Type },
  { tool: 'rectangle', label: 'Rectangle tool', title: 'Rectangle (R)', icon: Square },
  { tool: 'diamond', label: 'Diamond tool', title: 'Diamond (D)', icon: Diamond },
  { tool: 'ellipse', label: 'Ellipse tool', title: 'Ellipse (O)', icon: Circle },
]

export function EditorToolsToolbar({
  activeTool,
  onSelectTool,
}: {
  activeTool: EditorTool
  onSelectTool: (tool: EditorTool) => void
}) {
  return (
    <div className="Stack Stack_horizontal App-toolbar-container" style={{ '--gap': 1 } as CSSProperties}>
      {tools.map(({ tool, label, title, icon: Icon }) => (
        <button
          key={tool}
          type="button"
          className={`excalidraw-button${activeTool === tool ? ' is-active' : ''}`}
          aria-label={label}
          aria-pressed={activeTool === tool}
          title={title}
          onClick={() => onSelectTool(tool)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
import type { CSSProperties } from 'react'
import { MousePointer2 } from 'lucide-react'
import type { EditorTool } from '../types'

export function EditorToolsToolbar({
  activeTool,
  onSelectTool,
}: {
  activeTool: EditorTool
  onSelectTool: (tool: EditorTool) => void
}) {
  return (
    <div className="Stack Stack_horizontal App-toolbar-container" style={{ '--gap': 1 } as CSSProperties}>
      <button
        type="button"
        className={`excalidraw-button${activeTool === 'select' ? ' is-active' : ''}`}
        aria-label="Selection tool"
        aria-pressed={activeTool === 'select'}
        title="Selection (V)"
        onClick={() => onSelectTool('select')}
      >
        <MousePointer2 aria-hidden="true" />
      </button>
    </div>
  )
}
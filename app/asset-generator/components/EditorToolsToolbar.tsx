import type { CSSProperties } from 'react'
import {
  Circle,
  Diamond,
  Hand,
  Lock,
  MousePointer2,
  Redo2,
  Square,
  SquareDashed,
  Type,
  Undo2,
} from 'lucide-react'
import type { EditorTool } from '../types'

type EditorToolsToolbarProps = {
  activeTool: EditorTool
  canUndo: boolean
  canRedo: boolean
  onSelectTool: (tool: EditorTool, options?: { selectText?: boolean; editText?: boolean }) => void
  onUndo: () => void
  onRedo: () => void
}

export function EditorToolsToolbar({
  activeTool,
  canUndo,
  canRedo,
  onSelectTool,
  onUndo,
  onRedo,
}: EditorToolsToolbarProps) {
  return (
    <div
      className="Island App-toolbar App-toolbar--compact App-toolbar--tools"
      style={{ '--padding': 1 } as CSSProperties}
      aria-label="Canvas tools"
    >
      <div className="Stack Stack_horizontal" style={{ '--gap': 0.5 } as CSSProperties}>
        <label className="ToolIcon ToolIcon__lock" title="Lock">
          <input type="checkbox" className="ToolIcon_type_checkbox" aria-label="Lock selected layer" disabled />
          <div className="ToolIcon__icon">
            <Lock aria-hidden="true" />
            <span className="ToolIndexIndicator" aria-hidden="true">
              0
            </span>
          </div>
        </label>

        <div className="App-toolbar__divider" />

        <label className={`ToolIcon Shape ${activeTool === 'hand' ? 'active' : ''}`} title="Hand">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'hand'}
            aria-label="Hand tool"
            aria-keyshortcuts="H"
            onChange={() => onSelectTool('hand')}
          />
          <div className="ToolIcon__icon">
            <Hand aria-hidden="true" />
            <span className="ToolIcon__keybinding">H</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              1
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape ${activeTool === 'select' ? 'active' : ''}`} title="Select">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'select'}
            aria-label="Select tool"
            aria-keyshortcuts="V"
            onChange={() => onSelectTool('select')}
          />
          <div className="ToolIcon__icon">
            <MousePointer2 aria-hidden="true" />
            <span className="ToolIcon__keybinding">V</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              2
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape ${activeTool === 'text' ? 'active' : ''}`} title="Text">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'text'}
            aria-label="Text tool"
            aria-keyshortcuts="T"
            onChange={() => onSelectTool('text', { selectText: true, editText: true })}
          />
          <div className="ToolIcon__icon">
            <Type aria-hidden="true" />
            <span className="ToolIcon__keybinding">T</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              3
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape fillable ${activeTool === 'rectangle' ? 'active' : ''}`} title="Rectangle">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'rectangle'}
            aria-label="Rectangle tool"
            aria-keyshortcuts="R"
            onChange={() => onSelectTool('rectangle')}
          />
          <div className="ToolIcon__icon">
            <Square aria-hidden="true" />
            <span className="ToolIcon__keybinding">R</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              4
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape fillable ${activeTool === 'diamond' ? 'active' : ''}`} title="Diamond">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'diamond'}
            aria-label="Diamond tool"
            aria-keyshortcuts="D"
            onChange={() => onSelectTool('diamond')}
          />
          <div className="ToolIcon__icon">
            <Diamond aria-hidden="true" />
            <span className="ToolIcon__keybinding">D</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              5
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape fillable ${activeTool === 'ellipse' ? 'active' : ''}`} title="Ellipse">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'ellipse'}
            aria-label="Ellipse tool"
            aria-keyshortcuts="O"
            onChange={() => onSelectTool('ellipse')}
          />
          <div className="ToolIcon__icon">
            <Circle aria-hidden="true" />
            <span className="ToolIcon__keybinding">O</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              6
            </span>
          </div>
        </label>

        <label className={`ToolIcon Shape ${activeTool === 'frame' ? 'active' : ''}`} title="Frame">
          <input
            type="radio"
            className="ToolIcon_type_radio"
            name="editor-current-shape"
            checked={activeTool === 'frame'}
            aria-label="Frame tool"
            aria-keyshortcuts="F"
            onChange={() => onSelectTool('frame')}
          />
          <div className="ToolIcon__icon">
            <SquareDashed aria-hidden="true" />
            <span className="ToolIcon__keybinding">F</span>
            <span className="ToolIndexIndicator" aria-hidden="true">
              7
            </span>
          </div>
        </label>

        <div className="App-toolbar__divider" />

        <button
          type="button"
          className="ToolIcon Shape"
          onClick={onUndo}
          aria-label="Undo"
          aria-keyshortcuts="Meta+Z Control+Z"
          title="Undo"
          disabled={!canUndo}
        >
          <span className="ToolIcon__icon">
            <Undo2 aria-hidden="true" />
            <span className="ToolIndexIndicator" aria-hidden="true">
              8
            </span>
          </span>
        </button>
        <button
          type="button"
          className="ToolIcon Shape"
          onClick={onRedo}
          aria-label="Redo"
          aria-keyshortcuts="Meta+Shift+Z Control+Y"
          title="Redo"
          disabled={!canRedo}
        >
          <span className="ToolIcon__icon">
            <Redo2 aria-hidden="true" />
            <span className="ToolIndexIndicator" aria-hidden="true">
              9
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
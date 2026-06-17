import type { EditorState, FontKey, TextSizeKey, TextAlign, TextVerticalAlign } from '../types'
import { fontOptions } from '../constants'

export type KeyboardShortcutHandler = {
  undo: () => void
  redo: () => void
  selectTool: (tool: EditorState['activeTool']) => void
  setSelectedLayerId: (id: string) => void
  setIsEditingText: (editing: boolean) => void
  moveTextPosition: (delta: { x: number; y: number }) => void
}

export function handleKeyboardShortcuts(
  event: KeyboardEvent,
  activeTool: EditorState['activeTool'],
  selectedLayerId: string,
  isEditingText: boolean,
  handlers: KeyboardShortcutHandler,
) {
  const target = event.target
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement

  if (isTyping) return

  const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
  const isRedo =
    ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && event.shiftKey) ||
    ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y')
  const isSelectAll = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a'

  if (isUndo) {
    event.preventDefault()
    handlers.undo()
    return
  }

  if (isRedo) {
    event.preventDefault()
    handlers.redo()
    return
  }

  if (isSelectAll) {
    event.preventDefault()
    handlers.setSelectedLayerId('text')
    handlers.setIsEditingText(false)
    return
  }

  if (event.key === 'Escape') {
    handlers.setSelectedLayerId('background')
    handlers.setIsEditingText(false)
    return
  }

  if (selectedLayerId === 'text' && ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault()
    const distance = event.shiftKey ? 10 : 1
    const delta = {
      ArrowUp: { x: 0, y: -distance },
      ArrowRight: { x: distance, y: 0 },
      ArrowDown: { x: 0, y: distance },
      ArrowLeft: { x: -distance, y: 0 },
    }[event.key]

    if (delta) {
      handlers.moveTextPosition(delta)
    }
    return
  }

  if (event.key.toLowerCase() === 'h') {
    handlers.selectTool('hand')
    handlers.setIsEditingText(false)
  }

  if (event.key.toLowerCase() === 'v' || event.key === '1') {
    handlers.selectTool('select')
    handlers.setIsEditingText(false)
  }

  if (event.key.toLowerCase() === 't') {
    handlers.selectTool('text')
    handlers.setSelectedLayerId('text')
    handlers.setIsEditingText(true)
  }

  if (event.key.toLowerCase() === 'r') {
    handlers.selectTool('rectangle')
    handlers.setIsEditingText(false)
  }

  if (event.key.toLowerCase() === 'd') {
    handlers.selectTool('diamond')
    handlers.setIsEditingText(false)
  }

  if (event.key.toLowerCase() === 'o') {
    handlers.selectTool('ellipse')
    handlers.setIsEditingText(false)
  }

  if (event.key.toLowerCase() === 'f') {
    handlers.selectTool('frame')
    handlers.setIsEditingText(false)
  }
}

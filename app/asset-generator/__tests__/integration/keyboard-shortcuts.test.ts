import { describe, expect, it, vi } from 'vitest'
import { handleKeyboardShortcuts } from '../../lib/keyboard-shortcuts'

describe('Text Tool – keyboard shortcut bridge', () => {
  it('T shortcut selects text tool and enters edit mode', () => {
    const selectTool = vi.fn()
    const setSelectedLayerId = vi.fn()
    const setIsEditingText = vi.fn()

    handleKeyboardShortcuts(
      new KeyboardEvent('keydown', { key: 't' }),
      'select',
      'background',
      false,
      {
        undo: vi.fn(),
        redo: vi.fn(),
        selectTool,
        setSelectedLayerId,
        setIsEditingText,
        moveTextPosition: vi.fn(),
      },
    )

    expect(selectTool).toHaveBeenCalledWith('text')
    expect(setSelectedLayerId).toHaveBeenCalledWith('text')
    expect(setIsEditingText).toHaveBeenCalledWith(true)
  })

  it('Escape exits edit mode in current canvas client bridge', () => {
    const setSelectedLayerId = vi.fn()
    const setIsEditingText = vi.fn()

    handleKeyboardShortcuts(
      new KeyboardEvent('keydown', { key: 'Escape' }),
      'text',
      'text',
      true,
      {
        undo: vi.fn(),
        redo: vi.fn(),
        selectTool: vi.fn(),
        setSelectedLayerId,
        setIsEditingText,
        moveTextPosition: vi.fn(),
      },
    )

    expect(setSelectedLayerId).toHaveBeenCalledWith('background')
    expect(setIsEditingText).toHaveBeenCalledWith(false)
  })
})
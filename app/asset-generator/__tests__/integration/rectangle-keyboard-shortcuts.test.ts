import { describe, expect, it, vi } from 'vitest'
import { handleKeyboardShortcuts } from '../../lib/keyboard-shortcuts'

describe('Rectangle Tool – keyboard shortcut bridge', () => {
  it('R shortcut selects rectangle tool', () => {
    const selectTool = vi.fn()

    handleKeyboardShortcuts(
      new KeyboardEvent('keydown', { key: 'r' }),
      'select',
      'background',
      false,
      {
        undo: vi.fn(),
        redo: vi.fn(),
        selectTool,
        setSelectedLayerId: vi.fn(),
        setIsEditingText: vi.fn(),
        moveTextPosition: vi.fn(),
      },
    )

    expect(selectTool).toHaveBeenCalledWith('rectangle')
  })
})
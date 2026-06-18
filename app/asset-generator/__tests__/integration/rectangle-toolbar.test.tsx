import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolsToolbar } from '../../components/EditorToolsToolbar'

describe('Rectangle Tool – toolbar integration', () => {
  it('activates rectangle tool when icon is clicked', async () => {
    const user = userEvent.setup()
    const onSelectTool = vi.fn()

    render(
      <EditorToolsToolbar
        activeTool="select"
        canUndo={false}
        canRedo={false}
        onSelectTool={onSelectTool}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Rectangle tool' }))

    expect(onSelectTool).toHaveBeenCalledWith('rectangle')
  })

  it('exposes keyboard shortcut metadata for R', () => {
    render(
      <EditorToolsToolbar
        activeTool="select"
        canUndo={false}
        canRedo={false}
        onSelectTool={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Rectangle tool' })).toHaveAttribute('aria-keyshortcuts', 'R')
  })
})
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolsToolbar } from '../../components/EditorToolsToolbar'

describe('Text Tool – Toolbar integration', () => {
  it('activates text tool when T icon is clicked', async () => {
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

    await user.click(screen.getByRole('radio', { name: 'Text tool' }))

    expect(onSelectTool).toHaveBeenCalledWith('text', { selectText: true, editText: true })
  })

  it('exposes keyboard shortcut metadata for T', () => {
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

    expect(screen.getByRole('radio', { name: 'Text tool' })).toHaveAttribute('aria-keyshortcuts', 'T')
  })
})
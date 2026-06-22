'use client'

import { useRef, type ReactNode } from 'react'
import {
  BringToFront,
  CopyPlus,
  Download,
  Files,
  FolderOpen,
  ImagePlus,
  Layers,
  Save,
  SendToBack,
  Trash2,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { getElementsOutsideSafeArea } from '../lib/common/safeArea'
import { exportAllPlatforms, exportPlatformPack } from '../lib/utils/export'
import type { PreviewPlatform } from '../lib/common/exportPresets'
import type { AssetFile } from '../lib/editor/types'
import type { AssetElement } from '../lib/element/types'

type ContextMenuTarget = 'canvas' | 'element'

type AssetCanvasContextMenuProps = {
  children: ReactNode
  target: ContextMenuTarget
  selectedCount: number
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  projectName: string
  previewPlatform: PreviewPlatform
  onImportImage: (file: File) => void
  onLoadDocument: (file: File) => void
  onSaveDocument: () => void
  onSelectAll: () => void
  onDuplicateSelected: () => void
  onDeleteSelected: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

export function AssetCanvasContextMenu({
  children,
  target,
  selectedCount,
  elements,
  files,
  backgroundColor,
  projectName,
  previewPlatform,
  onImportImage,
  onLoadDocument,
  onSaveDocument,
  onSelectAll,
  onDuplicateSelected,
  onDeleteSelected,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: AssetCanvasContextMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const hasElements = elements.length > 0
  const hasSelection = selectedCount > 0
  const platformLabel = previewPlatform === 'ios' ? 'iOS' : 'Android'
  const confirmSafeAreaExport = () => {
    const violations = getElementsOutsideSafeArea(elements)
    if (violations.length === 0) {
      return true
    }

    return window.confirm(
      `${violations.length} element${
        violations.length === 1 ? ' is' : 's are'
      } outside the safe area. Export anyway?`,
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="asset-context-menu-trigger">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent alignOffset={4} className="asset-context-menu-content--asset">
        {target === 'element' && hasSelection ? (
          <>
            <ContextMenuItem onSelect={onDuplicateSelected}>
              <CopyPlus aria-hidden="true" />
              Duplicate
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Layers aria-hidden="true" />
                Layer
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onSelect={onBringForward}>
                  <BringToFront aria-hidden="true" />
                  Bring forward
                  <ContextMenuShortcut>]</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={onSendBackward}>
                  <SendToBack aria-hidden="true" />
                  Send backward
                  <ContextMenuShortcut>[</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onBringToFront}>
                  <BringToFront aria-hidden="true" />
                  Bring to front
                </ContextMenuItem>
                <ContextMenuItem onSelect={onSendToBack}>
                  <SendToBack aria-hidden="true" />
                  Send to back
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={onDeleteSelected}>
              <Trash2 aria-hidden="true" />
              Delete
              <ContextMenuShortcut>⌫</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}

        <ContextMenuItem onSelect={() => imageInputRef.current?.click()}>
          <ImagePlus aria-hidden="true" />
          Import image
        </ContextMenuItem>
        <ContextMenuItem onSelect={onSaveDocument}>
          <Save aria-hidden="true" />
          Save JSON
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => documentInputRef.current?.click()}>
          <FolderOpen aria-hidden="true" />
          Load JSON
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!hasElements}
          onSelect={() => {
            if (!confirmSafeAreaExport()) {
              return
            }

            exportPlatformPack(elements, files, backgroundColor, projectName, previewPlatform)
          }}
        >
          <Download aria-hidden="true" />
          Export {platformLabel}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!hasElements}
          onSelect={() => {
            if (!confirmSafeAreaExport()) {
              return
            }

            exportAllPlatforms(elements, files, backgroundColor, projectName)
          }}
        >
          <Files aria-hidden="true" />
          Export all
        </ContextMenuItem>
        {target === 'canvas' ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!hasElements} onSelect={onSelectAll}>
              <Layers aria-hidden="true" />
              Select all
              <ContextMenuShortcut>⌘A</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onImportImage(file)
          }
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onLoadDocument(file)
          }
          event.currentTarget.value = ''
        }}
      />
    </ContextMenu>
  )
}

'use client'

import { useRef, type ReactNode } from 'react'
import {
  BringToFront,
  Bold,
  CopyPlus,
  Download,
  Files,
  FolderOpen,
  ImagePlus,
  Italic,
  Layers,
  Palette,
  Save,
  SendToBack,
  Trash2,
  Type,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { getElementsOutsideSafeArea } from '../lib/common/safeArea'
import { DEFAULT_ELEMENT_BACKGROUND_PICKS, DEFAULT_ELEMENT_STROKE_PICKS } from '../lib/element/colors'
import {
  ASSET_FONT_OPTIONS,
  type AssetFontFamily,
  type AssetFontStyle,
} from '../lib/element/fonts'
import { withAssetProgress } from '../lib/ui/progress'
import { exportAllPlatforms, exportPlatformPack } from '../lib/utils/export'
import type { PreviewPlatform } from '../lib/common/exportPresets'
import type { AssetFile } from '../lib/editor/types'
import type { AssetElement } from '../lib/element/types'

type ContextMenuTarget = 'canvas' | 'element'

type AssetCanvasContextMenuProps = {
  children: ReactNode
  target: ContextMenuTarget
  selectedCount: number
  selectedElement: AssetElement | null
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
  onUpdateSelectedElements: (updates: Partial<AssetElement>) => void
}

const textSizeOptions = [
  { label: 'Small', value: 64 },
  { label: 'Medium', value: 96 },
  { label: 'Large', value: 144 },
  { label: 'Extra large', value: 192 },
] as const

function getFontStyleState(fontStyle?: string) {
  return {
    bold: fontStyle === 'bold' || fontStyle === 'bold-italic',
    italic: fontStyle === 'italic' || fontStyle === 'bold-italic',
  }
}

function getFontStyleFromState({ bold, italic }: { bold: boolean; italic: boolean }): AssetFontStyle {
  if (bold && italic) return 'bold-italic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'regular'
}

function ColorMenuItem({
  color,
  label,
  onSelect,
}: {
  color: string
  label: string
  onSelect: () => void
}) {
  return (
    <ContextMenuItem onSelect={onSelect}>
      <span
        className="asset-context-menu-color-swatch"
        data-transparent={color === 'transparent'}
        style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
        aria-hidden="true"
      />
      {label}
    </ContextMenuItem>
  )
}

function normalizeHexInput(value: string | null) {
  if (!value) {
    return null
  }

  const sanitized = value.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? `#${sanitized}` : null
}

export function AssetCanvasContextMenu({
  children,
  target,
  selectedCount,
  selectedElement,
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
  onUpdateSelectedElements,
}: AssetCanvasContextMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const hasElements = elements.length > 0
  const hasSelection = selectedCount > 0
  const hasSelectedText = target === 'element' && selectedElement?.type === 'text'
  const textStyleState = getFontStyleState(selectedElement?.fontStyle)
  const platformLabel = previewPlatform === 'ios' ? 'iOS' : 'Android'
  const updateFontStyle = (updates: Partial<typeof textStyleState>) => {
    onUpdateSelectedElements({
      fontStyle: getFontStyleFromState({ ...textStyleState, ...updates }),
    })
  }
  const selectedFontSize = Math.min(Math.max(Math.round(selectedElement?.fontSize ?? 96), 16), 320)
  const adjustFontSize = (delta: number) => {
    onUpdateSelectedElements({ fontSize: Math.min(Math.max(selectedFontSize + delta, 16), 320) })
  }
  const promptForColor = (property: 'strokeColor' | 'backgroundColor') => {
    const currentColor = property === 'strokeColor'
      ? selectedElement?.strokeColor
      : selectedElement?.backgroundColor
    const color = normalizeHexInput(window.prompt('Hex color', currentColor ?? '#1e1e1e'))
    if (!color) {
      return
    }

    onUpdateSelectedElements({ [property]: color })
  }
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
            {hasSelectedText ? (
              <>
                <ContextMenuCheckboxItem
                  checked={textStyleState.bold}
                  onCheckedChange={(checked) => updateFontStyle({ bold: checked === true })}
                >
                  <Bold aria-hidden="true" />
                  Bold
                  <ContextMenuShortcut>⌘B</ContextMenuShortcut>
                </ContextMenuCheckboxItem>
                <ContextMenuCheckboxItem
                  checked={textStyleState.italic}
                  onCheckedChange={(checked) => updateFontStyle({ italic: checked === true })}
                >
                  <Italic aria-hidden="true" />
                  Italic
                  <ContextMenuShortcut>⌘I</ContextMenuShortcut>
                </ContextMenuCheckboxItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Type aria-hidden="true" />
                    Font family
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuRadioGroup
                      value={selectedElement.fontFamily ?? 'normal'}
                      onValueChange={(fontFamily) =>
                        onUpdateSelectedElements({ fontFamily: fontFamily as AssetFontFamily })
                      }
                    >
                      {ASSET_FONT_OPTIONS.map((option) => (
                        <ContextMenuRadioItem key={option.id} value={option.id}>
                          {option.label}
                        </ContextMenuRadioItem>
                      ))}
                    </ContextMenuRadioGroup>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Type aria-hidden="true" />
                    Font size
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuRadioGroup
                      value={String(selectedElement.fontSize ?? 96)}
                      onValueChange={(fontSize) =>
                        onUpdateSelectedElements({ fontSize: Number(fontSize) })
                      }
                    >
                      {textSizeOptions.map((option) => (
                        <ContextMenuRadioItem key={option.value} value={String(option.value)}>
                          {option.label}
                          <ContextMenuShortcut>{option.value}px</ContextMenuShortcut>
                        </ContextMenuRadioItem>
                      ))}
                    </ContextMenuRadioGroup>
                    <ContextMenuSeparator />
                    <div className="asset-context-menu-stepper" role="group" aria-label="Custom font size">
                      <button
                        type="button"
                        aria-label="Decrease font size"
                        onClick={() => adjustFontSize(-4)}
                      >
                        -
                      </button>
                      <span>{selectedFontSize}px</span>
                      <button
                        type="button"
                        aria-label="Increase font size"
                        onClick={() => adjustFontSize(4)}
                      >
                        +
                      </button>
                    </div>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Palette aria-hidden="true" />
                    Text color
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {DEFAULT_ELEMENT_STROKE_PICKS.map((color) => (
                      <ColorMenuItem
                        key={color}
                        color={color}
                        label={color}
                        onSelect={() => onUpdateSelectedElements({ strokeColor: color })}
                      />
                    ))}
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => promptForColor('strokeColor')}>
                      Custom text color
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Palette aria-hidden="true" />
                    Fill color
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {DEFAULT_ELEMENT_BACKGROUND_PICKS.map((color) => (
                      <ColorMenuItem
                        key={color}
                        color={color}
                        label={color}
                        onSelect={() => onUpdateSelectedElements({ backgroundColor: color })}
                      />
                    ))}
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => promptForColor('backgroundColor')}>
                      Custom fill color
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
              </>
            ) : null}
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

            void withAssetProgress(() =>
              exportPlatformPack(elements, files, backgroundColor, projectName, previewPlatform),
            )
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

            void withAssetProgress(() =>
              exportAllPlatforms(elements, files, backgroundColor, projectName),
            )
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

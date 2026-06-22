"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  CopyPlus,
  Download,
  Files,
  FolderOpen,
  Home,
  ImagePlus,
  Layers,
  Menu,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getElementsOutsideSafeArea } from "../lib/common/safeArea"
import { exportAllPlatforms, exportPlatformPack } from "../lib/utils/export"
import type { PreviewPlatform } from "../lib/common/exportPresets"
import type { AssetFile } from "../lib/editor/types"
import type { AssetElement } from "../lib/element/types"

type AssetMainMenuProps = {
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  projectName: string
  previewPlatform: PreviewPlatform
  selectedCount: number
  canUndo: boolean
  canRedo: boolean
  onImportImage: (file: File) => void
  onLoadDocument: (file: File) => void
  onSaveDocument: () => void
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
  onDuplicateSelected: () => void
  onDeleteSelected: () => void
}

function confirmSafeAreaExport(elements: readonly AssetElement[]) {
  const violations = getElementsOutsideSafeArea(elements)
  if (violations.length === 0) {
    return true
  }

  return window.confirm(
    `${violations.length} element${
      violations.length === 1 ? " is" : "s are"
    } outside the safe area. Export anyway?`,
  )
}

export function AssetMainMenu({
  elements,
  files,
  backgroundColor,
  projectName,
  previewPlatform,
  selectedCount,
  canUndo,
  canRedo,
  onImportImage,
  onLoadDocument,
  onSaveDocument,
  onUndo,
  onRedo,
  onSelectAll,
  onDuplicateSelected,
  onDeleteSelected,
}: AssetMainMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const hasElements = elements.length > 0
  const hasSelection = selectedCount > 0
  const platformLabel = previewPlatform === "ios" ? "iOS" : "Android"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="asset-excalidraw-icon-button" aria-label="Open menu">
            <Menu aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="asset-dropdown-menu-content--asset">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/">
                <Home aria-hidden="true" />
                Home
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>File</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => imageInputRef.current?.click()}>
              <ImagePlus aria-hidden="true" />
              Import image
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSaveDocument}>
              <Save aria-hidden="true" />
              Save JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => documentInputRef.current?.click()}>
              <FolderOpen aria-hidden="true" />
              Load JSON
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={!hasElements}
              onSelect={() => {
                if (!confirmSafeAreaExport(elements)) {
                  return
                }

                exportPlatformPack(elements, files, backgroundColor, projectName, previewPlatform)
              }}
            >
              <Download aria-hidden="true" />
              Export {platformLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasElements}
              onSelect={() => {
                if (!confirmSafeAreaExport(elements)) {
                  return
                }

                exportAllPlatforms(elements, files, backgroundColor, projectName)
              }}
            >
              <Files aria-hidden="true" />
              Export all
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Edit</DropdownMenuLabel>
            <DropdownMenuItem disabled={!canUndo} onSelect={onUndo}>
              <Undo2 aria-hidden="true" />
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canRedo} onSelect={onRedo}>
              <Redo2 aria-hidden="true" />
              Redo
              <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasElements} onSelect={onSelectAll}>
              <Layers aria-hidden="true" />
              Select all
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasSelection} onSelect={onDuplicateSelected}>
              <CopyPlus aria-hidden="true" />
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasSelection}
              variant="destructive"
              onSelect={onDeleteSelected}
            >
              <Trash2 aria-hidden="true" />
              Delete
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
          event.currentTarget.value = ""
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
          event.currentTarget.value = ""
        }}
      />
    </>
  )
}

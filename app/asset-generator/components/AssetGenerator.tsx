'use client'

import { useCallback, useState } from 'react'
import {
  Circle,
  Diamond,
  MousePointer2,
  Square,
  Type,
} from 'lucide-react'
import { getElementAtPosition, getPrimarySelectedElement } from '../lib/element/selection'
import { useEditor } from '../lib/editor/useEditor'
import { AssetColorPicker } from './AssetColorPicker'
import { AssetCanvasContextMenu } from './AssetCanvasContextMenu'
import { AssetGeneratorLayout } from './AssetGeneratorLayout'
import { AssetMainMenu } from './AssetMainMenu'
import { DevicePreview } from './DevicePreview'
import { HistoryControls } from './HistoryControls'
import { StaticCanvas } from './canvases/StaticCanvas'

const tools = [
  { label: 'Select', icon: MousePointer2, type: 'selection' as const },
  { label: 'Text', icon: Type, type: 'text' as const },
  { label: 'Rectangle', icon: Square, type: 'rectangle' as const },
  { label: 'Diamond', icon: Diamond, type: 'diamond' as const },
  { label: 'Ellipse', icon: Circle, type: 'ellipse' as const },
]

const backgroundSwatches = ['#ffffff', '#f1f0ff', '#1b1b1f']
const fillSwatches = ['transparent', '#6965db', '#1b1b1f']
const strokeSwatches = ['#1b1b1f', '#6965db', '#e03131']

export function AssetGenerator() {
  const {
    appState,
    elements,
    files,
    canUndo,
    canRedo,
    setActiveTool,
    updateAppState,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onCanvasDoubleClick,
    onCanvasContextMenu,
    updateTextDraft,
    updateText,
    undoChange,
    redoChange,
    changeZOrder,
    saveDocument,
    loadDocument,
    importImage,
    deleteSelected,
    duplicateSelected,
    selectAll,
    updateSelectedElements,
  } = useEditor()

  const [contextMenuTarget, setContextMenuTarget] = useState<'canvas' | 'element'>('canvas')
  const selectedCount = Object.keys(appState.selectedElementIds).length
  const selectedElement = getPrimarySelectedElement(elements, appState.selectedElementIds)
  const fillValue = selectedElement?.backgroundColor ?? appState.currentItemBackgroundColor
  const strokeValue = selectedElement?.strokeColor ?? appState.currentItemStrokeColor
  const fontSize = Number.isFinite(selectedElement?.fontSize)
    ? selectedElement?.fontSize ?? 64
    : Number.isFinite(appState.currentItemFontSize)
    ? appState.currentItemFontSize
    : 64
  const selectionLabel =
    selectedCount > 1
      ? `${selectedCount} selected`
      : selectedElement
      ? selectedElement.type
      : 'None'
  const canShowFill = !selectedElement || selectedElement.type !== 'image'
  const canShowFontSize =
    !selectedElement ||
    selectedElement.type === 'text' ||
    (selectedCount > 1 && elements.some((element) => appState.selectedElementIds[element.id] && element.type === 'text'))

  const updateFill = useCallback((backgroundColor: string) => {
    if (selectedCount > 0) {
      updateSelectedElements({ backgroundColor })
      return
    }

    updateAppState({ currentItemBackgroundColor: backgroundColor })
  }, [selectedCount, updateAppState, updateSelectedElements])

  const updateStroke = useCallback((strokeColor: string) => {
    if (selectedCount > 0) {
      updateSelectedElements({ strokeColor })
      return
    }

    updateAppState({ currentItemStrokeColor: strokeColor })
  }, [selectedCount, updateAppState, updateSelectedElements])

  const updateFontSize = useCallback((nextFontSize: number) => {
    if (selectedCount > 0) {
      updateSelectedElements({ fontSize: nextFontSize })
      return
    }

    updateAppState({ currentItemFontSize: nextFontSize })
  }, [selectedCount, updateAppState, updateSelectedElements])

  const handleCanvasContextMenu = useCallback((x: number, y: number) => {
    const hit = getElementAtPosition(elements, x, y)
    setContextMenuTarget(hit ? 'element' : 'canvas')
    onCanvasContextMenu(x, y)
  }, [elements, onCanvasContextMenu])

  return (
    <AssetGeneratorLayout
      topLeft={
        <>
          <AssetMainMenu
            elements={elements}
            files={files}
            backgroundColor={appState.viewBackgroundColor}
            projectName={appState.projectName}
            previewPlatform={appState.previewPlatform}
            selectedCount={selectedCount}
            canUndo={canUndo}
            canRedo={canRedo}
            onImportImage={importImage}
            onLoadDocument={loadDocument}
            onSaveDocument={saveDocument}
            onUndo={undoChange}
            onRedo={redoChange}
            onSelectAll={selectAll}
            onDuplicateSelected={duplicateSelected}
            onDeleteSelected={deleteSelected}
          />
          <label className="asset-excalidraw-island asset-top-project-field">
            <input
              type="text"
              value={appState.projectName}
              onChange={(event) => updateAppState({ projectName: event.target.value })}
              placeholder="my-app"
              aria-label="Project name for export files"
            />
            <span>Project</span>
          </label>
        </>
      }
      toolbar={
        <div className="asset-excalidraw-island asset-excalidraw-toolbar">
          {tools.map(({ label, icon: Icon, type }) => (
            <button
              key={label}
              type="button"
              className={appState.activeTool.type === type ? 'is-active' : undefined}
              aria-label={label}
              aria-pressed={appState.activeTool.type === type}
              onClick={() => setActiveTool(type)}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>
      }
      topRight={
        <HistoryControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undoChange}
          onRedo={redoChange}
        />
      }
      sidebar={
        <>
          <AssetColorPicker
            label="Background"
            value={appState.viewBackgroundColor}
            colors={backgroundSwatches}
            onChange={(viewBackgroundColor) => updateAppState({ viewBackgroundColor })}
          />
          {canShowFill ? (
            <AssetColorPicker
              label="Fill"
              value={fillValue}
              colors={fillSwatches}
              allowTransparent
              onChange={updateFill}
            />
          ) : null}
          {selectedElement?.type !== 'image' ? (
            <AssetColorPicker
              label={selectedElement?.type === 'text' ? 'Text' : 'Stroke'}
              value={strokeValue}
              colors={strokeSwatches}
              onChange={updateStroke}
            />
          ) : null}
          {canShowFontSize ? (
            <label className="asset-excalidraw-sidebar-section asset-sidebar-input-field">
              <span>Font size</span>
              <input
                type="number"
                min={16}
                max={220}
                step={4}
                value={fontSize}
                onChange={(event) => {
                  const next = Math.min(220, Math.max(16, Number(event.target.value) || 16))
                  updateFontSize(next)
                }}
                aria-label="Font size for new text"
              />
            </label>
          ) : null}
        </>
      }
      statusBar={
        <>
          <span>
            Tool <strong>{appState.activeTool.type}</strong>
          </span>
          <span>
            Selection <strong>{selectionLabel}</strong>
          </span>
          <span>
            Elements <strong>{elements.length}</strong>
          </span>
        </>
      }
      preview={
        <DevicePreview
          elements={elements}
          files={files}
          backgroundColor={appState.viewBackgroundColor}
          platform={appState.previewPlatform}
          onPlatformChange={(previewPlatform) => updateAppState({ previewPlatform })}
        />
      }
      canvas={
        <AssetCanvasContextMenu
          target={contextMenuTarget}
          selectedCount={selectedCount}
          elements={elements}
          files={files}
          backgroundColor={appState.viewBackgroundColor}
          projectName={appState.projectName}
          previewPlatform={appState.previewPlatform}
          onImportImage={importImage}
          onLoadDocument={loadDocument}
          onSaveDocument={saveDocument}
          onSelectAll={selectAll}
          onDuplicateSelected={duplicateSelected}
          onDeleteSelected={deleteSelected}
          onBringForward={() => changeZOrder('forward')}
          onSendBackward={() => changeZOrder('backward')}
          onBringToFront={() => changeZOrder('front')}
          onSendToBack={() => changeZOrder('back')}
        >
          <StaticCanvas
            appState={appState}
            elements={elements}
            files={files}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onContextMenu={handleCanvasContextMenu}
            onDoubleClick={onCanvasDoubleClick}
            onTextChange={updateTextDraft}
            onTextCommit={updateText}
          />
        </AssetCanvasContextMenu>
      }
    />
  )
}

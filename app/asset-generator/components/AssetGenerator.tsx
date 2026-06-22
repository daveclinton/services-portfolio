'use client'

import Link from 'next/link'
import {
  Circle,
  Diamond,
  Menu,
  MousePointer2,
  Palette,
  Square,
  Type,
} from 'lucide-react'
import { getPrimarySelectedElement } from '../lib/element/selection'
import { useEditor } from '../lib/editor/useEditor'
import { AssetGeneratorLayout } from './AssetGeneratorLayout'
import { DevicePreview } from './DevicePreview'
import { ExportPanel } from './ExportPanel'
import { FilePanel } from './FilePanel'
import { HistoryControls } from './HistoryControls'
import { ImportImageButton } from './ImportImageButton'
import { LayerControls } from './LayerControls'
import { SafeAreaStatus } from './SafeAreaStatus'
import { StaticCanvas } from './canvases/StaticCanvas'

const tools = [
  { label: 'Select', icon: MousePointer2, type: 'selection' as const },
  { label: 'Text', icon: Type, type: 'text' as const },
  { label: 'Rectangle', icon: Square, type: 'rectangle' as const },
  { label: 'Diamond', icon: Diamond, type: 'diamond' as const },
  { label: 'Ellipse', icon: Circle, type: 'ellipse' as const },
]

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
    updateText,
    finishTextEditing,
    undoChange,
    redoChange,
    changeZOrder,
    saveDocument,
    loadDocument,
    importImage,
  } = useEditor()

  const selectedCount = Object.keys(appState.selectedElementIds).length
  const selectedElement = getPrimarySelectedElement(elements, appState.selectedElementIds)
  const selectionLabel =
    selectedCount > 1
      ? `${selectedCount} selected`
      : selectedElement
        ? selectedElement.type
        : 'None'

  return (
    <AssetGeneratorLayout
      topLeft={
        <>
          <Link href="/" className="asset-excalidraw-icon-button" aria-label="Back to home">
            <Menu aria-hidden="true" />
          </Link>
          <label className="asset-excalidraw-island asset-excalidraw-properties">
            <span>Background</span>
            <input
              type="color"
              value={appState.viewBackgroundColor}
              onChange={(event) =>
                updateAppState({ viewBackgroundColor: event.target.value })
              }
              aria-label="Canvas background color"
            />
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
        <>
          <HistoryControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoChange}
            onRedo={redoChange}
          />
          <label className="asset-excalidraw-icon-button" aria-label="Stroke color">
            <Palette aria-hidden="true" />
            <input
              type="color"
              value={appState.currentItemStrokeColor}
              onChange={(event) =>
                updateAppState({ currentItemStrokeColor: event.target.value })
              }
              className="asset-excalidraw-color-input"
            />
          </label>
        </>
      }
      sidebar={
        <>
          <SafeAreaStatus elements={elements} />
          <div className="asset-excalidraw-sidebar-section">
            <span>Active tool</span>
            <strong>{appState.activeTool.type}</strong>
          </div>
          <div className="asset-excalidraw-sidebar-section">
            <span>Selection</span>
            <strong>{selectionLabel}</strong>
            {selectedCount > 1 ? <small>Shift+click to add or remove</small> : null}
          </div>
          <div className="asset-excalidraw-sidebar-section">
            <span>Elements</span>
            <strong>{elements.length}</strong>
          </div>
          {selectedElement ? (
            <LayerControls
              onBringForward={() => changeZOrder('forward')}
              onSendBackward={() => changeZOrder('backward')}
              onBringToFront={() => changeZOrder('front')}
              onSendToBack={() => changeZOrder('back')}
            />
          ) : null}
          <label className="asset-excalidraw-sidebar-section asset-excalidraw-color-field">
            <span>Fill</span>
            <input
              type="color"
              value={appState.currentItemBackgroundColor}
              onChange={(event) =>
                updateAppState({ currentItemBackgroundColor: event.target.value })
              }
              aria-label="Fill color"
            />
          </label>
          <div className="asset-export-actions">
            <ImportImageButton onImport={importImage} />
          </div>
          <FilePanel onSave={saveDocument} onLoad={loadDocument} />
          <ExportPanel
            elements={elements}
            files={files}
            backgroundColor={appState.viewBackgroundColor}
            projectName={appState.projectName}
            previewPlatform={appState.previewPlatform}
            onProjectNameChange={(projectName) => updateAppState({ projectName })}
          />
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
        <StaticCanvas
          appState={appState}
          elements={elements}
          files={files}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onCanvasDoubleClick}
          onTextCommit={updateText}
          onTextCancel={finishTextEditing}
        />
      }
    />
  )
}
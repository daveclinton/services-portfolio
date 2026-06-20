'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { defaults, fontOptions } from '../constants'
import { getTextSizeOption, updateIconLayer, updateLayerById } from '../document'
import { documentsEqual } from '../lib/document-history'
import {
  getPrimarySelectedLayer,
  getPropertiesStyleDomain,
  getStrokeFillLayer,
} from '../lib/style-domain'

import type { AssetDocument, DesignLayer, FontKey, FontWeight, ShapeStrokeStyle, TextSizeKey } from '../types'
import { getFontFamily } from '../utils/text'
import { CanvasBackgroundSection } from './CanvasBackgroundSection'
import { ColorPickerSidePanel, getColorPickerLabel } from './ColorPickerSidePanel'
import type { ColorPickerTarget } from './ColorSwatchPicker'
import { EditorPropertiesPanel } from './EditorPropertiesPanel'

type PropertiesPanelProps = {
  document: AssetDocument
  selectedLayerIds: DesignLayer['id'][]
  isMobile: boolean
  cloneDocument: (document: AssetDocument) => AssetDocument
  setDocument: (document: AssetDocument | ((current: AssetDocument) => AssetDocument)) => void
  commitHistory: (before: AssetDocument, after?: AssetDocument) => void
  onEditText: (layerId: Extract<DesignLayer, { type: 'text' }>['id']) => void
}

export function PropertiesPanel({
  document,
  selectedLayerIds,
  isMobile,
  cloneDocument,
  setDocument,
  commitHistory,
  onEditText,
}: PropertiesPanelProps) {
  const design = document.icon
  const [openColorPicker, setOpenColorPicker] = useState<ColorPickerTarget | null>(null)
  const [isMobilePropertiesOpen, setIsMobilePropertiesOpen] = useState(false)
  const [fontSearch, setFontSearch] = useState('')
  const [hoveredFontKey, setHoveredFontKey] = useState<FontKey | null>(null)

  const colorPickerPanelRef = useRef<HTMLDivElement>(null)
  const backgroundColorPickerRef = useRef<HTMLDivElement>(null)
  const textColorPickerRef = useRef<HTMLDivElement>(null)
  const shapeStrokeColorPickerRef = useRef<HTMLDivElement>(null)
  const shapeFillColorPickerRef = useRef<HTMLDivElement>(null)
  const backgroundColorPickerTriggerRef = useRef<HTMLButtonElement>(null)
  const textColorPickerTriggerRef = useRef<HTMLButtonElement>(null)
  const shapeStrokeColorPickerTriggerRef = useRef<HTMLButtonElement>(null)
  const shapeFillColorPickerTriggerRef = useRef<HTMLButtonElement>(null)

  const elementSelectedLayerIds = selectedLayerIds.filter((layerId) => layerId !== 'background')
  const isBackgroundSelected = elementSelectedLayerIds.length === 0
  const primaryLayer = getPrimarySelectedLayer(design, elementSelectedLayerIds)
  const elementStyleDomain = getPropertiesStyleDomain(design, elementSelectedLayerIds)
  const showElementProperties = elementStyleDomain !== 'canvas'
  const strokeFillLayer = primaryLayer ? getStrokeFillLayer(primaryLayer) : null

  const backgroundLayer = design.layers.find(
    (layer): layer is Extract<DesignLayer, { type: 'background' }> => layer.type === 'background',
  )
  const textLayer = primaryLayer?.type === 'text' ? primaryLayer : null
  const rectangleLayer = primaryLayer?.type === 'rectangle' ? primaryLayer : null

  const applyUpdate = useCallback(
    (updater: (current: AssetDocument) => AssetDocument) => {
      const before = cloneDocument(document)
      const after = updater(before)
      if (!documentsEqual(before, after)) {
        setDocument(after)
        commitHistory(before, after)
      }
    },
    [cloneDocument, commitHistory, document, setDocument],
  )

  const updateSelectedLayer = useCallback(
    (updater: (layer: DesignLayer) => DesignLayer) => {
      if (!primaryLayer) return
      applyUpdate((current) => updateLayerById(current, primaryLayer.id, updater))
    },
    [applyUpdate, primaryLayer],
  )

  useEffect(() => {
    setOpenColorPicker(null)
    setFontSearch('')
    setIsMobilePropertiesOpen(false)
  }, [selectedLayerIds.join(',')])

  const colorPickerTriggerRef =
    openColorPicker === 'bg'
      ? backgroundColorPickerTriggerRef
      : openColorPicker === 'fg'
        ? textColorPickerTriggerRef
        : openColorPicker === 'shapeStroke'
          ? shapeStrokeColorPickerTriggerRef
          : openColorPicker === 'shapeFill'
            ? shapeFillColorPickerTriggerRef
            : null

  useEffect(() => {
    if (!openColorPicker) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (colorPickerPanelRef.current?.contains(target)) return

      const container =
        openColorPicker === 'bg'
          ? backgroundColorPickerRef.current
          : openColorPicker === 'fg'
            ? textColorPickerRef.current
            : openColorPicker === 'shapeStroke'
              ? shapeStrokeColorPickerRef.current
              : shapeFillColorPickerRef.current

      if (container?.contains(target)) return
      setOpenColorPicker(null)
    }

    globalThis.document.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.document.removeEventListener('pointerdown', onPointerDown)
  }, [openColorPicker])

  const fontQuery = fontSearch.trim().toLowerCase()
  const filteredFontOptions = fontOptions.filter((font) => font.label.toLowerCase().includes(fontQuery))
  const sceneFontKeys = new Set(
    design.layers
      .filter((layer): layer is Extract<DesignLayer, { type: 'text' }> => layer.type === 'text')
      .map((layer) => layer.fontKey),
  )
  const filteredSceneFonts = filteredFontOptions.filter((font) => sceneFontKeys.has(font.key))
  const filteredAvailableFonts = filteredFontOptions.filter((font) => !sceneFontKeys.has(font.key))

  const canvasBackgroundSection = (
    <CanvasBackgroundSection
      backgroundColor={backgroundLayer?.color ?? defaults.backgroundColor}
      backgroundOpacityValue={Math.round((backgroundLayer?.opacity ?? 1) * 100)}
      isOpen={openColorPicker === 'bg'}
      isSelected={isBackgroundSelected}
      containerRef={backgroundColorPickerRef}
      triggerRef={backgroundColorPickerTriggerRef}
      onToggle={() => setOpenColorPicker(openColorPicker === 'bg' ? null : 'bg')}
      onColorChange={(color) =>
        applyUpdate((current) => updateIconLayer(current, 'background', (layer) => ({ ...layer, color })))
      }
      onOpacityChange={(opacity) => {
        const nextOpacity = Math.min(100, Math.max(0, Number.isFinite(opacity) ? opacity : 100)) / 100
        applyUpdate((current) =>
          updateIconLayer(current, 'background', (layer) => ({ ...layer, opacity: nextOpacity })),
        )
      }}
    />
  )

  const elementPropertiesPanel = showElementProperties ? (
    <EditorPropertiesPanel
      styleDomain={elementStyleDomain}
      textColor={textLayer?.color ?? defaults.textColor}
      textColorOpacityValue={Math.round((textLayer?.colorOpacity ?? 1) * 100)}
      textOpacityValue={Math.round((textLayer?.opacity ?? 1) * 100)}
      fontKey={textLayer?.fontKey ?? defaults.font}
      fontWeight={textLayer?.fontWeight ?? defaults.fontWeight}
      textSize={textLayer?.textSize ?? defaults.textSize}
      textAlign={textLayer?.textAlign ?? defaults.textAlign}
      textVerticalAlign={textLayer?.verticalAlign ?? defaults.textVerticalAlign}
      strokeFillLayer={strokeFillLayer}
      strokeColor={strokeFillLayer?.strokeColor ?? '#4440bf'}
      fillColor={strokeFillLayer?.backgroundColor ?? 'transparent'}
      strokeFillOpacityValue={Math.round((strokeFillLayer?.opacity ?? 1) * 100)}
      openColorPicker={openColorPicker === 'bg' ? null : openColorPicker}
      fontSearch={fontSearch}
      hoveredFontKey={hoveredFontKey}
      filteredSceneFonts={filteredSceneFonts}
      filteredAvailableFonts={filteredAvailableFonts}
      filteredFontOptions={filteredFontOptions}
      textColorPickerRef={textColorPickerRef}
      shapeStrokeColorPickerRef={shapeStrokeColorPickerRef}
      shapeFillColorPickerRef={shapeFillColorPickerRef}
      textColorPickerTriggerRef={textColorPickerTriggerRef}
      shapeStrokeColorPickerTriggerRef={shapeStrokeColorPickerTriggerRef}
      shapeFillColorPickerTriggerRef={shapeFillColorPickerTriggerRef}
      onToggleColorPicker={(target) => setOpenColorPicker(openColorPicker === target ? null : target)}
      onTextColorChange={(color) => {
        if (!textLayer) return
        updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, color } : layer))
      }}
      onStrokeColorChange={(color) => {
        if (!strokeFillLayer) return
        updateSelectedLayer((layer) =>
          layer.id === strokeFillLayer.id ? { ...layer, strokeColor: color } : layer,
        )
      }}
      onFillColorChange={(color) => {
        if (!strokeFillLayer) return
        updateSelectedLayer((layer) =>
          layer.id === strokeFillLayer.id ? { ...layer, backgroundColor: color } : layer,
        )
      }}
      onFontSearchChange={(value) => {
        setFontSearch(value)
        const nextQuery = value.trim().toLowerCase()
        const nextFont = fontOptions.find((font) => font.label.toLowerCase().includes(nextQuery))
        setHoveredFontKey(nextFont?.key ?? null)
      }}
      onHoverFont={setHoveredFontKey}
      onSelectFont={(key) => {
        if (!textLayer) return
        updateSelectedLayer((layer) =>
          layer.type === 'text'
            ? { ...layer, fontKey: key, fontFamily: getFontFamily(key) }
            : layer,
        )
      }}
      onSelectWeight={(weight: FontWeight) => {
        if (!textLayer) return
        updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, fontWeight: weight } : layer))
      }}
      onSelectTextSize={(size: TextSizeKey) => {
        if (!textLayer) return
        const option = getTextSizeOption(size)
        updateSelectedLayer((layer) =>
          layer.type === 'text' ? { ...layer, textSize: size, maxFontSize: option.maxFontSize } : layer,
        )
      }}
      onSelectTextAlign={(align) => {
        if (!textLayer) return
        updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, textAlign: align } : layer))
      }}
      onSelectTextVerticalAlign={(align) => {
        if (!textLayer) return
        updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, verticalAlign: align } : layer))
      }}
      onSelectTextOpacity={(opacity) => {
        if (!textLayer) return
        const nextOpacity = Math.min(100, Math.max(0, Number.isFinite(opacity) ? opacity : 100)) / 100
        updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, opacity: nextOpacity } : layer))
      }}
      onEditText={() => {
        if (textLayer) onEditText(textLayer.id)
      }}
      isRectangleSelected={Boolean(rectangleLayer)}
      shapeStrokeWidth={rectangleLayer?.strokeWidth ?? 2}
      shapeStrokeStyle={rectangleLayer?.strokeStyle ?? 'solid'}
      shapeCornerRadius={
        typeof rectangleLayer?.cornerRadius === 'number' ? rectangleLayer.cornerRadius : 0
      }
      onSelectShapeStrokeWidth={(width) => {
        if (!rectangleLayer) return
        updateSelectedLayer((layer) =>
          layer.type === 'rectangle' ? { ...layer, strokeWidth: width } : layer,
        )
      }}
      onSelectShapeStrokeStyle={(style: ShapeStrokeStyle) => {
        if (!rectangleLayer) return
        updateSelectedLayer((layer) =>
          layer.type === 'rectangle' ? { ...layer, strokeStyle: style } : layer,
        )
      }}
      onSelectShapeCornerRadius={(radius) => {
        if (!rectangleLayer) return
        updateSelectedLayer((layer) =>
          layer.type === 'rectangle' ? { ...layer, cornerRadius: radius } : layer,
        )
      }}
    />
  ) : null

  const panel = (
    <div className="layer-ui__properties-stack">
      <div
        className={`Island App-menu__left canvas-background-island${isBackgroundSelected ? ' is-selected' : ''}`}
        style={{ '--padding': 2 } as CSSProperties}
      >
        {canvasBackgroundSection}
      </div>
      {elementPropertiesPanel ? (
        <div className="selected-shape-actions-container zen-mode-transition">
          <div className="Island App-menu__left" style={{ '--padding': 2 } as CSSProperties}>
            {elementPropertiesPanel}
          </div>
        </div>
      ) : null}
    </div>
  )

  const colorPickerValue = useMemo(() => {
    if (openColorPicker === 'bg') return backgroundLayer?.color ?? defaults.backgroundColor
    if (openColorPicker === 'fg') return textLayer?.color ?? defaults.textColor
    if (openColorPicker === 'shapeStroke') return strokeFillLayer?.strokeColor ?? '#4440bf'
    if (openColorPicker === 'shapeFill') {
      const fill = strokeFillLayer?.backgroundColor ?? 'transparent'
      return fill === 'transparent' ? '#ffffff' : fill
    }
    return '#000000'
  }, [backgroundLayer, openColorPicker, strokeFillLayer, textLayer])

  const colorPickerOpacity = useMemo(() => {
    if (openColorPicker === 'bg') return Math.round((backgroundLayer?.opacity ?? 1) * 100)
    if (openColorPicker === 'fg') return Math.round((textLayer?.colorOpacity ?? 1) * 100)
    if (openColorPicker === 'shapeFill' && strokeFillLayer?.backgroundColor === 'transparent') return 0
    if (openColorPicker === 'shapeStroke' || openColorPicker === 'shapeFill') {
      return Math.round((strokeFillLayer?.opacity ?? 1) * 100)
    }
    return 100
  }, [backgroundLayer, openColorPicker, strokeFillLayer, textLayer])

  return (
    <>
      {!isMobile ? panel : null}

      {isMobile ? (
        <>
          {isMobilePropertiesOpen ? (
            <div
              className="asset-generator-mobile-properties-backdrop"
              aria-hidden="true"
              onClick={() => setIsMobilePropertiesOpen(false)}
            />
          ) : null}
          <div
            className={`asset-generator-mobile-properties-sheet ${isMobilePropertiesOpen ? 'is-open' : ''}`}
            role={isMobilePropertiesOpen ? 'dialog' : undefined}
            aria-label={isMobilePropertiesOpen ? 'Element properties' : undefined}
            aria-hidden={!isMobilePropertiesOpen}
          >
            <div className="asset-generator-mobile-properties-sheet__header">
              <span>Properties</span>
              <button
                type="button"
                className="asset-generator-mobile-properties-sheet__close"
                aria-label="Close properties"
                onClick={() => setIsMobilePropertiesOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="Island App-menu__left asset-generator-mobile-properties-sheet__body">
              {panel}
            </div>
          </div>

          <div className="asset-generator-bottom-bar">
            <div className="asset-generator-mobile-shape-actions">
              <button
                type="button"
                className={`compact-action-button properties-trigger ${isMobilePropertiesOpen ? 'active' : ''}`}
                aria-label="Show properties"
                aria-expanded={isMobilePropertiesOpen}
                title="Properties"
                onClick={() => setIsMobilePropertiesOpen((open) => !open)}
              >
                <SlidersHorizontal aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      ) : null}

      {openColorPicker && colorPickerTriggerRef ? (
        <ColorPickerSidePanel
          target={openColorPicker}
          label={getColorPickerLabel(openColorPicker)}
          value={colorPickerValue}
          opacity={colorPickerOpacity}
          isOpen
          isMobile={isMobile}
          anchorRef={colorPickerTriggerRef}
          panelRef={colorPickerPanelRef}
          onClose={() => setOpenColorPicker(null)}
          onChange={(color) => {
            if (openColorPicker === 'bg') {
              applyUpdate((current) => updateIconLayer(current, 'background', (layer) => ({ ...layer, color })))
              return
            }
            if (openColorPicker === 'fg' && textLayer) {
              updateSelectedLayer((layer) => (layer.type === 'text' ? { ...layer, color } : layer))
              return
            }
            if (openColorPicker === 'shapeStroke' && strokeFillLayer) {
              updateSelectedLayer((layer) =>
                layer.id === strokeFillLayer.id ? { ...layer, strokeColor: color } : layer,
              )
              return
            }
            if (openColorPicker === 'shapeFill' && strokeFillLayer) {
              updateSelectedLayer((layer) =>
                layer.id === strokeFillLayer.id ? { ...layer, backgroundColor: color } : layer,
              )
            }
          }}
          onOpacityChange={(opacity) => {
            if (openColorPicker === 'bg') {
              applyUpdate((current) =>
                updateIconLayer(current, 'background', (layer) => ({ ...layer, opacity: opacity / 100 })),
              )
              return
            }
            if (openColorPicker === 'fg' && textLayer) {
              updateSelectedLayer((layer) =>
                layer.type === 'text' ? { ...layer, colorOpacity: opacity / 100 } : layer,
              )
              return
            }
            if (!strokeFillLayer) return
            updateSelectedLayer((layer) => {
              if (layer.id !== strokeFillLayer.id) return layer
              if (openColorPicker === 'shapeFill' && opacity === 0) {
                return { ...layer, backgroundColor: 'transparent', opacity: 0 }
              }
              return {
                ...layer,
                backgroundColor:
                  openColorPicker === 'shapeFill' && layer.backgroundColor === 'transparent'
                    ? '#ffffff'
                    : layer.backgroundColor,
                opacity: opacity / 100,
              }
            })
          }}
        />
      ) : null}
    </>
  )
}
import { useMemo } from 'react'
import type { AssetDocument, EditorState } from '../types'
import { getBackgroundLayer, getTextLayer as getDocumentTextLayer } from '../document'
import { getTextSizeOption, getDefaultAssetDocument } from '../document'
import { getColorWithOpacity } from '../utils/'
import { fontOptions, defaults } from '../constants'

export function useDerivedState(document: AssetDocument, editorState: EditorState) {
  const backgroundLayer = getBackgroundLayer(document)
  const textLayer = getDocumentTextLayer(document)
  const design = document.icon
  const platform = editorState.platform
  const activeTool = editorState.activeTool
  const selectedLayerId = editorState.selectedLayerId
  const isPreviewOpen = editorState.previewOpen

  const text = textLayer.text
  const backgroundColor = backgroundLayer.color
  const textColor = textLayer.color
  const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerId) ?? backgroundLayer
  const selectedShapeLayer =
    selectedLayer.type === 'rectangle' || selectedLayer.type === 'diamond' || selectedLayer.type === 'ellipse' ? selectedLayer : null

  const shapeStrokeColor = selectedShapeLayer?.strokeColor ?? '#1e1e1e'
  const shapeFillColor = selectedShapeLayer?.backgroundColor ?? 'transparent'
  const shapeOpacityValue = Math.round((selectedShapeLayer?.opacity ?? 1) * 100)

  const splashBackgroundColor = document.preview.splashBackgroundColor
  const fontKey = textLayer.fontKey
  const fontFamily = textLayer.fontFamily
  const fontWeight = textLayer.fontWeight
  const textSize = textLayer.textSize
  const textAlign = textLayer.textAlign
  const textVerticalAlign = textLayer.verticalAlign

  const backgroundOpacityValue = Math.round(backgroundLayer.opacity * 100)
  const textColorOpacityValue = Math.round(textLayer.colorOpacity * 100)
  const splashBackgroundOpacityValue = Math.round(document.preview.splashBackgroundOpacity * 100)
  const textOpacityValue = Math.round(textLayer.opacity * 100)
  const textColorOpacity = textLayer.colorOpacity
  const textOpacity = textLayer.opacity

  const splashPreviewBackground = useMemo(
    () =>
      getColorWithOpacity(
        splashBackgroundColor,
        document.preview.splashBackgroundOpacity,
        defaults.splashBackgroundColor,
      ),
    [splashBackgroundColor, document.preview.splashBackgroundOpacity],
  )

  const textSizeOption = useMemo(() => getTextSizeOption(textSize), [textSize])
  const textPosition = useMemo(() => ({ x: textLayer.x, y: textLayer.y }), [textLayer.x, textLayer.y])

  const quickFontOptions = useMemo(() => fontOptions.filter((font) => ['rounded', 'sans', 'mono'].includes(font.key)), [])
  const sceneFontOptions = useMemo(() => fontOptions.filter((font) => ['rounded', 'sans', 'mono'].includes(font.key)), [])
  const availableFontOptions = useMemo(() => fontOptions.filter((font) => !['rounded', 'sans', 'mono'].includes(font.key)), [])

  return {
    backgroundLayer,
    textLayer,
    design,
    platform,
    activeTool,
    selectedLayerId,
    isPreviewOpen,
    text,
    backgroundColor,
    textColor,
    selectedLayer,
    selectedShapeLayer,
    shapeStrokeColor,
    shapeFillColor,
    shapeOpacityValue,
    splashBackgroundColor,
    fontKey,
    fontFamily,
    fontWeight,
    textSize,
    textAlign,
    textVerticalAlign,
    backgroundOpacityValue,
    textColorOpacityValue,
    splashBackgroundOpacityValue,
    textOpacityValue,
    textColorOpacity,
    textOpacity,
    splashPreviewBackground,
    textSizeOption,
    textPosition,
    quickFontOptions,
    sceneFontOptions,
    availableFontOptions,
  }
}

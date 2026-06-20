import { defaults, masterSize, textSizeOptions } from './constants'
import type { AssetDocument, DesignLayer, ShapeLayer, ShapeType, TextLayer, TextSizeKey } from './types'
import { isResizableLayer } from './lib/resize-handles'
import { getFontFamily } from './utils/'

export function parseOpacityPercent(value: string, fallback: string) {
  const parsed = Number.parseInt(value, 10)
  const fallbackValue = Number.parseInt(fallback, 10)
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : fallbackValue))
}

export function getTextSizeOption(textSize: TextSizeKey) {
  return textSizeOptions.find((option) => option.key === textSize) ?? textSizeOptions[1]
}

export function getDefaultAssetDocument(): AssetDocument {
  const textSize = defaults.textSize
  const textSizeOption = getTextSizeOption(textSize)

  return {
    version: 1,
    icon: {
      layers: [
        {
          id: 'background',
          type: 'background',
          color: defaults.backgroundColor,
          opacity: parseOpacityPercent(defaults.backgroundOpacity, '100') / 100,
        },
        {
          id: 'text',
          type: 'text',
          text: defaults.text,
          color: defaults.textColor,
          colorOpacity: parseOpacityPercent(defaults.textColorOpacity, '100') / 100,
          fontFamily: getFontFamily(defaults.font),
          fontKey: defaults.font,
          fontWeight: defaults.fontWeight,
          fontStyle: 'normal',
          underline: false,
          textAlign: defaults.textAlign,
          verticalAlign: defaults.textVerticalAlign,
          textSize,
          opacity: parseOpacityPercent(defaults.textOpacity, '100') / 100,
          x: masterSize / 2,
          y: masterSize / 2,
          maxWidth: masterSize * 0.72,
          maxFontSize: textSizeOption.maxFontSize,
        },
      ],
    },
    preview: {
      splashBackgroundColor: defaults.splashBackgroundColor,
      splashBackgroundOpacity: parseOpacityPercent(defaults.splashBackgroundOpacity, '100') / 100,
    },
  }
}

type LayerById<TLayerId extends DesignLayer['id']> = Extract<DesignLayer, { id: TLayerId }>

export function updateIconLayer<TLayerId extends DesignLayer['id']>(
  document: AssetDocument,
  layerId: TLayerId,
  updater: (layer: LayerById<TLayerId>) => LayerById<TLayerId>,
): AssetDocument {
  return {
    ...document,
    icon: {
      layers: document.icon.layers.map((layer) =>
        layer.id === layerId ? updater(layer as LayerById<TLayerId>) : layer,
      ),
    },
  }
}

export function createShapeLayer(
  type: ShapeType,
  rect: { x: number; y: number; width: number; height: number },
): ShapeLayer {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 100000)}`

  return {
    id: `shape-${id}`,
    type,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    strokeColor: '#4440bf',
    backgroundColor: type === 'rectangle' ? '#e0dfff' : 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    opacity: 1,
    roughness: 0,
    cornerRadius: type === 'rectangle' ? 16 : 0,
    rotation: 0,
  }
}

export function addIconLayer(document: AssetDocument, layer: DesignLayer): AssetDocument {
  const backgroundLayers = document.icon.layers.filter((candidate) => candidate.type === 'background')
  const textLayers = document.icon.layers.filter((candidate) => candidate.type === 'text')
  const drawableLayers = document.icon.layers.filter(
    (candidate) => candidate.type !== 'background' && candidate.type !== 'text',
  )

  return {
    ...document,
    icon: {
      layers: [...backgroundLayers, ...drawableLayers, layer, ...textLayers],
    },
  }
}

export function resizeLayerInDocument(
  document: AssetDocument,
  layerId: DesignLayer['id'],
  rect: { x: number; y: number; width: number; height: number },
): AssetDocument {
  return updateLayerById(document, layerId, (layer) => {
    if (!isResizableLayer(layer)) return layer
    return {
      ...layer,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  })
}

export function updateLayerById(
  document: AssetDocument,
  layerId: DesignLayer['id'],
  updater: (layer: DesignLayer) => DesignLayer,
): AssetDocument {
  return {
    ...document,
    icon: {
      layers: document.icon.layers.map((layer) => (layer.id === layerId ? updater(layer) : layer)),
    },
  }
}

const TEXT_LAYER_MARGIN = 96

function clampTextLayerPoint(point: { x: number; y: number }) {
  return {
    x: Math.min(masterSize - TEXT_LAYER_MARGIN, Math.max(TEXT_LAYER_MARGIN, point.x)),
    y: Math.min(masterSize - TEXT_LAYER_MARGIN, Math.max(TEXT_LAYER_MARGIN, point.y)),
  }
}

export function getTextLayer(document: AssetDocument): TextLayer | undefined {
  return document.icon.layers.find((layer): layer is TextLayer => layer.type === 'text')
}

export function createDefaultTextLayer(point: { x: number; y: number }): TextLayer {
  const textSize = defaults.textSize
  const textSizeOption = getTextSizeOption(textSize)
  const clampedPoint = clampTextLayerPoint(point)

  return {
    id: 'text',
    type: 'text',
    text: '',
    color: defaults.textColor,
    colorOpacity: parseOpacityPercent(defaults.textColorOpacity, '100') / 100,
    fontFamily: getFontFamily(defaults.font),
    fontKey: defaults.font,
    fontWeight: defaults.fontWeight,
    fontStyle: 'normal',
    underline: false,
    textAlign: defaults.textAlign,
    verticalAlign: defaults.textVerticalAlign,
    textSize,
    opacity: parseOpacityPercent(defaults.textOpacity, '100') / 100,
    x: clampedPoint.x,
    y: clampedPoint.y,
    maxWidth: masterSize * 0.72,
    maxFontSize: textSizeOption.maxFontSize,
  }
}

export function ensureTextLayerAtPoint(
  document: AssetDocument,
  point: { x: number; y: number },
): { document: AssetDocument; layerId: TextLayer['id']; created: boolean } {
  const clampedPoint = clampTextLayerPoint(point)
  const existing = getTextLayer(document)

  if (existing) {
    return {
      document: updateIconLayer(document, 'text', (layer) => ({
        ...layer,
        x: clampedPoint.x,
        y: clampedPoint.y,
      })),
      layerId: 'text',
      created: false,
    }
  }

  return {
    document: addIconLayer(document, createDefaultTextLayer(clampedPoint)),
    layerId: 'text',
    created: true,
  }
}

export function updateTextLayerContent(document: AssetDocument, text: string): AssetDocument {
  return updateIconLayer(document, 'text', (layer) => ({ ...layer, text }))
}

export function removeIconLayers(
  document: AssetDocument,
  layerIds: DesignLayer['id'][],
): AssetDocument {
  const idsToRemove = new Set(layerIds.filter((layerId) => layerId !== 'background'))
  if (idsToRemove.size === 0) return document

  return {
    ...document,
    icon: {
      layers: document.icon.layers.filter((layer) => !idsToRemove.has(layer.id)),
    },
  }
}
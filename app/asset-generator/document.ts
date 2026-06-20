import { APP_ICON_SAFE_AREA_SIZE, defaults, masterSize, textSizeOptions } from './constants'
import { clampPointToAppIconContent } from './lib/app-icon-bounds'
import { isResizableLayer } from './lib/resize-handles'
import type { AssetDocument, DesignLayer, ShapeLayer, ShapeType, TextLayer, TextSizeKey } from './types'
import { getFontFamily } from './utils/'

export function parseOpacityPercent(value: string, fallback: string) {
  const parsed = Number.parseInt(value, 10)
  const fallbackValue = Number.parseInt(fallback, 10)
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : fallbackValue))
}

export function getTextSizeOption(textSize: TextSizeKey) {
  return textSizeOptions.find((option) => option.key === textSize) ?? textSizeOptions[1]
}

function createTextLayerId(): TextLayer['id'] {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 100000)}`

  return `text-${id}`
}

export function getDefaultAssetDocument(): AssetDocument {
  const defaultTextLayer = createTextLayer(
    { x: masterSize / 2, y: masterSize / 2 },
    { text: defaults.text },
  )

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
        defaultTextLayer,
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

  if (layer.type === 'text') {
    return {
      ...document,
      icon: {
        layers: [...backgroundLayers, ...drawableLayers, ...textLayers, layer],
      },
    }
  }

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

export function resizeTextLayerInDocument(
  document: AssetDocument,
  layerId: TextLayer['id'],
  layer: TextLayer,
): AssetDocument {
  return updateLayerById(document, layerId, () => layer)
}

export function rotateTextLayerInDocument(
  document: AssetDocument,
  layerId: TextLayer['id'],
  rotation: number,
): AssetDocument {
  return updateIconLayer(document, layerId, (layer) => ({
    ...layer,
    rotation,
  }))
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

function clampTextLayerPoint(point: { x: number; y: number }) {
  return clampPointToAppIconContent(point)
}

export function getTextLayerById(
  document: AssetDocument,
  layerId: TextLayer['id'],
): TextLayer | undefined {
  const layer = document.icon.layers.find((candidate) => candidate.id === layerId)
  return layer?.type === 'text' ? layer : undefined
}

export function createTextLayer(
  point: { x: number; y: number },
  overrides: Partial<Pick<TextLayer, 'text' | 'maxWidth' | 'autoResize' | 'textAlign' | 'verticalAlign'>> = {},
): TextLayer {
  const textSize = defaults.textSize
  const textSizeOption = getTextSizeOption(textSize)
  const clampedPoint = clampTextLayerPoint(point)
  const autoResize = overrides.autoResize ?? true

  return {
    id: createTextLayerId(),
    type: 'text',
    text: overrides.text ?? '',
    color: defaults.textColor,
    colorOpacity: parseOpacityPercent(defaults.textColorOpacity, '100') / 100,
    fontFamily: getFontFamily(defaults.font),
    fontKey: defaults.font,
    fontWeight: defaults.fontWeight,
    fontStyle: 'normal',
    underline: false,
    textAlign: overrides.textAlign ?? defaults.textAlign,
    verticalAlign: overrides.verticalAlign ?? defaults.textVerticalAlign,
    textSize,
    opacity: parseOpacityPercent(defaults.textOpacity, '100') / 100,
    x: clampedPoint.x,
    y: clampedPoint.y,
    maxWidth: overrides.maxWidth ?? APP_ICON_SAFE_AREA_SIZE,
    maxFontSize: textSizeOption.maxFontSize,
    autoResize,
  }
}

/** Excalidraw click-to-type: cursor becomes vertical center of first line. */
export function createTextLayerAtClick(point: { x: number; y: number }): TextLayer {
  return createTextLayer(point, {
    text: '',
    autoResize: true,
    textAlign: defaults.textAlign,
    verticalAlign: defaults.textVerticalAlign,
  })
}

/** Excalidraw drag-to-draw: top edge locked to origin, width from drag. */
export function createTextLayerFromBox(
  rect: { x: number; y: number; width: number; height: number },
  options: { autoResize: boolean },
): TextLayer {
  const textSize = defaults.textSize
  const textSizeOption = getTextSizeOption(textSize)
  const lineHeight = textSizeOption.maxFontSize * 0.92
  const centerX = rect.x + rect.width / 2
  const centerY = options.autoResize
    ? rect.y + Math.max(rect.height, lineHeight) / 2
    : rect.y + lineHeight / 2

  return createTextLayer(
    { x: centerX, y: centerY },
    {
      text: '',
      maxWidth: options.autoResize ? APP_ICON_SAFE_AREA_SIZE : rect.width,
      autoResize: options.autoResize,
      textAlign: options.autoResize ? defaults.textAlign : 'left',
      verticalAlign: options.autoResize ? defaults.textVerticalAlign : 'top',
    },
  )
}

export function updateTextLayerContent(
  document: AssetDocument,
  layerId: TextLayer['id'],
  text: string,
): AssetDocument {
  return updateIconLayer(document, layerId, (layer) => ({ ...layer, text }))
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
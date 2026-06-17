import { defaults, masterSize, textSizeOptions } from './constants'
import type {
  AssetDocument,
  BackgroundLayer,
  DesignLayer,
  EditorState,
  FrameLayer,
  FontKey,
  FontWeight,
  ShapeLayer,
  ShapeType,
  TextAlign,
  TextLayer,
  TextSizeKey,
  TextVerticalAlign,
} from './types'
import { getFontFamily, getValidColor } from './utils'

type QuerySettings = {
  text: string
  bg: string
  bgOpacity: string
  fg: string
  fgOpacity: string
  splashBg: string
  splashOpacity: string
  font: FontKey
  weight: FontWeight
  textSize: TextSizeKey
  align: TextAlign
  valign: TextVerticalAlign
  opacity: string
  platform: EditorState['platform']
  tool: EditorState['activeTool']
  preview: 'open' | 'closed'
}

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

export function createAssetDocumentFromSettings(settings: QuerySettings): AssetDocument {
  const textSizeOption = getTextSizeOption(settings.textSize)

  return {
    version: 1,
    icon: {
      layers: [
        {
          id: 'background',
          type: 'background',
          color: getValidColor(settings.bg, defaults.backgroundColor),
          opacity: parseOpacityPercent(settings.bgOpacity, defaults.backgroundOpacity) / 100,
        },
        {
          id: 'text',
          type: 'text',
          text: settings.text,
          color: getValidColor(settings.fg, defaults.textColor),
          colorOpacity: parseOpacityPercent(settings.fgOpacity, defaults.textColorOpacity) / 100,
          fontFamily: getFontFamily(settings.font),
          fontKey: settings.font,
          fontWeight: settings.weight,
          textAlign: settings.align,
          verticalAlign: settings.valign,
          textSize: settings.textSize,
          opacity: parseOpacityPercent(settings.opacity, defaults.textOpacity) / 100,
          x: masterSize / 2,
          y: masterSize / 2,
          maxWidth: masterSize * 0.72,
          maxFontSize: textSizeOption.maxFontSize,
        },
      ],
    },
    preview: {
      splashBackgroundColor: getValidColor(settings.splashBg, defaults.splashBackgroundColor),
      splashBackgroundOpacity: parseOpacityPercent(settings.splashOpacity, defaults.splashBackgroundOpacity) / 100,
    },
  }
}

export function createDefaultEditorState(settings: QuerySettings): EditorState {
  return {
    activeTool: settings.tool,
    selectedLayerId: 'text',
    platform: settings.platform,
    previewOpen: settings.preview === 'open',
  }
}

export function serializeDocumentToSettings(document: AssetDocument) {
  const backgroundLayer = getBackgroundLayer(document)
  const textLayer = getTextLayer(document)

  return {
    text: textLayer.text,
    bg: backgroundLayer.color,
    bgOpacity: String(Math.round(backgroundLayer.opacity * 100)),
    fg: textLayer.color,
    fgOpacity: String(Math.round(textLayer.colorOpacity * 100)),
    splashBg: document.preview.splashBackgroundColor,
    splashOpacity: String(Math.round(document.preview.splashBackgroundOpacity * 100)),
    font: textLayer.fontKey,
    weight: textLayer.fontWeight,
    textSize: textLayer.textSize,
    align: textLayer.textAlign,
    valign: textLayer.verticalAlign,
    opacity: String(Math.round(textLayer.opacity * 100)),
  }
}

export function serializeEditorToSettings(editor: EditorState) {
  return {
    platform: editor.platform,
    tool: editor.activeTool,
    preview: editor.previewOpen ? 'open' : 'closed',
  } as const
}

export function getBackgroundLayer(document: AssetDocument): BackgroundLayer {
  const layer = document.icon.layers.find((candidate) => candidate.id === 'background')
  if (!layer || layer.type !== 'background') {
    return getDefaultAssetDocument().icon.layers[0] as BackgroundLayer
  }
  return layer
}

export function getTextLayer(document: AssetDocument): TextLayer {
  const layer = document.icon.layers.find((candidate) => candidate.id === 'text')
  if (!layer || layer.type !== 'text') {
    return getDefaultAssetDocument().icon.layers[1] as TextLayer
  }
  return layer
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

export function createFrameLayer(rect: { x: number; y: number; width: number; height: number }): FrameLayer {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 100000)}`

  return {
    id: `frame-${id}`,
    type: 'frame',
    name: null,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    strokeColor: '#bbbbbb',
    backgroundColor: 'rgba(0, 0, 200, 0.04)',
    opacity: 1,
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
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    opacity: 1,
    roughness: 0,
  }
}

export function addIconLayer(document: AssetDocument, layer: DesignLayer): AssetDocument {
  const backgroundLayers = document.icon.layers.filter((candidate) => candidate.type === 'background')
  const textLayers = document.icon.layers.filter((candidate) => candidate.type === 'text')
  const drawableLayers = document.icon.layers.filter((candidate) => candidate.type !== 'background' && candidate.type !== 'text')

  return {
    ...document,
    icon: {
      layers: [...backgroundLayers, ...drawableLayers, layer, ...textLayers],
    },
  }
}

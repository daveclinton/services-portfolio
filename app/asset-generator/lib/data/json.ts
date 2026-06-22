import { getDefaultAppState } from '../editor/appState'
import { resetTransientAppState } from '../editor/history'
import type { AssetFile, EditorSnapshot } from '../editor/types'
import type { AssetElement } from '../element/types'

export const DOCUMENT_TYPE = 'asset-generator' as const
export const DOCUMENT_VERSION = 2

export type PersistedAppState = {
  viewBackgroundColor: string
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  currentItemStrokeWidth: number
  currentItemFontSize?: number
  projectName: string
  previewPlatform: 'ios' | 'android'
}

export type AssetDocument = {
  type: typeof DOCUMENT_TYPE
  version: typeof DOCUMENT_VERSION
  elements: AssetElement[]
  appState: PersistedAppState
  files: Record<string, AssetFile>
}

type AssetDocumentV1 = {
  type: typeof DOCUMENT_TYPE
  version: 1
  elements: AssetElement[]
  appState: PersistedAppState
}

function pickPersistedAppState(snapshot: EditorSnapshot): PersistedAppState {
  const { appState } = snapshot

  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemFontSize: appState.currentItemFontSize,
    projectName: appState.projectName,
    previewPlatform: appState.previewPlatform,
  }
}

export function serializeDocument(snapshot: EditorSnapshot): string {
  const document: AssetDocument = {
    type: DOCUMENT_TYPE,
    version: DOCUMENT_VERSION,
    elements: snapshot.elements.map((element) => ({ ...element })),
    appState: pickPersistedAppState(snapshot),
    files: { ...snapshot.files },
  }

  return JSON.stringify(document, null, 2)
}

export function parseDocument(raw: string): EditorSnapshot {
  const parsed = JSON.parse(raw) as Partial<AssetDocument | AssetDocumentV1>

  if (parsed.type !== DOCUMENT_TYPE) {
    throw new Error('Unsupported document type')
  }

  if (parsed.version !== 1 && parsed.version !== DOCUMENT_VERSION) {
    throw new Error(`Unsupported document version: ${parsed.version}`)
  }

  if (!Array.isArray(parsed.elements) || !parsed.appState) {
    throw new Error('Invalid asset document')
  }

  const files =
    parsed.version === DOCUMENT_VERSION && parsed.files && typeof parsed.files === 'object'
      ? parsed.files
      : {}

  return {
    elements: parsed.elements,
    files,
    appState: resetTransientAppState({
      ...getDefaultAppState(),
      ...parsed.appState,
    }),
  }
}

export function downloadDocument(snapshot: EditorSnapshot, filename = 'asset-project.json') {
  const blob = new Blob([serializeDocument(snapshot)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function loadDocumentFromFile(file: File): Promise<EditorSnapshot> {
  const raw = await file.text()
  return parseDocument(raw)
}

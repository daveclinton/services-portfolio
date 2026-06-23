import { describe, expect, it } from 'vitest'
import { createInitialSnapshot } from '../editor/updateScene'
import { newImageElement } from '../element/newElement'
import { DOCUMENT_VERSION, parseDocument, serializeDocument } from './json'

describe('asset document json', () => {
  it('round-trips the current editor snapshot', () => {
    const snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        currentItemFontSize: 88,
        currentItemFontFamily: 'code',
        currentItemFontStyle: 'italic',
      },
    }
    const restored = parseDocument(serializeDocument(snapshot))

    expect(restored.elements).toEqual(snapshot.elements)
    expect(restored.appState.projectName).toBe(snapshot.appState.projectName)
    expect(restored.appState.viewBackgroundColor).toBe(snapshot.appState.viewBackgroundColor)
    expect(restored.appState.currentItemFontSize).toBe(88)
    expect(restored.appState.currentItemFontFamily).toBe('code')
    expect(restored.appState.currentItemFontStyle).toBe('italic')
  })

  it('rejects unsupported documents', () => {
    expect(() => parseDocument('{"type":"other","version":1}')).toThrow(
      'Unsupported document type',
    )
  })

  it('serializes embedded image files in version 2 documents', () => {
    const snapshot = createInitialSnapshot()
    const element = newImageElement({
      x: 100,
      y: 100,
      width: 240,
      height: 240,
      fileId: 'file-1',
    })
    const withImage = {
      ...snapshot,
      elements: [element],
      files: {
        'file-1': {
          mimeType: 'image/png',
          dataURL: 'data:image/png;base64,abc',
          width: 240,
          height: 240,
        },
      },
    }

    const restored = parseDocument(serializeDocument(withImage))

    expect(JSON.parse(serializeDocument(withImage)).version).toBe(DOCUMENT_VERSION)
    expect(restored.files).toEqual(withImage.files)
    expect(restored.elements[0]?.fileId).toBe('file-1')
  })

  it('loads version 1 documents without files', () => {
    const snapshot = createInitialSnapshot()
    const v1 = {
      type: 'asset-generator',
      version: 1,
      elements: snapshot.elements,
      appState: {
        viewBackgroundColor: snapshot.appState.viewBackgroundColor,
        currentItemStrokeColor: snapshot.appState.currentItemStrokeColor,
        currentItemBackgroundColor: snapshot.appState.currentItemBackgroundColor,
        currentItemStrokeWidth: snapshot.appState.currentItemStrokeWidth,
        projectName: snapshot.appState.projectName,
        previewPlatform: snapshot.appState.previewPlatform,
      },
    }

    const restored = parseDocument(JSON.stringify(v1))
    expect(restored.files).toEqual({})
  })
})

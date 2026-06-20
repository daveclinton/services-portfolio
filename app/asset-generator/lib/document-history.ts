import type { AssetDocument } from '../types'

export function cloneDocument(document: AssetDocument): AssetDocument {
  return structuredClone(document)
}

export function documentsEqual(a: AssetDocument, b: AssetDocument) {
  return JSON.stringify(a) === JSON.stringify(b)
}
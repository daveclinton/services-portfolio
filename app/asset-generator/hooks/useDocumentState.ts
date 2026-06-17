import { useRef, useState } from 'react'
import type { AssetDocument } from '../types'
import { serializeDocumentToSettings } from '../document'

export function useDocumentState(getInitial: () => AssetDocument, onSettingsChange: (settings: ReturnType<typeof serializeDocumentToSettings>) => void) {
  const [document, setDocument] = useState(getInitial)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStackRef = useRef<AssetDocument[]>([])
  const redoStackRef = useRef<AssetDocument[]>([])

  const documentsEqual = (a: AssetDocument, b: AssetDocument) => JSON.stringify(a) === JSON.stringify(b)

  const applyDocument = (nextDocument: AssetDocument) => {
    setDocument(nextDocument)
    onSettingsChange(serializeDocumentToSettings(nextDocument))
  }

  const updateDocument = (updater: (current: AssetDocument) => AssetDocument) => {
    const nextDocument = updater(document)
    applyDocument(nextDocument)
    return nextDocument
  }

  const commitHistory = (before: AssetDocument, after = document) => {
    if (documentsEqual(before, after)) return
    undoStackRef.current.push(before)
    redoStackRef.current = []
    setHistoryVersion((version) => version + 1)
  }

  const applySnapshot = (snapshot: AssetDocument) => {
    applyDocument(snapshot)
  }

  const undo = () => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(document)
    applySnapshot(previous)
    setHistoryVersion((version) => version + 1)
  }

  const redo = () => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(document)
    applySnapshot(next)
    setHistoryVersion((version) => version + 1)
  }

  const updateDocumentWithHistory = (updater: (current: AssetDocument) => AssetDocument) => {
    const before = document
    const after = updateDocument(updater)
    commitHistory(before, after)
  }

  return {
    document,
    setDocument,
    updateDocument,
    updateDocumentWithHistory,
    commitHistory,
    applyDocument,
    applySnapshot,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    historyVersion,
  }
}

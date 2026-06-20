'use client'

import { useCallback, useRef, useState } from 'react'
import { cloneDocument, documentsEqual } from '../lib/document-history'
import type { AssetDocument } from '../types'

export function useDocumentHistory(initialDocument: AssetDocument) {
  const undoStackRef = useRef<AssetDocument[]>([])
  const redoStackRef = useRef<AssetDocument[]>([])
  const documentRef = useRef(initialDocument)
  const [document, setDocument] = useState(initialDocument)
  const [historyVersion, setHistoryVersion] = useState(0)

  documentRef.current = document

  const commitHistory = useCallback((before: AssetDocument, after?: AssetDocument) => {
    const next = after ?? documentRef.current
    if (documentsEqual(before, next)) return

    undoStackRef.current.push(before)
    redoStackRef.current.length = 0
    setHistoryVersion((version) => version + 1)
  }, [])

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) return

    redoStackRef.current.push(cloneDocument(documentRef.current))
    setDocument(previous)
    setHistoryVersion((version) => version + 1)
  }, [])

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return

    undoStackRef.current.push(cloneDocument(documentRef.current))
    setDocument(next)
    setHistoryVersion((version) => version + 1)
  }, [])

  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0

  return {
    document,
    setDocument,
    commitHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyVersion,
    cloneDocument,
  }
}
import { useRef, useState } from 'react'
import type { FrameLayer, ShapeLayer, ShapeType, AssetDocument } from '../types'
import { CanvasRect } from '../utils/'

type DragState =
  | {
      mode: 'move-text'
      pointerId: number
      offsetX: number
      offsetY: number
      origin: { x: number; y: number }
      before: AssetDocument
    }
  | {
      mode: 'box-select'
      pointerId: number
      origin: { x: number; y: number }
    }
  | {
      mode: 'draw-frame'
      pointerId: number
      origin: { x: number; y: number }
      before: AssetDocument
    }
  | {
      mode: 'draw-shape'
      pointerId: number
      shapeType: ShapeType
      origin: { x: number; y: number }
      before: AssetDocument
    }
  | {
      mode: 'move-frame'
      pointerId: number
      layerId: FrameLayer['id']
      offsetX: number
      offsetY: number
      before: AssetDocument
    }
  | {
      mode: 'move-shape'
      pointerId: number
      layerId: ShapeLayer['id']
      offsetX: number
      offsetY: number
      before: AssetDocument
    }
  | null

export function useCanvasInteraction() {
  const dragRef = useRef<DragState>(null)
  const [selectionRect, setSelectionRect] = useState<CanvasRect | null>(null)
  const textEditSnapshotRef = useRef<AssetDocument | null>(null)

  const startDrag = (state: Exclude<DragState, null>) => {
    dragRef.current = state
  }

  const getDrag = () => dragRef.current

  const endDrag = () => {
    dragRef.current = null
  }

  const cancelDrag = () => {
    dragRef.current = null
    setSelectionRect(null)
  }

  return {
    dragRef,
    selectionRect,
    setSelectionRect,
    textEditSnapshotRef,
    startDrag,
    getDrag,
    endDrag,
    cancelDrag,
  }
}

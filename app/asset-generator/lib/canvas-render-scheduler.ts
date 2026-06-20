import { masterSize } from '../constants'
import type { AssetDocument, DesignLayer, ShapeType } from '../types'
import { renderInteractiveScene, renderStaticScene } from '../utils/rendering'
import type { CanvasRect } from '../utils/geometry'

export type CanvasOverlayState = {
  marquee: CanvasRect | null
  shapePreview: { shapeType: ShapeType; rect: CanvasRect } | null
  textPreview: CanvasRect | null
}

export type MasterCanvasScene = {
  document: AssetDocument
  selectedLayerIds: DesignLayer['id'][]
  editingTextLayerId: DesignLayer['id'] | null
  overlay: CanvasOverlayState
}

export type DualCanvasTargets = {
  staticCanvas: HTMLCanvasElement | null
  interactiveCanvas: HTMLCanvasElement | null
}

function prepareCanvas(canvas: HTMLCanvasElement, size = masterSize) {
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }
}

export function paintStaticCanvas(
  canvas: HTMLCanvasElement,
  scene: MasterCanvasScene,
  size = masterSize,
) {
  prepareCanvas(canvas, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  renderStaticScene(ctx, scene.document.icon, size, {
    editingTextLayerId: scene.editingTextLayerId,
    showSafeAreaGuide: true,
  })
}

export function paintInteractiveCanvas(
  canvas: HTMLCanvasElement,
  scene: MasterCanvasScene,
  size = masterSize,
) {
  prepareCanvas(canvas, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  renderInteractiveScene(ctx, scene.document.icon, size, {
    selectedLayerIds: scene.selectedLayerIds,
    editingTextLayerId: scene.editingTextLayerId,
    overlay: scene.overlay,
  })
}

/** @deprecated Use createDualCanvasRenderScheduler */
export function paintMasterCanvas(
  staticCanvas: HTMLCanvasElement,
  scene: MasterCanvasScene,
  size = masterSize,
  interactiveCanvas?: HTMLCanvasElement | null,
) {
  paintStaticCanvas(staticCanvas, scene, size)
  if (interactiveCanvas) {
    paintInteractiveCanvas(interactiveCanvas, scene, size)
  }
}

export function createDualCanvasRenderScheduler(getScene: () => MasterCanvasScene | null) {
  let staticRafId: number | null = null
  let interactiveRafId: number | null = null

  const renderStaticNow = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const scene = getScene()
    if (!scene) return
    paintStaticCanvas(canvas, scene)
  }

  const renderInteractiveNow = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const scene = getScene()
    if (!scene) return
    paintInteractiveCanvas(canvas, scene)
  }

  const renderAllNow = (targets: DualCanvasTargets) => {
    renderStaticNow(targets.staticCanvas)
    renderInteractiveNow(targets.interactiveCanvas)
  }

  const scheduleStatic = (targets: DualCanvasTargets) => {
    if (!targets.staticCanvas) return
    if (staticRafId !== null) return
    staticRafId = requestAnimationFrame(() => {
      staticRafId = null
      renderStaticNow(targets.staticCanvas)
    })
  }

  const scheduleInteractive = (targets: DualCanvasTargets) => {
    if (!targets.interactiveCanvas) return
    if (interactiveRafId !== null) return
    interactiveRafId = requestAnimationFrame(() => {
      interactiveRafId = null
      renderInteractiveNow(targets.interactiveCanvas)
    })
  }

  const scheduleAll = (targets: DualCanvasTargets) => {
    scheduleStatic(targets)
    scheduleInteractive(targets)
  }

  const cancel = () => {
    if (staticRafId !== null) cancelAnimationFrame(staticRafId)
    if (interactiveRafId !== null) cancelAnimationFrame(interactiveRafId)
    staticRafId = null
    interactiveRafId = null
  }

  return {
    scheduleStatic,
    scheduleInteractive,
    scheduleAll,
    renderStaticNow,
    renderInteractiveNow,
    renderAllNow,
    cancel,
  }
}

/** @deprecated Use createDualCanvasRenderScheduler */
export function createCanvasRenderScheduler(getScene: () => MasterCanvasScene | null) {
  const dual = createDualCanvasRenderScheduler(getScene)

  return {
    schedule: (canvas: HTMLCanvasElement | null) => {
      dual.scheduleAll({ staticCanvas: canvas, interactiveCanvas: canvas })
    },
    renderNow: (canvas: HTMLCanvasElement | null) => {
      dual.renderAllNow({ staticCanvas: canvas, interactiveCanvas: canvas })
    },
    cancel: dual.cancel,
  }
}
export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  masterSize: number,
) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * masterSize,
    y: ((clientY - rect.top) / rect.height) * masterSize,
  }
}
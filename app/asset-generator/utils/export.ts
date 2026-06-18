export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export canvas'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await canvasToBlob(canvas)
  return new Uint8Array(await blob.arrayBuffer())
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

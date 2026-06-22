import { ICON_SIZE, SAFE_AREA_SIZE } from '../common/constants'
import { randomId } from '../common/random'
import { newImageElement } from '../element/newElement'
import type { AssetFile } from '../editor/types'
import type { AssetElement } from '../element/types'

const MAX_IMAGE_SIZE = 480

function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not read image file'))
    }
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataURL: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = dataURL
  })
}

function fitImageDimensions(width: number, height: number) {
  const maxSize = Math.min(MAX_IMAGE_SIZE, SAFE_AREA_SIZE * 0.6)
  const scale = Math.min(maxSize / width, maxSize / height, 1)

  return {
    width: Math.round(Math.max(120, width * scale)),
    height: Math.round(Math.max(120, height * scale)),
  }
}

export async function importImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported')
  }

  const dataURL = await readFileAsDataURL(file)
  const image = await loadImage(dataURL)
  const fileId = randomId()
  const { width, height } = fitImageDimensions(image.naturalWidth, image.naturalHeight)
  const x = Math.round((ICON_SIZE - width) / 2)
  const y = Math.round((ICON_SIZE - height) / 2)

  const assetFile: AssetFile = {
    mimeType: file.type,
    dataURL,
    width: image.naturalWidth,
    height: image.naturalHeight,
  }

  const element = newImageElement({
    x,
    y,
    width,
    height,
    fileId,
  })

  return { element, fileId, file: assetFile }
}
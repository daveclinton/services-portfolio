type IcoImage = {
  width: number
  height: number
  data: Uint8Array
}

export function encodeIco(images: IcoImage[]) {
  if (!images.length) {
    throw new Error('ICO export requires at least one image')
  }

  const headerSize = 6
  const directoryEntrySize = 16
  const dataOffset = headerSize + directoryEntrySize * images.length
  const totalSize = dataOffset + images.reduce((sum, image) => sum + image.data.length, 0)
  const buffer = new Uint8Array(totalSize)
  const view = new DataView(buffer.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let entryOffset = headerSize
  let imageOffset = dataOffset

  for (const image of images) {
    buffer[entryOffset] = image.width >= 256 ? 0 : image.width
    buffer[entryOffset + 1] = image.height >= 256 ? 0 : image.height
    buffer[entryOffset + 2] = 0
    buffer[entryOffset + 3] = 0
    view.setUint16(entryOffset + 4, 1, true)
    view.setUint16(entryOffset + 6, 0, true)
    view.setUint32(entryOffset + 8, image.data.length, true)
    view.setUint32(entryOffset + 12, imageOffset, true)

    buffer.set(image.data, imageOffset)
    imageOffset += image.data.length
    entryOffset += directoryEntrySize
  }

  return new Blob([buffer], { type: 'image/x-icon' })
}
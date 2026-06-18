import { describe, expect, it } from 'vitest'
import { encodeIco } from '../../utils/ico'

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('encodeIco', () => {
  it('writes a valid ICO header and embeds PNG images', async () => {
    const blob = encodeIco([
      { width: 16, height: 16, data: PNG_HEADER },
      { width: 32, height: 32, data: PNG_HEADER },
      { width: 48, height: 48, data: PNG_HEADER },
    ])
    const bytes = new Uint8Array(await blob.arrayBuffer())

    expect(bytes[0]).toBe(0)
    expect(bytes[1]).toBe(0)
    expect(bytes[2]).toBe(1)
    expect(bytes[3]).toBe(0)
    expect(bytes[4]).toBe(3)
    expect(bytes[5]).toBe(0)

    expect(bytes[6]).toBe(16)
    expect(bytes[7]).toBe(16)
    expect(bytes[22]).toBe(32)
    expect(bytes[23]).toBe(32)

    const firstImageOffset = bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24)
    expect(firstImageOffset).toBe(54)
    expect(Array.from(bytes.slice(firstImageOffset, firstImageOffset + 8))).toEqual(Array.from(PNG_HEADER))
  })

  it('requires at least one image', () => {
    expect(() => encodeIco([])).toThrow('ICO export requires at least one image')
  })
})
// The four frames every article image is shown in. Designed for the article
// column (at most ~920px; see docs/article-images.md). Taller frames are shown
// narrower, so no image is taller than about 0.7 of the column's width.
export const IMAGE_FRAMES = {
  landscape: { label: "Landscape", ratio: [3, 2], share: 1, use: "Photos" },
  wide: { label: "Wide", ratio: [16, 9], share: 1, use: "Screenshots and video stills" },
  square: { label: "Square", ratio: [1, 1], share: 0.66, use: "Portraits and logos" },
  portrait: { label: "Portrait", ratio: [4, 5], share: 0.56, use: "Phone photos and screens" },
} as const
export type ImageFrame = keyof typeof IMAGE_FRAMES
export const DEFAULT_FRAME: ImageFrame = "landscape"
export const FRAME_IDS = Object.keys(IMAGE_FRAMES) as ImageFrame[]
const COLUMN = 920
// Widths served for each image; 1840 covers the full column on 2x screens.
export const FRAME_WIDTHS = [480, 720, 960, 1440, 1840] as const

// The frame travels in the address fragment, so Markdown, email and every
// renderer keep it without new syntax. Images without one use the default.
export function frameOf(src: string): ImageFrame {
  const match = /#frame=([a-z]+)$/.exec(src)
  return match && match[1] in IMAGE_FRAMES ? match[1] as ImageFrame : DEFAULT_FRAME
}
export function withoutFrame(src: string) { return src.replace(/#frame=[a-z]*$/, "") }
export function withFrame(src: string, frame: ImageFrame) { return `${withoutFrame(src)}#frame=${frame}` }

// res.cloudinary.com/<cloud>/image/upload/v<version>/<path>: an untransformed
// upload. Anything else is served as it is, framed by CSS.
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/(v\d+\/.+)$/i
export function cloudinaryAsset(src: string) {
  const match = CLOUDINARY.exec(withoutFrame(src))
  return match ? { cloud: match[1], path: match[2] } : null
}
export function cloudinaryURL(src: string, frame: ImageFrame, width: number) {
  const asset = cloudinaryAsset(src)
  if (!asset) return withoutFrame(src)
  const [w, h] = IMAGE_FRAMES[frame].ratio
  return `https://res.cloudinary.com/${asset.cloud}/image/upload/c_pad,ar_${w}:${h},b_transparent,w_${width}/f_auto,q_auto/${asset.path}`
}

export type FramedSource = { frame: ImageFrame; src: string; srcSet?: string; sizes: string; width: number; height: number }
export function framedSource(src: string): FramedSource {
  const frame = frameOf(src)
  const { ratio: [w, h], share } = IMAGE_FRAMES[frame]
  const shown = Math.round(COLUMN * share)
  const sizes = `(min-width: 1280px) ${shown}px, ${Math.round(share * 100)}vw`
  // Intrinsic size in the frame's ratio, so the page reserves space before loading.
  const width = 1440, height = Math.round(width * h / w)
  if (!cloudinaryAsset(src)) return { frame, src: withoutFrame(src), sizes, width, height }
  return { frame, src: cloudinaryURL(src, frame, 960), srcSet: FRAME_WIDTHS.map((size) => `${cloudinaryURL(src, frame, size)} ${size}w`).join(", "), sizes, width, height }
}

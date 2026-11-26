import { framedSource } from "@/lib/image-frames"

// One article image in its frame. Cloudinary images get a responsive set cut to
// the frame; others are cropped to it by CSS (object-fit: cover).
export function FramedImage({ src, alt, onLoad, onError }: { src: string; alt?: string; onLoad?: () => void; onError?: () => void }) {
  const image = framedSource(src)
  // eslint-disable-next-line @next/next/no-img-element -- remote media with a known frame, not a Next asset
  return <img src={image.src} srcSet={image.srcSet} sizes={image.sizes} width={image.width} height={image.height} alt={alt ?? ""} data-frame={image.frame} className="framed-image" loading="lazy" decoding="async" onLoad={onLoad} onError={onError} />
}

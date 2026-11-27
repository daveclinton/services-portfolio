import { framedSource } from "@/lib/image-frames"

// A fixed canvas around the complete image, as in shots.so. Cloudinary pads
// responsive derivatives; CSS contains other images in the same themed frame.
export function FramedImage({ src, alt, onLoad, onError }: { src: string; alt?: string; onLoad?: () => void; onError?: () => void }) {
  const image = framedSource(src)
  // eslint-disable-next-line @next/next/no-img-element -- remote media with a known frame, not a Next asset
  return <img src={image.src} srcSet={image.srcSet} sizes={image.sizes} width={image.width} height={image.height} alt={alt ?? ""} data-frame={image.frame} className="framed-image" loading="lazy" decoding="async" onLoad={onLoad} onError={onError} />
}

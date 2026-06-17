import type { Ref } from 'react'

export function PhonePreview({
  title,
  platform,
  canvasRef,
  splashBackgroundColor,
}: {
  title: string
  platform: 'ios' | 'android'
  canvasRef: Ref<HTMLCanvasElement>
  splashBackgroundColor: string
}) {
  return (
    <article className="asset-generator-phone">
      <div className={`asset-generator-phone-frame asset-generator-phone-frame-${platform}`}>
        <div className="asset-generator-phone-island" />
        <div className="asset-generator-phone-screen" style={{ background: splashBackgroundColor }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
      <strong>{title} preview</strong>
    </article>
  )
}

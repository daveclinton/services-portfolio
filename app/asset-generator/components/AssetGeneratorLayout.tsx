'use client'

import { useState, type ReactNode } from 'react'
import { SlidersHorizontal, Smartphone, X } from 'lucide-react'

type AssetGeneratorLayoutProps = {
  topLeft: ReactNode
  toolbar: ReactNode
  topRight: ReactNode
  sidebar: ReactNode
  statusBar: ReactNode
  preview: ReactNode
  canvas: ReactNode
}

export function AssetGeneratorLayout({
  topLeft,
  toolbar,
  topRight,
  sidebar,
  statusBar,
  preview,
  canvas,
}: AssetGeneratorLayoutProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <main
      className={`asset-excalidraw-shell${isPreviewOpen ? ' is-mobile-preview-open' : ''}${
        isSidebarOpen ? ' is-mobile-sidebar-open' : ''
      }`}
      id="main-content"
    >
      <section className="asset-excalidraw-layer-ui" aria-label="Asset generator controls">
        <div className="asset-excalidraw-fixed-side asset-excalidraw-fixed-side--top">
          <div className="asset-excalidraw-menu asset-excalidraw-menu--top">
            <div className="asset-excalidraw-top-left">{topLeft}</div>
            <section className="asset-excalidraw-shapes" aria-label="Canvas tools">
              {toolbar}
            </section>
            <div className="asset-excalidraw-top-right">{topRight}</div>
          </div>
        </div>

        <button
          type="button"
          className="asset-excalidraw-sidebar-trigger"
          aria-label="Open asset settings"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" />
        </button>

        <button
          type="button"
          className="asset-excalidraw-sidebar-backdrop"
          aria-label="Close asset settings"
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside className="asset-excalidraw-sidebar" aria-label="Asset settings">
          <div className="asset-excalidraw-sidebar-header">
            <span>Asset settings</span>
            <button type="button" aria-label="Close asset settings" onClick={() => setIsSidebarOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
          {sidebar}
        </aside>

        <div className="asset-excalidraw-statusbar" aria-label="Canvas status">
          {statusBar}
        </div>

        <button
          type="button"
          className="asset-excalidraw-preview-trigger"
          aria-label="Open device preview"
          aria-expanded={isPreviewOpen}
          onClick={() => setIsPreviewOpen(true)}
        >
          <Smartphone aria-hidden="true" />
        </button>

        <button
          type="button"
          className="asset-excalidraw-preview-backdrop"
          aria-label="Close device preview"
          onClick={() => setIsPreviewOpen(false)}
        />

        <aside className="asset-excalidraw-preview" aria-label="Device preview">
          <div className="asset-excalidraw-preview-header">
            <span>Device preview</span>
            <button type="button" aria-label="Close device preview" onClick={() => setIsPreviewOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="asset-excalidraw-preview-body">{preview}</div>
        </aside>
      </section>

      <section className="asset-excalidraw-canvas-wrap" aria-label="Canvas area">
        {canvas}
      </section>
    </main>
  )
}

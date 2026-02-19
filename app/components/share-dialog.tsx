'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type ShareDialogProps = {
  title: string
  summary: string
  url: string
  imageUrl: string
}

export function ShareDialog({ title, summary, url, imageUrl }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const options = useMemo(
    () => [
      {
        label: 'X',
        href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          url
        )}&text=${encodeURIComponent(title)}`,
      },
      {
        label: 'LinkedIn',
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      },
      {
        label: 'Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      },
      {
        label: 'Email',
        href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
          `${summary}\n\n${url}`
        )}`,
      },
    ],
    [summary, title, url]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (_error) {
      setCopied(false)
    }
  }

  async function downloadPreviewPng() {
    try {
      setDownloading(true)
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const safeName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const fileName = `${safeName || 'article-preview'}.png`

      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (_error) {
      window.open(imageUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <button type="button" className="share-trigger" onClick={() => setOpen(true)}>
        Share
      </button>

      {mounted
        ? createPortal(
            <div
              className={`share-overlay ${open ? 'open' : ''}`}
              onClick={() => setOpen(false)}
              aria-hidden={!open}
            >
              <section
                className={`share-dialog ${open ? 'open' : ''}`}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Share this article"
              >
                <header className="share-header">
                  <h3>Share this article</h3>
                  <button
                    type="button"
                    className="share-close"
                    onClick={() => setOpen(false)}
                    aria-label="Close share dialog"
                  >
                    ✕
                  </button>
                </header>

                <a href={url} className="share-preview" target="_blank" rel="noreferrer">
                  <img src={imageUrl} alt="Social share preview" />
                  <div className="share-preview-copy">
                    <strong>{title}</strong>
                    <p>{summary}</p>
                    <small>{url.replace(/^https?:\/\//, '')}</small>
                  </div>
                </a>

                <div className="share-options">
                  {options.map((option) => (
                    <a key={option.label} href={option.href} target="_blank" rel="noreferrer">
                      {option.label}
                    </a>
                  ))}
                  <button type="button" onClick={downloadPreviewPng}>
                    {downloading ? 'Preparing...' : 'Download PNG'}
                  </button>
                  <button type="button" onClick={copyLink}>
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

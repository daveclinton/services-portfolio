'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type ShareDialogProps = {
  title: string
  summary: string
  url: string
  imageUrl: string
  storyImageUrl: string
}

export function ShareDialog({
  title,
  summary,
  url,
  imageUrl,
  storyImageUrl,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [storyReady, setStoryReady] = useState(false)
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

  async function downloadStoryCard() {
    try {
      setStoryReady(true)
      const response = await fetch(storyImageUrl)
      const contentType = response.headers.get('content-type') || ''

      if (!response.ok || !contentType.includes('image')) {
        throw new Error('Story image response is not a valid image')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const safeName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const fileName = `${safeName || 'story-card'}-story.png`

      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (_error) {
      window.open(storyImageUrl, '_blank', 'noopener,noreferrer')
    } finally {
      window.setTimeout(() => setStoryReady(false), 1400)
    }
  }

  return (
    <>
      <button
        type="button"
        className="share-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
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
                aria-labelledby="share-dialog-title"
              >
                <header className="share-header">
                  <h3 id="share-dialog-title">Share this article</h3>
                  <button
                    type="button"
                    className="share-close"
                    onClick={() => setOpen(false)}
                    aria-label="Close share dialog"
                    autoFocus={open}
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
                  <button type="button" onClick={copyLink}>
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <button type="button" onClick={downloadStoryCard}>
                    {storyReady ? 'Story ready' : 'Instagram Story Card'}
                  </button>
                </div>
                <p className="share-story-note">
                  Download the story card, then add it to your Instagram Story and attach
                  the post link.
                </p>
                <p className="sr-only" aria-live="polite">
                  {copied ? 'Link copied to clipboard' : ''}
                  {storyReady ? ' Instagram story card is ready' : ''}
                </p>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

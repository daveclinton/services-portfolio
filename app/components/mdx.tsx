import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { highlight } from 'sugar-high'
import React from 'react'
import { slugifyHeading } from 'app/blog/heading-utils'
import { ExternalLinkIcon } from 'app/components/icons/external-link-icon'

function Table({ data }) {
  let headers = data.headers.map((header, index) => (
    <th key={index}>{header}</th>
  ))
  let rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ))

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

function CustomLink(props) {
  let href = props.href

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    )
  }

  if (href.startsWith('#')) {
    return <a {...props} />
  }

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      className={['external-link-inline', props.className].filter(Boolean).join(' ')}
    >
      <span>{props.children}</span>
      <ExternalLinkIcon />
    </a>
  )
}

function RoundedImage(props) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />
}

function parseBooleanFlag(
  value: boolean | string | undefined,
  defaultValue: boolean
) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false
    }

    return true
  }

  return defaultValue
}

function parseNumberValue(value: number | string | undefined, defaultValue: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return defaultValue
}

type RedactionMask = {
  x: number | string
  y: number | string
  w: number | string
  h: number | string
  blur?: number | string
  radius?: number | string
  block?: boolean | string
}

function parseMaskPercent(value: number | string | undefined, defaultValue: number) {
  const parsed = parseNumberValue(value, defaultValue)
  return Math.max(0, Math.min(parsed, 100))
}

function parseMaskList(value: RedactionMask[] | string | undefined): RedactionMask[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed as RedactionMask[]
      }
    } catch {}
  }

  return []
}

function BlurImage({
  caption,
  blur,
  grayscale,
  dim,
  radius,
  masks,
  blurAll,
  blurPercentage,
  blurDirection,
  className,
  style,
  ...imgProps
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  caption?: string
  blur?: number | string
  grayscale?: boolean | string
  dim?: boolean | string
  radius?: number | string
  masks?: RedactionMask[] | string
  blurAll?: boolean | string
  blurPercentage?: number | string
  blurDirection?: 'top' | 'bottom' | 'left' | 'right' | string
}) {
  const blurPx = Math.max(0, parseNumberValue(blur, 12))
  const roundedPx = Math.max(0, parseNumberValue(radius, 12))
  const useGrayscale = parseBooleanFlag(grayscale, true)
  const useDim = parseBooleanFlag(dim, true)
  const parsedMasks = parseMaskList(masks)
  const blurCoverage = parseMaskPercent(blurPercentage, 0)
  const direction = typeof blurDirection === 'string' ? blurDirection.toLowerCase() : 'bottom'
  const autoCoverageMask =
    blurCoverage > 0
      ? direction === 'top'
        ? [{ x: 0, y: 0, w: 100, h: blurCoverage, blur: blurPx }]
        : direction === 'left'
          ? [{ x: 0, y: 0, w: blurCoverage, h: 100, blur: blurPx }]
          : direction === 'right'
            ? [{ x: 100 - blurCoverage, y: 0, w: blurCoverage, h: 100, blur: blurPx }]
            : [{ x: 0, y: 100 - blurCoverage, w: 100, h: blurCoverage, blur: blurPx }]
      : []
  const effectiveMasks = parsedMasks.length ? parsedMasks : autoCoverageMask
  const shouldBlurAll = parseBooleanFlag(
    blurAll,
    parsedMasks.length === 0 && autoCoverageMask.length === 0
  )

  const imageFilters = [
    shouldBlurAll ? `blur(${blurPx}px)` : '',
    useGrayscale ? 'grayscale(100%)' : '',
    useDim ? 'brightness(0.72)' : '',
  ].filter(Boolean)

  return (
    <figure className="redacted-media" style={{ borderRadius: `${roundedPx}px` }}>
      <img
        {...imgProps}
        className={['redacted-media-image', className].filter(Boolean).join(' ')}
        style={{
          ...style,
          borderRadius: `${roundedPx}px`,
          filter: imageFilters.join(' '),
        }}
      />
      {effectiveMasks.length ? (
        <div className="redacted-media-masks" aria-hidden="true">
          {effectiveMasks.map((mask, index) => {
            const maskBlur = Math.max(0, parseNumberValue(mask.blur, blurPx))
            const maskRadius = Math.max(0, parseNumberValue(mask.radius, 6))
            const isBlock = parseBooleanFlag(mask.block, false)

            return (
              <span
                key={`mask-${index}`}
                className={['redacted-media-mask', isBlock ? 'is-block' : ''].join(' ').trim()}
                style={{
                  left: `${parseMaskPercent(mask.x, 0)}%`,
                  top: `${parseMaskPercent(mask.y, 0)}%`,
                  width: `${parseMaskPercent(mask.w, 18)}%`,
                  height: `${parseMaskPercent(mask.h, 8)}%`,
                  borderRadius: `${maskRadius}px`,
                  backdropFilter: isBlock ? undefined : `blur(${maskBlur}px)`,
                  WebkitBackdropFilter: isBlock ? undefined : `blur(${maskBlur}px)`,
                }}
              />
            )
          })}
        </div>
      ) : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function Code({ children, ...props }) {
  let codeHTML = highlight(children)
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />
}

function flattenText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return `${value}`
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenText(item)).join('')
  }

  if (React.isValidElement(value)) {
    const element = value as React.ReactElement<{ children?: React.ReactNode }>
    return flattenText(element.props?.children)
  }

  return ''
}

function createHeading(level) {
  const Heading = ({ children }) => {
    let slug = slugifyHeading(flattenText(children))
    return React.createElement(
      `h${level}`,
      { id: slug },
      [
        React.createElement('a', {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: 'anchor',
        }),
      ],
      children
    )
  }

  Heading.displayName = `Heading${level}`

  return Heading
}

let components = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  BlurImage,
  RedactedImage: BlurImage,
  a: CustomLink,
  code: Code,
  Table,
}

function autolinkBareUrls(source: string) {
  const lines = source.split('\n')
  let inFence = false

  return lines
    .map((line) => {
      if (line.trim().startsWith('```')) {
        inFence = !inFence
        return line
      }

      if (inFence) {
        return line
      }

      return line.replace(
        /(?<!\]\()(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
        '[$1]($1)'
      )
    })
    .join('\n')
}

export function CustomMDX(props) {
  const source =
    typeof props.source === 'string' ? autolinkBareUrls(props.source) : props.source

  return (
    <MDXRemote
      {...props}
      source={source}
      components={{ ...components, ...(props.components || {}) }}
    />
  )
}

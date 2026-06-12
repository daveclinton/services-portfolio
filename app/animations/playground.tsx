'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs'
import {
  animationVocabulary,
  defaultAnimationOptions,
  getAllVocabularyEntries,
  type AnimationOptions,
  type AnimationVocabularyEntry,
} from './data'

type TreeRow =
  | { type: 'category'; id: string; name: string; depth: 0; count: number }
  | { type: 'entry'; id: string; name: string; depth: 1; entry: AnimationVocabularyEntry; categoryName: string }

const allEntries = getAllVocabularyEntries()

const targets = ['card', 'dot', 'label'] as const
const units = ['ms', 's'] as const
const stepPositions = ['start', 'end'] as const
const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const
const fillModes = ['none', 'forwards', 'backwards', 'both'] as const
const easingOptions = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.22, 1, 0.36, 1)',
  'cubic-bezier(0.16, 1, 0.3, 1)',
] as const

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function fuzzyMatch(value: string, query: string) {
  const normalizedValue = value.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  let queryIndex = 0
  for (const char of normalizedValue) {
    if (char === normalizedQuery[queryIndex]) {
      queryIndex += 1
    }
    if (queryIndex === normalizedQuery.length) {
      return true
    }
  }

  return false
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const trimmedQuery = query.trim().toLowerCase()
  if (!trimmedQuery) {
    return <>{name}</>
  }

  const lowerName = name.toLowerCase()
  const start = lowerName.indexOf(trimmedQuery)
  if (start === -1) {
    return <>{name}</>
  }

  const end = start + trimmedQuery.length
  return (
    <>
      {name.slice(0, start)}
      <mark>{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  )
}

function flattenTree(expanded: Set<string>, query: string): TreeRow[] {
  const rows: TreeRow[] = []
  const hasQuery = Boolean(query.trim())

  animationVocabulary.forEach((category) => {
    const entries = category.entries.filter(
      (entry) =>
        fuzzyMatch(entry.name, query) ||
        fuzzyMatch(entry.description, query) ||
        fuzzyMatch(category.name, query)
    )

    if (!entries.length && hasQuery) {
      return
    }

    rows.push({
      type: 'category',
      id: category.id,
      name: category.name,
      depth: 0,
      count: entries.length || category.entries.length,
    })

    if (!expanded.has(category.id) && !hasQuery) {
      return
    }

    ;(hasQuery ? entries : category.entries).forEach((entry) => {
      rows.push({
        type: 'entry',
        id: entry.id,
        name: entry.name,
        depth: 1,
        entry,
        categoryName: category.name,
      })
    })
  })

  return rows
}

function makeCssName(id: string) {
  return `playground-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function timingFunction(options: AnimationOptions) {
  if (options.useSteps) {
    return `steps(${options.steps}, ${options.stepsPosition})`
  }
  return options.timingFunction
}

function animationShorthand(name: string, options: AnimationOptions) {
  const count = options.infinite ? 'infinite' : String(options.iterationCount)
  return `${name} ${options.duration}${options.durationUnit} ${timingFunction(options)} ${options.delay}${options.delayUnit} ${count} ${options.direction} ${options.fillMode}`
}

function generateCss(selected: typeof allEntries[number], options: AnimationOptions) {
  if (!selected.entry.implementation) {
    return `/* ${selected.entry.name} is in the registry, but it does not have keyframes yet.
   Implement it in app/animations/data.ts, then this drawer will generate live CSS. */`
  }

  const name = makeCssName(selected.entry.id)
  return `@keyframes ${name} {
${selected.entry.implementation.keyframes
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
}

.element {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  background-image: url('/ronaldo-trophy.jpeg');
  background-size: cover;
  background-position: center;
  animation: ${animationShorthand(name, options)};
}`
}

export function AnimationPlayground() {
  const firstEntry = allEntries[0]
  const [selectedId, setSelectedId] = useQueryState(
    'term',
    parseAsString.withDefault(firstEntry.entry.id).withOptions({ history: 'push' })
  )
  const [drawerOpen, setDrawerOpen] = useQueryState(
    'drawer',
    parseAsBoolean.withDefault(false)
  )
  const [options, setOptions] = useQueryStates({
    target: parseAsStringLiteral(targets).withDefault(defaultAnimationOptions.target),
    duration: parseAsInteger.withDefault(defaultAnimationOptions.duration),
    durationUnit: parseAsStringLiteral(units).withDefault(defaultAnimationOptions.durationUnit),
    timingFunction: parseAsString.withDefault(defaultAnimationOptions.timingFunction),
    useSteps: parseAsBoolean.withDefault(defaultAnimationOptions.useSteps),
    steps: parseAsInteger.withDefault(defaultAnimationOptions.steps),
    stepsPosition: parseAsStringLiteral(stepPositions).withDefault(defaultAnimationOptions.stepsPosition),
    delay: parseAsInteger.withDefault(defaultAnimationOptions.delay),
    delayUnit: parseAsStringLiteral(units).withDefault(defaultAnimationOptions.delayUnit),
    iterationCount: parseAsInteger.withDefault(defaultAnimationOptions.iterationCount),
    infinite: parseAsBoolean.withDefault(defaultAnimationOptions.infinite),
    direction: parseAsStringLiteral(directions).withDefault(defaultAnimationOptions.direction),
    fillMode: parseAsStringLiteral(fillModes).withDefault(defaultAnimationOptions.fillMode),
    manualOnly: parseAsBoolean.withDefault(defaultAnimationOptions.manualOnly),
  })
  const [expanded, setExpanded] = useState(() => new Set(animationVocabulary.map((category) => category.id)))
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const treeRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => flattenTree(expanded, query), [expanded, query])
  const selected = allEntries.find(({ entry }) => entry.id === selectedId) ?? firstEntry
  const isImplemented = Boolean(selected.entry.implementation)
  const implementedCount = allEntries.filter(({ entry }) => entry.implementation).length
  const css = useMemo(() => generateCss(selected, options), [selected, options])
  const cssName = makeCssName(selected.entry.id)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced && !options.manualOnly) {
      setOptions({ manualOnly: true })
    }
  }, [options.manualOnly, setOptions])

  useEffect(() => {
    if (!drawerOpen) {
      return
    }
    drawerRef.current?.focus()
  }, [drawerOpen])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setDrawerOpen])

  function updateOptions(next: Partial<AnimationOptions>) {
    setOptions(next)
    if (!options.manualOnly) {
      setPlayKey((key) => key + 1)
    }
  }

  function selectEntry(entry: AnimationVocabularyEntry) {
    setSelectedId(entry.id)
    setMobileSidebarOpen(false)
    setPlayKey((key) => key + 1)
  }

  function resetOptions() {
    setOptions(selected.entry.defaults ?? defaultAnimationOptions)
    setPlayKey((key) => key + 1)
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function onTreeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!rows.length) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIndex((index) => Math.min(rows.length - 1, index + 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex((index) => Math.max(0, index - 1))
    }

    if (event.key === 'Enter' || event.key === 'ArrowRight') {
      const row = rows[focusedIndex]
      if (!row) {
        return
      }
      event.preventDefault()
      if (row.type === 'entry') {
        selectEntry(row.entry)
      } else {
        toggleExpanded(row.id)
      }
    }

    if (event.key === 'ArrowLeft') {
      const row = rows[focusedIndex]
      if (!row || row.type === 'entry') {
        return
      }
      event.preventDefault()
      setExpanded((current) => {
        const next = new Set(current)
        next.delete(row.id)
        return next
      })
    }
  }

  async function copyCss() {
    await navigator.clipboard.writeText(css)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const animatedStyle =
    isImplemented && !options.manualOnly
      ? ({
          animation: animationShorthand(cssName, options),
        } as React.CSSProperties)
      : undefined

  return (
    <main
      className={cx(
        'animations-app',
        sidebarCollapsed && 'animations-sidebar-is-collapsed',
        mobileSidebarOpen && 'animations-sidebar-overlay-open',
        drawerOpen && 'animations-drawer-is-open'
      )}
      id="main-content"
    >
      <button
        className="animations-mobile-menu"
        type="button"
        onClick={() => {
          setMobileSidebarOpen(true)
          window.setTimeout(() => treeRef.current?.focus(), 0)
        }}
        aria-label="Open animation vocabulary"
      >
        <span />
        <span />
        <span />
      </button>

      <aside className="animations-sidebar" aria-label="Animation vocabulary">
        <div className="animations-sidebar-toolbar">
          <button
            type="button"
            className="animations-icon-button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '>' : '<'}
          </button>
          <strong>Animation Vocabulary</strong>
        </div>

        <label className="animations-search">
          <span className="sr-only">Search animation vocabulary</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setFocusedIndex(0)
            }}
            placeholder="Search vocabulary"
          />
        </label>

        <div
          ref={treeRef}
          className="animations-tree"
          role="tree"
          tabIndex={0}
          aria-label="Animation vocabulary categories"
          onKeyDown={onTreeKeyDown}
        >
          {rows.map((row, index) => {
            const expandedState = row.type === 'category' ? expanded.has(row.id) : undefined
            return (
              <button
                key={`${row.type}-${row.id}`}
                type="button"
                role="treeitem"
                aria-selected={row.type === 'entry' && selected.entry.id === row.id}
                aria-expanded={expandedState}
                tabIndex={index === focusedIndex ? 0 : -1}
                className={cx(
                  'animations-tree-row',
                  `animations-depth-${row.depth}`,
                  row.type === 'entry' && selected.entry.id === row.id && 'is-active',
                  index === focusedIndex && 'is-focused'
                )}
                onFocus={() => setFocusedIndex(index)}
                onClick={() => {
                  if (row.type === 'entry') {
                    selectEntry(row.entry)
                  } else {
                    toggleExpanded(row.id)
                  }
                }}
              >
                <span className="animations-tree-glyph">
                  {row.type === 'entry' ? '•' : expandedState ? '-' : '+'}
                </span>
                <span className="animations-tree-label">
                  <HighlightedName name={row.name} query={query} />
                </span>
                {row.type === 'category' && <span className="animations-tree-count">{row.count}</span>}
              </button>
            )
          })}
          {!rows.length && <p className="animations-empty-list">No vocabulary terms found.</p>}
        </div>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="animations-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close animation vocabulary"
        />
      )}

      <section className="animations-stage" aria-label="Preview stage">
        <style>
          {selected.entry.implementation
            ? `@keyframes ${cssName} { ${selected.entry.implementation.keyframes} }`
            : ''}
        </style>

        <div className="animations-stage-actions" aria-label="Preview actions">
          <button
            type="button"
            className="animations-icon-button"
            onClick={() => setPlayKey((key) => key + 1)}
            disabled={!isImplemented}
            aria-label="Replay animation"
          >
            ↻
          </button>
          <button
            type="button"
            className="animations-icon-button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Close code drawer' : 'Open code drawer'}
          >
            {'{ }'}
          </button>
        </div>

        <div className="animations-preview-wrap">
          <div className="animations-demo-shell" aria-label="Demo object" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <div
              key={`${playKey}-demo`}
              className="animations-demo-card"
              style={{
                backgroundImage: 'url(/ronaldo-trophy.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '300px',
                height: '300px',
                borderRadius: '12px',
                ...animatedStyle,
              }}
            />
          </div>
        </div>

        <div
          ref={drawerRef}
          className="animations-code-drawer"
          role="dialog"
          aria-label="Generated CSS"
          aria-modal="false"
          tabIndex={-1}
        >
          <div className="animations-drawer-header">
            <strong>Generated CSS</strong>
            <div>
              <button type="button" className="animations-text-button" onClick={copyCss}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="animations-icon-button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close code drawer"
              >
                ×
              </button>
            </div>
          </div>
          <pre className="animations-code-block">
            <code>{css}</code>
          </pre>
        </div>
      </section>

      <aside className="animations-options" aria-label="Animation options">
        <div className="animations-panel-header">
          <div>
            <span>{isImplemented ? 'Options' : 'Options pending implementation'}</span>
            <strong>{selected.entry.name}</strong>
          </div>
          <button type="button" className="animations-text-button" onClick={resetOptions}>
            Reset
          </button>
        </div>

        {!isImplemented && (
          <p className="animations-panel-empty">
            These controls are wired and URL-backed, but this vocabulary item does not
            have keyframes yet.
          </p>
        )}

        <form className="animations-control-list">
          <div className="animations-field-row">
            <label>
              <span>Duration</span>
              <input
                type="number"
                min="0"
                value={options.duration}
                onChange={(event) => updateOptions({ duration: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Unit</span>
              <select value={options.durationUnit} onChange={(event) => updateOptions({ durationUnit: event.target.value as AnimationOptions['durationUnit'] })}>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Timing</span>
            <select
              value={options.timingFunction}
              disabled={options.useSteps}
              onChange={(event) => updateOptions({ timingFunction: event.target.value })}
            >
              {easingOptions.map((easing) => (
                <option key={easing} value={easing}>
                  {easing}
                </option>
              ))}
            </select>
          </label>

          <label className="animations-check">
            <input
              type="checkbox"
              checked={options.useSteps}
              onChange={(event) => updateOptions({ useSteps: event.target.checked })}
            />
            <span>Use steps</span>
          </label>

          <div className="animations-field-row">
            <label>
              <span>Steps</span>
              <input
                type="number"
                min="1"
                disabled={!options.useSteps}
                value={options.steps}
                onChange={(event) => updateOptions({ steps: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Position</span>
              <select
                disabled={!options.useSteps}
                value={options.stepsPosition}
                onChange={(event) => updateOptions({ stepsPosition: event.target.value as AnimationOptions['stepsPosition'] })}
              >
                {stepPositions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="animations-field-row">
            <label>
              <span>Delay</span>
              <input
                type="number"
                min="0"
                value={options.delay}
                onChange={(event) => updateOptions({ delay: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Unit</span>
              <select value={options.delayUnit} onChange={(event) => updateOptions({ delayUnit: event.target.value as AnimationOptions['delayUnit'] })}>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="animations-check">
            <input
              type="checkbox"
              checked={options.infinite}
              onChange={(event) => updateOptions({ infinite: event.target.checked })}
            />
            <span>Infinite</span>
          </label>

          <label>
            <span>Iterations</span>
            <input
              type="number"
              min="1"
              disabled={options.infinite}
              value={options.iterationCount}
              onChange={(event) => updateOptions({ iterationCount: Number(event.target.value) })}
            />
          </label>

          <label>
            <span>Direction</span>
            <select value={options.direction} onChange={(event) => updateOptions({ direction: event.target.value as AnimationOptions['direction'] })}>
              {directions.map((direction) => (
                <option key={direction} value={direction}>
                  {direction}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Fill mode</span>
            <select value={options.fillMode} onChange={(event) => updateOptions({ fillMode: event.target.value as AnimationOptions['fillMode'] })}>
              {fillModes.map((fillMode) => (
                <option key={fillMode} value={fillMode}>
                  {fillMode}
                </option>
              ))}
            </select>
          </label>

          <label className="animations-check">
            <input
              type="checkbox"
              checked={options.manualOnly}
              onChange={(event) => updateOptions({ manualOnly: event.target.checked })}
            />
            <span>Play manually only</span>
          </label>

          <div className="animations-registry-panel">
            <dl>
              <div>
                <dt>Implemented</dt>
                <dd>{implementedCount}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{allEntries.length - implementedCount}</dd>
              </div>
            </dl>
          </div>
        </form>
      </aside>
    </main>
  )
}

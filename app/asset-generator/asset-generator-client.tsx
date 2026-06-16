'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'

const AssetKonvaBoard = dynamic(
  () => import('./asset-konva-board').then((mod) => mod.AssetKonvaBoard),
  {
    ssr: false,
    loading: () => <div className="asset-generator-konva-loading">Loading canvas...</div>,
  },
)

const assets = [
  {
    name: 'icon.png',
    width: 1024,
    height: 1024,
    note: 'Primary square app icon',
  },
  {
    name: 'logo-glow.png',
    width: 604,
    height: 604,
    note: 'Large glowing brand mark',
  },
  {
    name: 'android-icon-background.png',
    width: 512,
    height: 512,
    note: 'Adaptive icon background',
  },
  {
    name: 'android-icon-foreground.png',
    width: 512,
    height: 512,
    note: 'Adaptive icon foreground',
  },
  {
    name: 'android-icon-monochrome.png',
    width: 432,
    height: 432,
    note: 'Android themed icon mask',
  },
  {
    name: 'splash-icon.png',
    width: 228,
    height: 213,
    note: 'Splash screen center mark',
  },
  {
    name: 'favicon.png',
    width: 48,
    height: 48,
    note: 'Browser tab icon',
  },
] as const

const styles = ['Clean', 'Glow', 'Badge'] as const
const assetNames = assets.map((asset) => asset.name)
type AssetName = (typeof assetNames)[number]

const defaults = {
  iconText: 'Nova',
  backgroundColor: '#101114',
  textColor: '#f5f7fb',
  accentColor: '#57d6ff',
  style: 'Glow',
  selectedAsset: 'icon.png',
} as const

function getValidColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </svg>
  )
}

export function AssetGeneratorClient() {
  const [settings, setSettings] = useQueryStates(
    {
      text: parseAsString.withDefault(defaults.iconText),
      bg: parseAsString.withDefault(defaults.backgroundColor),
      fg: parseAsString.withDefault(defaults.textColor),
      accent: parseAsString.withDefault(defaults.accentColor),
      style: parseAsStringLiteral(styles).withDefault(defaults.style),
      asset: parseAsStringLiteral(assetNames).withDefault(defaults.selectedAsset),
    },
    {
      history: 'replace',
    },
  )

  const iconText = settings.text
  const backgroundColor = getValidColor(settings.bg, defaults.backgroundColor)
  const textColor = getValidColor(settings.fg, defaults.textColor)
  const accentColor = getValidColor(settings.accent, defaults.accentColor)
  const style = settings.style

  const selected = useMemo(
    () => assets.find((asset) => asset.name === settings.asset) ?? assets[0],
    [settings.asset],
  )

  const safeIconText = iconText.trim() || 'App'
  const iconTextLength = iconText.trim().length
  const iconTextState = iconTextLength >= 1 && iconTextLength <= 18 ? 'Good' : 'Adjust'

  return (
    <main className="asset-generator-app" id="main-content">
      <header className="asset-generator-toolbar" aria-label="Asset generator toolbar">
        <div className="asset-generator-brand">
          <Link href="/" aria-label="Back to home">
            daveclintonn
          </Link>
          <span>Asset generator</span>
        </div>
        <div className="asset-generator-actions">
          <button className="asset-generator-icon-button" type="button" title="Create assets">
            <PlayIcon />
            <span className="sr-only">Create assets</span>
          </button>
          <button className="asset-generator-primary-button" type="button">
            <DownloadIcon />
            <span>Download ZIP</span>
          </button>
        </div>
      </header>

      <section className="asset-generator-workspace" aria-label="Asset generator workspace">
        <section className="asset-generator-canvas-panel" aria-label="Preview canvas">
          <div className="asset-generator-canvas-header">
            <div>
              <p>Canvas</p>
              <strong>Expo asset set</strong>
            </div>
            <span>
              Selected: {selected.name} - {selected.width} x {selected.height}
            </span>
          </div>

          <div className="asset-generator-canvas">
            <div className="asset-generator-grid" aria-hidden="true" />
            <div className="asset-generator-stage">
              <AssetKonvaBoard
                assets={assets}
                selectedAsset={selected.name}
                iconText={safeIconText}
                backgroundColor={backgroundColor}
                textColor={textColor}
                accentColor={accentColor}
                style={style}
                onSelectAsset={(asset) => setSettings({ asset: asset as AssetName })}
              />
            </div>
          </div>
        </section>

        <aside className="asset-generator-sidebar" aria-label="Asset generator controls">
          <section className="asset-generator-panel">
            <div className="asset-generator-panel-heading">
              <strong>Text</strong>
              <span>{iconTextState}</span>
            </div>

            <label className="asset-generator-field">
              <span>Icon text</span>
              <input
                value={iconText}
                maxLength={24}
                onChange={(event) => setSettings({ text: event.target.value })}
                placeholder="Nova"
              />
              <small>Recommended: 1-18 characters. The canvas scales the text to fit.</small>
            </label>

            <div className="asset-generator-quality">
              <span>Icon text</span>
              <strong data-state={iconTextState.toLowerCase()}>{iconTextLength}/18</strong>
            </div>
          </section>

          <section className="asset-generator-panel">
            <div className="asset-generator-panel-heading">
              <strong>Style</strong>
              <span>{style}</span>
            </div>

            <div className="asset-generator-segmented" aria-label="Style">
              {styles.map((styleOption) => (
                <button
                  key={styleOption}
                  type="button"
                  className={style === styleOption ? 'is-active' : ''}
                  onClick={() => setSettings({ style: styleOption })}
                >
                  {styleOption}
                </button>
              ))}
            </div>

            <label className="asset-generator-color-field">
              <span>Background</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setSettings({ bg: event.target.value })}
              />
            </label>
            <label className="asset-generator-color-field">
              <span>Text</span>
              <input
                type="color"
                value={textColor}
                onChange={(event) => setSettings({ fg: event.target.value })}
              />
            </label>
            <label className="asset-generator-color-field">
              <span>Accent</span>
              <input
                type="color"
                value={accentColor}
                onChange={(event) => setSettings({ accent: event.target.value })}
              />
            </label>
          </section>

          <section className="asset-generator-panel">
            <div className="asset-generator-panel-heading">
              <strong>Assets</strong>
              <GridIcon />
            </div>
            <div className="asset-generator-asset-list">
              {assets.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  className={asset.name === selected.name ? 'is-active' : ''}
                  onClick={() => setSettings({ asset: asset.name })}
                >
                  <span>{asset.name}</span>
                  <small>
                    {asset.width} x {asset.height}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

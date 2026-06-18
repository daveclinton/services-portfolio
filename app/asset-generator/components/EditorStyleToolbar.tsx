import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Check,
  Code2,
  Hand,
  Pencil,
  Search,
  Type,
} from 'lucide-react'
import { fontOptions, fontWeights, textAlignOptions, textSizeOptions, textVerticalAlignOptions } from '../constants'
import type { FontKey, FontWeight, ShapeStrokeStyle, TextAlign, TextSizeKey, TextVerticalAlign } from '../types'
import { getTopPicksForTarget } from '../lib/color-palette'
import { getStyleDomainLabel, type CanvasStyleDomain, type StrokeFillLayer } from '../lib/style-domain'
import { ColorSwatchPicker } from './ColorSwatchPicker'

type EditorStyleToolbarProps = {
  styleDomain: CanvasStyleDomain
  backgroundColor: string
  backgroundOpacityValue: number
  textColor: string
  textColorOpacityValue: number
  textOpacityValue: number
  fontKey: FontKey
  fontWeight: FontWeight
  textSize: TextSizeKey
  textAlign: TextAlign
  textVerticalAlign: TextVerticalAlign
  strokeFillLayer: StrokeFillLayer | null
  strokeColor: string
  fillColor: string
  strokeFillOpacityValue: number
  openColorPicker: 'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash' | null
  isFontPickerOpen: boolean
  isTypographyOpen: boolean
  fontSearch: string
  hoveredFontKey: FontKey | null
  filteredSceneFonts: (typeof fontOptions)[number][]
  filteredAvailableFonts: (typeof fontOptions)[number][]
  filteredFontOptions: (typeof fontOptions)[number][]
  fontPickerRef: Ref<HTMLDivElement>
  textPropertiesRef: Ref<HTMLDivElement>
  backgroundColorPickerRef: Ref<HTMLDivElement>
  textColorPickerRef: Ref<HTMLDivElement>
  shapeStrokeColorPickerRef: Ref<HTMLDivElement>
  shapeFillColorPickerRef: Ref<HTMLDivElement>
  backgroundColorPickerTriggerRef: Ref<HTMLButtonElement>
  textColorPickerTriggerRef: Ref<HTMLButtonElement>
  shapeStrokeColorPickerTriggerRef: Ref<HTMLButtonElement>
  shapeFillColorPickerTriggerRef: Ref<HTMLButtonElement>
  onToggleColorPicker: (target: 'bg' | 'fg' | 'shapeStroke' | 'shapeFill') => void
  onBackgroundColorChange: (color: string) => void
  onBackgroundOpacityChange: (opacity: number) => void
  onTextColorChange: (color: string) => void
  onTextColorOpacityChange: (opacity: number) => void
  onStrokeColorChange: (color: string) => void
  onStrokeOpacityChange: (opacity: number) => void
  onFillColorChange: (color: string) => void
  onFillOpacityChange: (opacity: number) => void
  onToggleFontPicker: () => void
  onToggleTypography: () => void
  onFontSearchChange: (value: string) => void
  onHoverFont: (key: FontKey | null) => void
  onSelectFont: (key: FontKey) => void
  onSelectWeight: (weight: FontWeight) => void
  onSelectTextSize: (size: TextSizeKey) => void
  onSelectTextAlign: (align: TextAlign) => void
  onSelectTextVerticalAlign: (align: TextVerticalAlign) => void
  onSelectTextOpacity: (opacity: string) => void
  onEditText: () => void
  onFontPickerKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  isRectangleSelected?: boolean
  shapeStrokeWidth?: number
  shapeStrokeStyle?: ShapeStrokeStyle
  shapeCornerRadius?: number
  onSelectShapeStrokeWidth?: (width: number) => void
  onSelectShapeStrokeStyle?: (style: ShapeStrokeStyle) => void
  onSelectShapeCornerRadius?: (radius: number) => void
}

const quickFontOptions = fontOptions.filter((font) => ['rounded', 'sans', 'mono'].includes(font.key))

function getFontIcon(key: FontKey) {
  if (key === 'rounded') return <Hand aria-hidden="true" />
  if (key === 'mono') return <Code2 aria-hidden="true" />
  return <Type aria-hidden="true" />
}

function getTextAlignIcon(align: TextAlign) {
  if (align === 'left') return <AlignLeft aria-hidden="true" />
  if (align === 'right') return <AlignRight aria-hidden="true" />
  return <AlignCenter aria-hidden="true" />
}

function getTextVerticalAlignIcon(align: TextVerticalAlign) {
  if (align === 'top') return <AlignVerticalJustifyStart aria-hidden="true" />
  if (align === 'bottom') return <AlignVerticalJustifyEnd aria-hidden="true" />
  return <AlignVerticalJustifyCenter aria-hidden="true" />
}

function StylePanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="StylePanel__section">
      <legend>{title}</legend>
      <div className="StylePanel__section-content">{children}</div>
    </fieldset>
  )
}

export function EditorStyleToolbar({
  styleDomain,
  backgroundColor,
  backgroundOpacityValue,
  textColor,
  textColorOpacityValue,
  textOpacityValue,
  fontKey,
  fontWeight,
  textSize,
  textAlign,
  textVerticalAlign,
  strokeFillLayer,
  strokeColor,
  fillColor,
  strokeFillOpacityValue,
  openColorPicker,
  fontSearch,
  hoveredFontKey,
  filteredSceneFonts,
  filteredAvailableFonts,
  filteredFontOptions,
  fontPickerRef,
  backgroundColorPickerRef,
  textColorPickerRef,
  shapeStrokeColorPickerRef,
  shapeFillColorPickerRef,
  backgroundColorPickerTriggerRef,
  textColorPickerTriggerRef,
  shapeStrokeColorPickerTriggerRef,
  shapeFillColorPickerTriggerRef,
  onToggleColorPicker,
  onBackgroundColorChange,
  onBackgroundOpacityChange,
  onTextColorChange,
  onTextColorOpacityChange,
  onStrokeColorChange,
  onStrokeOpacityChange,
  onFillColorChange,
  onFillOpacityChange,
  onFontSearchChange,
  onHoverFont,
  onSelectFont,
  onSelectWeight,
  onSelectTextSize,
  onSelectTextAlign,
  onSelectTextVerticalAlign,
  onSelectTextOpacity,
  onEditText,
  onFontPickerKeyDown,
  isRectangleSelected = false,
  shapeStrokeWidth = 2,
  shapeStrokeStyle = 'solid',
  shapeCornerRadius = 0,
  onSelectShapeStrokeWidth,
  onSelectShapeStrokeStyle,
  onSelectShapeCornerRadius,
}: EditorStyleToolbarProps) {
  const fillIsTransparent = fillColor === 'transparent'

  return (
    <div className="selected-shape-actions shape-actions-theme-scope" aria-label="Canvas styling">
      <fieldset className="StylePanel__target">
        <legend aria-live="polite">{getStyleDomainLabel(styleDomain)}</legend>
      </fieldset>

      <div className="StylePanel__sections">
        {styleDomain === 'canvas' ? (
          <ColorSwatchPicker
            label="Background"
            value={backgroundColor}
            isOpen={openColorPicker === 'bg'}
            topPicks={getTopPicksForTarget('bg')}
            containerRef={backgroundColorPickerRef}
            triggerRef={backgroundColorPickerTriggerRef}
            opacity={backgroundOpacityValue}
            onToggle={() => onToggleColorPicker('bg')}
            onChange={onBackgroundColorChange}
          />
        ) : null}

        {styleDomain === 'text' ? (
          <>
            <StylePanelSection title="Font family">
              <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Default fonts">
                {quickFontOptions.map((font) => (
                  <button
                    key={font.key}
                    type="button"
                    className={`properties-trigger ${fontKey === font.key ? 'active' : ''}`}
                    aria-label={font.label}
                    aria-checked={fontKey === font.key}
                    role="radio"
                    title={font.label}
                    onClick={() => onSelectFont(font.key)}
                  >
                    {getFontIcon(font.key)}
                  </button>
                ))}
              </div>

              <div className="StylePanel__font-search" ref={fontPickerRef} onKeyDown={onFontPickerKeyDown}>
                <label className="quick-search">
                  <Search aria-hidden="true" />
                  <input
                    className="quick-search-input"
                    type="text"
                    placeholder="Search fonts..."
                    aria-label="Search fonts"
                    value={fontSearch}
                    onChange={(event) => onFontSearchChange(event.target.value)}
                  />
                </label>

                <div className="dropdown-menu fonts manual-hover StylePanel__font-list">
                  {filteredSceneFonts.length ? (
                    <div className="dropdown-menu-group">
                      <div className="dropdown-menu-group-title">Scene Fonts</div>
                      {filteredSceneFonts.map((font) => (
                        <button
                          key={font.key}
                          type="button"
                          className={`dropdown-menu-item ${fontKey === font.key ? 'selected' : ''} ${
                            hoveredFontKey === font.key ? 'hovered' : ''
                          }`}
                          title={font.label}
                          onClick={() => onSelectFont(font.key)}
                          onMouseMove={() => onHoverFont(font.key)}
                        >
                          {fontKey === font.key ? <Check aria-hidden="true" /> : getFontIcon(font.key)}
                          <span className="dropdown-menu-item-content" style={{ fontFamily: font.family }}>
                            {font.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {filteredAvailableFonts.length ? (
                    <div className="dropdown-menu-group">
                      <div className="dropdown-menu-group-title">Available Fonts</div>
                      {filteredAvailableFonts.map((font) => (
                        <button
                          key={font.key}
                          type="button"
                          className={`dropdown-menu-item ${fontKey === font.key ? 'selected' : ''} ${
                            hoveredFontKey === font.key ? 'hovered' : ''
                          }`}
                          title={font.label}
                          onClick={() => onSelectFont(font.key)}
                          onMouseMove={() => onHoverFont(font.key)}
                        >
                          {fontKey === font.key ? <Check aria-hidden="true" /> : getFontIcon(font.key)}
                          <span className="dropdown-menu-item-content" style={{ fontFamily: font.family }}>
                            {font.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!filteredFontOptions.length ? <div className="dropdown-menu-empty">No fonts found</div> : null}
                </div>
              </div>
            </StylePanelSection>

            <StylePanelSection title="Font size">
              <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Font size">
                {textSizeOptions.map((size) => (
                  <button
                    key={size.key}
                    type="button"
                    className={`properties-trigger text-size-trigger ${textSize === size.key ? 'active' : ''}`}
                    aria-label={`${size.label} font size`}
                    aria-checked={textSize === size.key}
                    role="radio"
                    onClick={() => onSelectTextSize(size.key)}
                  >
                    <span>{size.label}</span>
                  </button>
                ))}
              </div>
            </StylePanelSection>

            <StylePanelSection title="Weight">
              <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Text weight">
                {fontWeights.map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    className={`properties-trigger typography-trigger ${fontWeight === weight ? 'active' : ''}`}
                    aria-label={`Text weight ${weight}`}
                    aria-checked={fontWeight === weight}
                    role="radio"
                    onClick={() => onSelectWeight(weight)}
                  >
                    <span style={{ fontWeight: weight }}>{weight === '700' ? 'B' : weight === '800' ? 'H' : 'K'}</span>
                  </button>
                ))}
              </div>
            </StylePanelSection>

            <StylePanelSection title="Text alignment">
              <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Text alignment">
                {textAlignOptions.map((align) => (
                  <button
                    key={align.key}
                    type="button"
                    className={`properties-trigger align-trigger ${textAlign === align.key ? 'active' : ''}`}
                    aria-label={`${align.label} align text`}
                    aria-checked={textAlign === align.key}
                    role="radio"
                    onClick={() => onSelectTextAlign(align.key)}
                  >
                    {getTextAlignIcon(align.key)}
                  </button>
                ))}
              </div>
            </StylePanelSection>

            <StylePanelSection title="Vertical alignment">
              <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Vertical text alignment">
                {textVerticalAlignOptions.map((align) => (
                  <button
                    key={align.key}
                    type="button"
                    className={`properties-trigger align-trigger ${textVerticalAlign === align.key ? 'active' : ''}`}
                    aria-label={`${align.label} vertical align text`}
                    aria-checked={textVerticalAlign === align.key}
                    role="radio"
                    onClick={() => onSelectTextVerticalAlign(align.key)}
                  >
                    {getTextVerticalAlignIcon(align.key)}
                  </button>
                ))}
              </div>
            </StylePanelSection>

            <StylePanelSection title="Opacity">
              <div className="opacity-slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={textOpacityValue}
                  className="opacity-slider"
                  aria-label="Text opacity"
                  onChange={(event) => onSelectTextOpacity(event.target.value)}
                />
                <span className="opacity-value">{textOpacityValue}%</span>
              </div>
            </StylePanelSection>

            <ColorSwatchPicker
              label="Text"
              value={textColor}
              isOpen={openColorPicker === 'fg'}
              topPicks={getTopPicksForTarget('fg')}
              containerRef={textColorPickerRef}
              triggerRef={textColorPickerTriggerRef}
              opacity={textColorOpacityValue}
              onToggle={() => onToggleColorPicker('fg')}
              onChange={onTextColorChange}
            />

            <fieldset className="StylePanel__section">
              <button type="button" className="text-properties-edit-button StylePanel__edit-text" onClick={onEditText}>
                <Pencil aria-hidden="true" />
                <span>Edit text</span>
              </button>
            </fieldset>
          </>
        ) : null}

        {styleDomain === 'shape' || styleDomain === 'frame' ? (
          <>
            <ColorSwatchPicker
              label="Stroke"
              value={strokeColor}
              isOpen={openColorPicker === 'shapeStroke'}
              topPicks={getTopPicksForTarget('shapeStroke')}
              containerRef={shapeStrokeColorPickerRef}
              triggerRef={shapeStrokeColorPickerTriggerRef}
              opacity={strokeFillOpacityValue}
              disabled={!strokeFillLayer}
              onToggle={() => {
                if (strokeFillLayer) onToggleColorPicker('shapeStroke')
              }}
              onChange={onStrokeColorChange}
            />

            <ColorSwatchPicker
              label="Fill"
              value={fillIsTransparent ? '#ffffff' : fillColor}
              isOpen={openColorPicker === 'shapeFill'}
              topPicks={getTopPicksForTarget('shapeFill')}
              containerRef={shapeFillColorPickerRef}
              triggerRef={shapeFillColorPickerTriggerRef}
              opacity={fillIsTransparent ? 0 : strokeFillOpacityValue}
              disabled={!strokeFillLayer}
              onToggle={() => {
                if (strokeFillLayer) onToggleColorPicker('shapeFill')
              }}
              onChange={onFillColorChange}
            />

            {isRectangleSelected ? (
              <>
                <StylePanelSection title="Stroke width">
                  <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Stroke width">
                    {[1, 2, 4].map((width) => (
                      <button
                        key={width}
                        type="button"
                        className={`properties-trigger ${shapeStrokeWidth === width ? 'active' : ''}`}
                        aria-label={`Stroke width ${width}`}
                        onClick={() => onSelectShapeStrokeWidth?.(width)}
                      >
                        <span>{width}px</span>
                      </button>
                    ))}
                  </div>
                </StylePanelSection>

                <StylePanelSection title="Stroke style">
                  <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Stroke style">
                    {(['solid', 'dashed', 'dotted'] as ShapeStrokeStyle[]).map((style) => (
                      <button
                        key={style}
                        type="button"
                        className={`properties-trigger ${shapeStrokeStyle === style ? 'active' : ''}`}
                        aria-label={`${style} stroke`}
                        onClick={() => onSelectShapeStrokeStyle?.(style)}
                      >
                        <span>{style}</span>
                      </button>
                    ))}
                  </div>
                </StylePanelSection>

                <StylePanelSection title="Corner radius">
                  <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Corner radius">
                    {[0, 8, 16, 24].map((radius) => (
                      <button
                        key={radius}
                        type="button"
                        className={`properties-trigger ${shapeCornerRadius === radius ? 'active' : ''}`}
                        aria-label={`Corner radius ${radius}`}
                        onClick={() => onSelectShapeCornerRadius?.(radius)}
                      >
                        <span>{radius}</span>
                      </button>
                    ))}
                  </div>
                </StylePanelSection>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
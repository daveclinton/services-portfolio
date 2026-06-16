'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import {
  Circle,
  FastLayer,
  Group,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva'

Konva.autoDrawEnabled = true
Konva.hitOnDragEnabled = true
Konva.capturePointerEventsEnabled = true
Konva.dragDistance = 4
Konva.releaseCanvasOnDestroy = true

type AssetTarget = {
  name: string
  width: number
  height: number
  note: string
}

type AssetKonvaBoardProps = {
  assets: readonly AssetTarget[]
  selectedAsset: string
  iconText: string
  backgroundColor: string
  textColor: string
  accentColor: string
  style: 'Clean' | 'Glow' | 'Badge'
  onSelectAsset: (assetName: string) => void
}

const boardPadding = 40
const labelHeight = 22
const footerHeight = 20
const frameGap = 30
const phoneAreaWidth = 310
const phoneWidth = 216
const phoneHeight = 450
const maxRowWidth = 1180
const gridSize = 24

function getFrameSize(asset: AssetTarget) {
  const scale = 0.18
  return {
    width: Math.max(56, Math.round(asset.width * scale)),
    height: Math.max(56, Math.round(asset.height * scale)),
  }
}

function getLayout(assets: readonly AssetTarget[]) {
  let x = boardPadding + phoneAreaWidth
  let y = boardPadding
  let rowHeight = 0
  let boardWidth = 0

  const frames = assets.map((asset) => {
    const preview = getFrameSize(asset)
    const frameWidth = Math.max(preview.width, 160)
    const frameHeight = labelHeight + preview.height + footerHeight + 24

    if (x > boardPadding + phoneAreaWidth && x + frameWidth > maxRowWidth) {
      x = boardPadding + phoneAreaWidth
      y += rowHeight + frameGap
      rowHeight = 0
    }

    const frame = {
      asset,
      x,
      y,
      width: frameWidth,
      height: frameHeight,
      preview,
      previewX: x + (frameWidth - preview.width) / 2,
      previewY: y + labelHeight + 10,
    }

    x += frameWidth + frameGap
    rowHeight = Math.max(rowHeight, frameHeight)
    boardWidth = Math.max(boardWidth, frame.x + frame.width + boardPadding)

    return frame
  })

  const boardHeight = y + rowHeight + boardPadding

  return {
    frames,
    phone: {
      x: boardPadding,
      y: boardPadding + 12,
      width: phoneWidth,
      height: phoneHeight,
    },
    width: Math.max(boardWidth, 1220),
    height: Math.max(boardHeight, phoneHeight + boardPadding * 2 + 24, 620),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getFittedFontSize(text: string, width: number, maxSize: number, minSize = 9) {
  const normalizedLength = Math.max(text.trim().length, 1)
  const approximate = (width * 1.42) / normalizedLength
  return clamp(approximate, minSize, maxSize)
}

export function AssetKonvaBoard({
  assets,
  selectedAsset,
  iconText,
  backgroundColor,
  textColor,
  accentColor,
  style,
  onSelectAsset,
}: AssetKonvaBoardProps) {
  const layout = useMemo(() => getLayout(assets), [assets])
  const selectedMarkRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [markOffset, setMarkOffset] = useState({ x: 0, y: 0 })
  const [markScale, setMarkScale] = useState(1)
  const displayText = iconText.trim() || 'App'
  const phoneMode = selectedAsset === 'splash-icon.png' ? 'Splash preview' : 'Home screen'
  const gridLines = useMemo(() => {
    const lines: Array<{ points: number[] }> = []

    for (let x = 0; x <= layout.width; x += gridSize) {
      lines.push({ points: [x, 0, x, layout.height] })
    }

    for (let y = 0; y <= layout.height; y += gridSize) {
      lines.push({ points: [0, y, layout.width, y] })
    }

    return lines
  }, [layout.height, layout.width])

  useEffect(() => {
    const transformer = transformerRef.current
    const selectedMark = selectedMarkRef.current

    if (!transformer || !selectedMark) return

    transformer.nodes([selectedMark])
    transformer.getLayer()?.batchDraw()
  }, [selectedAsset, style, displayText])

  return (
    <Stage width={layout.width} height={layout.height}>
      <FastLayer listening={false}>
        {gridLines.map((line, index) => (
          <Line
            key={index}
            points={line.points}
            stroke="rgba(255, 255, 255, 0.045)"
            strokeWidth={1}
          />
        ))}
      </FastLayer>

      <Layer>
        <PhoneMockup
          x={layout.phone.x}
          y={layout.phone.y}
          width={layout.phone.width}
          height={layout.phone.height}
          iconText={displayText}
          backgroundColor={backgroundColor}
          textColor={textColor}
          accentColor={accentColor}
          style={style}
          mode={phoneMode}
        />

        {layout.frames.map((frame) => {
          const isSelected = frame.asset.name === selectedAsset
          const isTiny = frame.asset.width <= 64 || frame.asset.height <= 64
          const radius = isTiny ? 8 : 18
          const baseMarkWidth = (isTiny ? frame.preview.width * 0.78 : frame.preview.width * 0.72) * markScale
          const markHeight = (isTiny ? frame.preview.height * 0.56 : frame.preview.height * 0.42) * markScale
          const baseMarkX = frame.previewX + (frame.preview.width - baseMarkWidth) / 2
          const baseMarkY =
            frame.previewY + (frame.preview.height - markHeight) / 2 - (isTiny ? 0 : 4)
          const markX = baseMarkX + markOffset.x * frame.preview.width
          const markY = baseMarkY + markOffset.y * frame.preview.height
          const fontSize = getFittedFontSize(
            displayText,
            baseMarkWidth,
            isTiny ? 17 : Math.max(22, frame.preview.width * 0.24),
            isTiny ? 8 : 12,
          )

          return (
            <Group
              key={frame.asset.name}
              x={0}
              y={0}
              onClick={() => onSelectAsset(frame.asset.name)}
              onTap={() => onSelectAsset(frame.asset.name)}
              onMouseEnter={(event) => {
                const stage = event.target.getStage()
                if (stage) stage.container().style.cursor = 'pointer'
              }}
              onMouseLeave={(event) => {
                const stage = event.target.getStage()
                if (stage) stage.container().style.cursor = 'default'
              }}
            >
              <Text
                x={frame.x}
                y={frame.y}
                width={frame.width - 20}
                height={14}
                text={frame.asset.name}
                fontFamily="Inter, system-ui, sans-serif"
                fontSize={11}
                fill="rgba(242, 242, 242, 0.68)"
                ellipsis
              />
              <Rect
                x={frame.previewX}
                y={frame.previewY}
                width={frame.preview.width}
                height={frame.preview.height}
                cornerRadius={radius}
                fill={backgroundColor}
                stroke={isSelected ? accentColor : 'rgba(255, 255, 255, 0.14)'}
                strokeWidth={isSelected ? 2 : 1}
                shadowColor="black"
                shadowOpacity={0.28}
                shadowBlur={20}
                shadowOffsetY={10}
              />
              <Rect
                x={frame.previewX}
                y={frame.previewY}
                width={frame.preview.width}
                height={frame.preview.height}
                cornerRadius={radius}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{
                  x: frame.preview.width,
                  y: frame.preview.height,
                }}
                fillLinearGradientColorStops={[
                  0,
                  style === 'Badge' ? 'rgba(255,255,255,0.13)' : `${accentColor}4d`,
                  0.46,
                  'rgba(255,255,255,0)',
                  1,
                  'rgba(255,255,255,0)',
                ]}
              />
              {style === 'Glow' && !isTiny ? (
                <Circle
                  x={frame.previewX + frame.preview.width / 2}
                  y={frame.previewY + frame.preview.height / 2}
                  radius={frame.preview.width * 0.23}
                  fill={accentColor}
                  opacity={0.34}
                  shadowColor={accentColor}
                  shadowBlur={30}
                  shadowOpacity={0.7}
                />
              ) : null}
              {!isTiny ? (
                <Rect
                  x={frame.previewX + frame.preview.width * 0.11}
                  y={frame.previewY + frame.preview.height * 0.11}
                  width={frame.preview.width * 0.78}
                  height={frame.preview.height * 0.78}
                  cornerRadius={radius}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth={1}
                />
              ) : null}
              <Group
                ref={isSelected ? selectedMarkRef : undefined}
                x={markX}
                y={markY}
                draggable={isSelected}
                onDragStart={() => onSelectAsset(frame.asset.name)}
                onDragEnd={(event) => {
                  const node = event.target
                  const nextX =
                    (node.x() - baseMarkX) / Math.max(frame.preview.width, 1)
                  const nextY =
                    (node.y() - baseMarkY) / Math.max(frame.preview.height, 1)
                  setMarkOffset({
                    x: clamp(nextX, -0.36, 0.36),
                    y: clamp(nextY, -0.36, 0.36),
                  })
                }}
                onTransformEnd={() => {
                  const node = selectedMarkRef.current
                  if (!node) return
                  const nextScale = clamp(markScale * node.scaleX(), 0.65, 1.55)
                  node.scale({ x: 1, y: 1 })
                  setMarkScale(nextScale)
                }}
                dragBoundFunc={(position) => ({
                  x: clamp(
                    position.x,
                    frame.previewX - baseMarkWidth * 0.12,
                    frame.previewX + frame.preview.width - baseMarkWidth * 0.88,
                  ),
                  y: clamp(
                    position.y,
                    frame.previewY - markHeight * 0.12,
                    frame.previewY + frame.preview.height - markHeight * 0.88,
                  ),
                })}
              >
                <Rect
                  x={0}
                  y={0}
                  width={baseMarkWidth}
                  height={markHeight}
                  fill="rgba(255,255,255,0.001)"
                />
                <Text
                  x={0}
                  y={0}
                  width={baseMarkWidth}
                  height={markHeight}
                  text={displayText}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize={fontSize}
                  fontStyle="800"
                  align="center"
                  verticalAlign="middle"
                  fill={textColor}
                />
              </Group>
              <Text
                x={frame.x}
                y={frame.previewY + frame.preview.height + 10}
                width={frame.width - 20}
                height={12}
                text={`${frame.asset.width} x ${frame.asset.height}`}
                fontFamily="Inter, system-ui, sans-serif"
                fontSize={10}
                align="center"
                fill="rgba(242, 242, 242, 0.42)"
              />
            </Group>
          )
        })}
      </Layer>

      <Layer>
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke={accentColor}
          borderStrokeWidth={1.5}
          anchorFill="#ffffff"
          anchorStroke={accentColor}
          anchorSize={7}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 24 || newBox.height < 24 || newBox.width > 160) {
              return oldBox
            }
            return newBox
          }}
        />
      </Layer>
    </Stage>
  )
}

type PhoneMockupProps = {
  x: number
  y: number
  width: number
  height: number
  iconText: string
  backgroundColor: string
  textColor: string
  accentColor: string
  style: 'Clean' | 'Glow' | 'Badge'
  mode: 'Home screen' | 'Splash preview'
}

function PhoneMockup({
  x,
  y,
  width,
  height,
  iconText,
  backgroundColor,
  textColor,
  accentColor,
  style,
  mode,
}: PhoneMockupProps) {
  const screenInset = 10
  const screenX = x + screenInset
  const screenY = y + screenInset
  const screenWidth = width - screenInset * 2
  const screenHeight = height - screenInset * 2
  const iconSize = 52
  const iconX = screenX + 22
  const iconY = screenY + 66
  const splashSize = 76
  const splashX = screenX + (screenWidth - splashSize) / 2
  const splashY = screenY + (screenHeight - splashSize) / 2 - 8
  const markRadius = style === 'Badge' ? iconSize / 2 : 15

  return (
    <Group>
      <Text
        x={x}
        y={y - 24}
        width={width}
        text="Phone preview"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={12}
        fontStyle="700"
        fill="rgba(242, 242, 242, 0.72)"
      />
      <Text
        x={x}
        y={y - 8}
        width={width}
        text={mode}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={10}
        fill="rgba(242, 242, 242, 0.42)"
      />

      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        cornerRadius={34}
        fill="#08090b"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={4}
        shadowColor="black"
        shadowBlur={28}
        shadowOpacity={0.4}
        shadowOffsetY={18}
      />
      <Rect
        x={x + 5}
        y={y + 5}
        width={width - 10}
        height={height - 10}
        cornerRadius={29}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />
      <Rect
        x={screenX}
        y={screenY}
        width={screenWidth}
        height={screenHeight}
        cornerRadius={28}
        fill="#15171b"
      />
      <Group
        clipX={screenX}
        clipY={screenY}
        clipWidth={screenWidth}
        clipHeight={screenHeight}
      >
        <Rect
          x={screenX}
          y={screenY}
          width={screenWidth}
          height={screenHeight}
          fillLinearGradientStartPoint={{ x: screenX, y: screenY }}
          fillLinearGradientEndPoint={{
            x: screenX + screenWidth,
            y: screenY + screenHeight,
          }}
          fillLinearGradientColorStops={[
            0,
            '#181b21',
            0.55,
            '#101114',
            1,
            '#23252b',
          ]}
        />
        <Circle
          x={screenX + screenWidth * 0.5}
          y={screenY + screenHeight * 0.48}
          radius={78}
          fill={accentColor}
          opacity={0.1}
          shadowColor={accentColor}
          shadowBlur={64}
          shadowOpacity={0.36}
        />

        {mode === 'Splash preview' ? (
          <>
            <GeneratedIcon
              x={splashX}
              y={splashY}
              size={splashSize}
              iconText={iconText}
              backgroundColor={backgroundColor}
              textColor={textColor}
              accentColor={accentColor}
              cornerRadius={style === 'Badge' ? splashSize / 2 : 22}
            />
            <Text
              x={screenX}
              y={splashY + splashSize + 18}
              width={screenWidth}
              text={iconText}
              fontFamily="Inter, system-ui, sans-serif"
              fontSize={14}
              fontStyle="700"
              align="center"
              fill="rgba(255,255,255,0.82)"
              ellipsis
            />
          </>
        ) : (
          <>
            {Array.from({ length: 12 }).map((_, index) => {
              const col = index % 4
              const row = Math.floor(index / 4)
              const mutedX = screenX + 22 + col * 43
              const mutedY = screenY + 160 + row * 64

              return (
                <Group key={index}>
                  <Rect
                    x={mutedX}
                    y={mutedY}
                    width={30}
                    height={30}
                    cornerRadius={9}
                    fill="rgba(255,255,255,0.08)"
                  />
                  <Rect
                    x={mutedX + 4}
                    y={mutedY + 38}
                    width={22}
                    height={3}
                    cornerRadius={2}
                    fill="rgba(255,255,255,0.12)"
                  />
                </Group>
              )
            })}
            <GeneratedIcon
              x={iconX}
              y={iconY}
              size={iconSize}
              iconText={iconText}
              backgroundColor={backgroundColor}
              textColor={textColor}
              accentColor={accentColor}
              cornerRadius={markRadius}
            />
            <Text
              x={iconX - 10}
              y={iconY + iconSize + 8}
              width={iconSize + 20}
              text={iconText}
              fontFamily="Inter, system-ui, sans-serif"
              fontSize={10}
              align="center"
              fill="rgba(255,255,255,0.78)"
              ellipsis
            />
          </>
        )}
      </Group>

      <Rect
        x={x + width / 2 - 34}
        y={y + 8}
        width={68}
        height={18}
        cornerRadius={999}
        fill="#07080a"
      />
      <Rect x={x - 7} y={y + 72} width={5} height={27} cornerRadius={3} fill="#08090b" />
      <Rect x={x - 7} y={y + 118} width={5} height={43} cornerRadius={3} fill="#08090b" />
      <Rect x={x - 7} y={y + 176} width={5} height={43} cornerRadius={3} fill="#08090b" />
      <Rect x={x + width + 2} y={y + 122} width={5} height={58} cornerRadius={3} fill="#08090b" />
    </Group>
  )
}

type GeneratedIconProps = {
  x: number
  y: number
  size: number
  iconText: string
  backgroundColor: string
  textColor: string
  accentColor: string
  cornerRadius: number
}

function GeneratedIcon({
  x,
  y,
  size,
  iconText,
  backgroundColor,
  textColor,
  accentColor,
  cornerRadius,
}: GeneratedIconProps) {
  const fontSize = getFittedFontSize(iconText, size * 0.78, size * 0.34, 8)

  return (
    <Group>
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        cornerRadius={cornerRadius}
        fill={backgroundColor}
        shadowColor="black"
        shadowBlur={14}
        shadowOpacity={0.35}
        shadowOffsetY={8}
      />
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        cornerRadius={cornerRadius}
        fillLinearGradientStartPoint={{ x, y }}
        fillLinearGradientEndPoint={{ x: x + size, y: y + size }}
        fillLinearGradientColorStops={[0, `${accentColor}88`, 0.6, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0.1)']}
      />
      <Text
        x={x + size * 0.1}
        y={y + size * 0.18}
        width={size * 0.8}
        height={size * 0.64}
        text={iconText}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={fontSize}
        fontStyle="800"
        align="center"
        verticalAlign="middle"
        fill={textColor}
      />
    </Group>
  )
}

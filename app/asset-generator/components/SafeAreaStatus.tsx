import { hasSafeAreaViolations, getElementsOutsideSafeArea } from '../lib/common/safeArea'
import type { AssetElement } from '../lib/element/types'

type SafeAreaStatusProps = {
  elements: readonly AssetElement[]
}

export function SafeAreaStatus({ elements }: SafeAreaStatusProps) {
  const violations = getElementsOutsideSafeArea(elements)
  const hasViolations = hasSafeAreaViolations(elements)

  return (
    <div
      className={`asset-excalidraw-sidebar-section asset-safe-area-status${
        hasViolations ? ' is-warning' : ' is-ok'
      }`}
    >
      <span>Safe area</span>
      <strong>{hasViolations ? `${violations.length} outside` : 'All clear'}</strong>
      <small>
        {hasViolations
          ? 'Keep important content inside the dashed 820px guide.'
          : 'Content fits the recommended iOS safe zone.'}
      </small>
    </div>
  )
}
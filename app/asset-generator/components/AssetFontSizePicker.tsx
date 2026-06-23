"use client"

const FONT_SIZE_OPTIONS = [
  { id: "small", label: "Small", value: 64 },
  { id: "medium", label: "Medium", value: 96 },
  { id: "large", label: "Large", value: 144 },
  { id: "veryLarge", label: "Very large", value: 192 },
] as const

type AssetFontSizePickerProps = {
  value: number
  onChange: (fontSize: number) => void
}

function SizeIcon({ id }: { id: (typeof FONT_SIZE_OPTIONS)[number]["id"] }) {
  if (id === "small") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M14.167 6.667a3.333 3.333 0 0 0-3.334-3.334H9.167a3.333 3.333 0 0 0 0 6.667h1.666a3.333 3.333 0 0 1 0 6.667H9.167a3.333 3.333 0 0 1-3.334-3.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (id === "medium") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 16.667V3.333L10 15l5-11.667v13.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (id === "large") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M5.833 3.333v13.334h8.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m1.667 3.333 6.666 13.334M8.333 3.333 1.667 16.667M11.667 3.333v13.334h6.666"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getActiveFontSizeId(value: number) {
  return FONT_SIZE_OPTIONS.reduce((closest, option) => {
    const closestDistance = Math.abs(closest.value - value)
    const optionDistance = Math.abs(option.value - value)
    return optionDistance < closestDistance ? option : closest
  }, FONT_SIZE_OPTIONS[0]).id
}

export function AssetFontSizePicker({ value, onChange }: AssetFontSizePickerProps) {
  const activeId = getActiveFontSizeId(value)

  return (
    <fieldset className="asset-sidebar-fieldset">
      <legend>Font size</legend>
      <div className="asset-font-size-list" role="radiogroup" aria-label="Font size">
        {FONT_SIZE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={activeId === option.id ? "is-active" : undefined}
            title={option.label}
          >
            <input
              type="radio"
              name="asset-font-size"
              checked={activeId === option.id}
              data-testid={`fontSize-${option.id}`}
              onChange={() => onChange(option.value)}
            />
            <SizeIcon id={option.id} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

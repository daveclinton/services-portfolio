// Flat illustrations drawn for this site, in the spirit of Wise's: a few bold
// shapes, no outlines. Decorative, so they are hidden from assistive technology.
const shared = { viewBox: "0 0 240 150", "aria-hidden": true, className: "work-art" } as const

export function ConnectArt() {
  return (
    <svg {...shared}>
      <path d="M52 75h136" stroke="var(--art-b)" strokeWidth="14" strokeLinecap="round" />
      <path d="M120 75V34M120 75v41" stroke="var(--art-b)" strokeWidth="14" strokeLinecap="round" />
      <rect x="18" y="45" width="60" height="60" rx="18" fill="var(--art-a)" />
      <circle cx="48" cy="75" r="13" fill="var(--art-c)" />
      <circle cx="192" cy="75" r="32" fill="var(--art-a)" />
      <path d="M178 75h28M192 61v28" stroke="var(--art-c)" strokeWidth="9" strokeLinecap="round" />
      <rect x="96" y="51" width="48" height="48" rx="24" fill="var(--art-c)" />
      <circle cx="120" cy="24" r="16" fill="var(--art-a)" />
      <circle cx="120" cy="126" r="16" fill="var(--art-a)" />
    </svg>
  )
}

export function ControlArt() {
  return (
    <svg {...shared}>
      <rect x="22" y="24" width="150" height="102" rx="24" fill="var(--art-a)" />
      <rect x="44" y="48" width="84" height="13" rx="6.5" fill="var(--art-c)" />
      <rect x="44" y="72" width="56" height="13" rx="6.5" fill="var(--art-b)" />
      <rect x="44" y="96" width="70" height="13" rx="6.5" fill="var(--art-b)" />
      <path d="M160 73V56a22 22 0 0 1 44 0v17" fill="none" stroke="var(--art-b)" strokeWidth="12" />
      <rect x="144" y="70" width="76" height="62" rx="20" fill="var(--art-c)" />
      <path d="m166 101 11 11 22-22" fill="none" stroke="var(--art-a)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckArt() {
  return (
    <svg {...shared}>
      <rect x="24" y="88" width="34" height="42" rx="12" fill="var(--art-b)" />
      <rect x="68" y="64" width="34" height="66" rx="12" fill="var(--art-a)" />
      <rect x="112" y="36" width="34" height="94" rx="12" fill="var(--art-c)" />
      <path d="m190 106 26 26" stroke="var(--art-b)" strokeWidth="16" strokeLinecap="round" />
      <circle cx="168" cy="82" r="38" fill="var(--art-a)" />
      <path d="m151 82 12 13 23-25" fill="none" stroke="var(--art-c)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RunArt() {
  return (
    <svg {...shared}>
      <rect x="30" y="20" width="128" height="32" rx="16" fill="var(--art-a)" />
      <rect x="30" y="60" width="128" height="32" rx="16" fill="var(--art-b)" />
      <rect x="30" y="100" width="128" height="32" rx="16" fill="var(--art-a)" />
      <circle cx="52" cy="36" r="7" fill="var(--art-c)" />
      <circle cx="52" cy="76" r="7" fill="var(--art-c)" />
      <circle cx="52" cy="116" r="7" fill="var(--art-c)" />
      <circle cx="180" cy="76" r="42" fill="var(--art-c)" />
      <path d="M158 78h10l8-17 11 32 7-15h9" fill="none" stroke="var(--art-a)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

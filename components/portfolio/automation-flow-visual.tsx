"use client"

import { useRef } from "react"
import { CircleAlert, Database, FileCheck, FileText, ListChecks, RefreshCcw, Truck } from "lucide-react"
import { motion, useInView, useReducedMotion } from "motion/react"

type Flow = "orders" | "fleet"

const labels = {
  orders: ["Purchase orders", "Match and check", "Sales orders"],
  fleet: ["Fleet tracking", "Compare trips", "SAP"],
} as const

function OrderScene({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 640 220" className="block h-auto w-full" aria-hidden="true">
      <path d="M166 108H280M360 108H474" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" />
      <path d="m274 102 6 6-6 6m194-12 6 6-6 6" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="47" y="65" width="94" height="116" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="58" y="54" width="94" height="116" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="69" y="43" width="94" height="116" rx="8" fill="var(--card)" stroke="var(--primary)" />
      <FileText x={83} y={58} width={22} height={22} color="var(--primary)" strokeWidth={1.8} />
      {[90, 106, 122, 138].map((y, index) => (
        <path key={y} d={`M84 ${y}h${index === 3 ? 39 : 62}`} stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      ))}

      <circle cx="320" cy="108" r="38" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <ListChecks x={300} y={88} width={40} height={40} color="var(--primary)" strokeWidth={1.7} />

      <rect x="477" y="65" width="94" height="116" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="488" y="54" width="94" height="116" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="499" y="43" width="94" height="116" rx="8" fill="var(--card)" stroke="var(--primary)" />
      <FileCheck x={513} y={58} width={22} height={22} color="var(--primary)" strokeWidth={1.8} />
      {[90, 106, 122, 138].map((y, index) => (
        <path key={y} d={`M514 ${y}h${index === 3 ? 39 : 62}`} stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      ))}

      {[0, 1, 2].map((index) => (
        <g key={index}>
          <motion.g
            animate={playing ? { x: [0, 118], opacity: [0, 1, 1, 0] } : { x: 0, opacity: 0 }}
            transition={{ duration: 2.8, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: index * 0.72, ease: "linear" }}
          >
            <rect x="161" y="95" width="14" height="20" rx="2" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
            <path d="M165 102h6m-6 5h6" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
          </motion.g>
          <motion.g
            animate={playing ? { x: [0, 118], opacity: [0, 1, 1, 0] } : { x: 0, opacity: 0 }}
            transition={{ duration: 2.8, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: 0.95 + index * 0.72, ease: "linear" }}
          >
            <rect x="355" y="95" width="14" height="20" rx="2" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
            <path d="M359 102h6m-6 5h6" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
          </motion.g>
        </g>
      ))}

      <path d="M320 147v38" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="320" cy="190" r="5" fill="var(--primary)" />
    </svg>
  )
}

function FleetScene({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 640 220" className="block h-auto w-full" aria-hidden="true">
      <path d="M169 91H280M360 91H472M169 129H280M360 129H472" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" />
      <path d="m274 85 6 6-6 6m192-12 6 6-6 6m-198 32 6 6-6 6m192-12 6 6-6 6" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M56 56h92M56 163h92" stroke="var(--border)" strokeWidth="2" />
      <Truck x={62} y={62} width={35} height={35} color="var(--primary)" strokeWidth={1.7} />
      <Truck x={101} y={85} width={35} height={35} color="var(--primary)" strokeWidth={1.7} />
      <Truck x={62} y={110} width={35} height={35} color="var(--primary)" strokeWidth={1.7} />
      <path d="M72 148h15m12 0h15m12 0h15" stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      <circle cx="92" cy="148" r="3" fill="var(--primary)" />

      <circle cx="320" cy="110" r="38" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <RefreshCcw x={301} y={91} width={38} height={38} color="var(--primary)" strokeWidth={1.7} />

      <Database x={504} y={63} width={66} height={66} color="var(--primary)" strokeWidth={1.6} />
      <path d="M496 148h82m-82 13h82" stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      <circle cx="507" cy="148" r="3" fill="var(--primary)" />
      <circle cx="507" cy="161" r="3" fill="var(--primary)" />

      {[0, 1, 2].map((index) => (
        <g key={index}>
          <motion.circle
            cx={170}
            cy={index === 1 ? 129 : 91}
            r={6}
            fill="var(--primary)"
            animate={playing ? { cx: [170, 279], opacity: [0, 1, 1, 0] } : { cx: 170, opacity: 0 }}
            transition={{ duration: 3, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: index * 0.85, ease: "linear" }}
          />
          <motion.circle
            cx={360}
            cy={index === 1 ? 129 : 91}
            r={6}
            fill="var(--primary)"
            animate={playing ? { cx: [360, 471], opacity: [0, 1, 1, 0] } : { cx: 360, opacity: 0 }}
            transition={{ duration: 3, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: 1 + index * 0.85, ease: "linear" }}
          />
        </g>
      ))}
    </svg>
  )
}

export function AutomationFlowVisual({ flow }: { flow: Flow }) {
  const figureRef = useRef<HTMLElement>(null)
  const isInView = useInView(figureRef, { amount: 0.3 })
  const reducedMotion = useReducedMotion()
  const playing = isInView && !reducedMotion
  const isOrders = flow === "orders"

  return (
    <figure ref={figureRef} className="rounded-lg border border-border bg-card p-4 sm:p-6" aria-label={isOrders ? "Purchase orders become sales orders" : "Fleet trips sync into SAP"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-label font-semibold uppercase text-subtle-foreground">{isOrders ? "Order automation" : "Fleet automation"}</span>
        <strong className="text-title text-primary">{isOrders ? "Hundreds of orders a day" : "Trips kept current across the fleet"}</strong>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-label font-medium text-muted-foreground">
        {labels[flow].map((label) => <span key={label}>{label}</span>)}
      </div>
      {isOrders ? <OrderScene playing={playing} /> : <FleetScene playing={playing} />}
      <figcaption className="flex items-center gap-2 text-caption text-muted-foreground">
        <CircleAlert className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {isOrders ? "Uncertain matches go to a person for review." : "Duplicates are skipped; changed trips are reconciled."}
      </figcaption>
    </figure>
  )
}

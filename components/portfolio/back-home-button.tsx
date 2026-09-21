"use client"

import { useEffect, useRef, useState } from "react"
import type { ComponentProps, ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"
import { cn } from "@/lib/utils"

const TILE = 48
const PANEL = 56
const HOLD_KEPT = 600

const EASE = [0.32, 0.72, 0, 1] as const

const WIDTH = { duration: 0.62, ease: EASE } as const
const IN = { duration: 0.44, ease: EASE, delay: 0.14 } as const
const OUT = { duration: 0.3, ease: EASE } as const
const TAP = { duration: 0.2, ease: EASE } as const
const SWAP = { duration: 0.22, ease: EASE } as const
const PRESS = {
  type: "spring",
  stiffness: 520,
  damping: 18,
  mass: 0.5,
} as const
const INSTANT = { duration: 0 } as const

const SURFACE = "bg-muted"
const RECESS = "border border-border bg-background"
const GLYPH = "text-muted-foreground"
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring"
const ACCENT = "var(--primary)"

const LIFT =
  "shadow-[0_0.5px_1px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.08),inset_0_0.5px_0_rgba(255,255,255,0.9)] dark:shadow-[0_0.5px_1px_rgba(0,0,0,0.35),0_1.5px_4px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.07)]"

const CIRCLE = `grid h-7 w-7 place-items-center rounded-full transition-colors duration-200 hover:bg-muted ${FOCUS} ${SURFACE} ${LIFT}`

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const

const panelMotion = {
  hidden: { opacity: 0, x: -6, transition: OUT },
  shown: { opacity: 1, x: 0, transition: { ...IN, staggerChildren: 0.07 } },
}

const circleMotion = {
  hidden: { opacity: 0, scale: 0.9, transition: OUT },
  shown: { opacity: 1, scale: 1, transition: IN },
}

function Circle({
  label,
  onClick,
  children,
  circleClassName,
  iconSize = 14,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  circleClassName?: string
  iconSize?: number
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <motion.div className="flex" variants={reduced ? undefined : circleMotion}>
      <motion.button
        type="button"
        aria-label={label}
        onClick={onClick}
        whileHover={reduced ? undefined : { scale: 1.03 }}
        whileTap={reduced ? undefined : { scale: 0.84 }}
        transition={PRESS}
        className={cn(CIRCLE, circleClassName)}
      >
        <svg
          {...ICON}
          width={iconSize}
          height={iconSize}
          stroke="currentColor"
          strokeWidth="3.5"
        >
          {children}
        </svg>
      </motion.button>
    </motion.div>
  )
}

type Status = "idle" | "kept"

export type BackHomeButtonProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  href?: string
}

/**
 * Back-to-home button for the Ask AI page. A circular X tile that expands
 * into a confirm (home) / cancel (X) panel, mirroring the DeleteButton
 * motion language but in the brand theme.
 */
export function BackHomeButton({
  className,
  href = "/",
  ...props
}: BackHomeButtonProps) {
  const router = useRouter()
  const reduced = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const trigger = useRef<HTMLButtonElement>(null)
  const timing = (transition: Transition) => (reduced ? INSTANT : transition)

  useEffect(() => {
    if (status === "idle") return
    const done = setTimeout(() => setStatus("idle"), HOLD_KEPT)
    return () => clearTimeout(done)
  }, [status])

  const cancel = () => {
    setOpen(false)
    setStatus("kept")
    trigger.current?.focus()
  }

  const goHome = () => {
    setOpen(false)
    router.push(href)
  }

  return (
    <motion.div
      data-slot="back-home-button"
      data-state={open ? "open" : "closed"}
      data-status={status}
      className={cn("relative h-12 rounded-2xl", SURFACE, GLYPH, className)}
      animate={{ width: open ? TILE + PANEL : TILE }}
      transition={timing(WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) cancel()
      }}
      {...props}
    >
      <motion.button
        ref={trigger}
        type="button"
        aria-label="Back"
        aria-expanded={open}
        onClick={() => {
          if (open) return cancel()
          setStatus("idle")
          setOpen(true)
        }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        transition={TAP}
        className={cn(
          "relative z-10 grid h-12 w-12 place-items-center rounded-2xl",
          FOCUS
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.svg
            key="x"
            {...ICON}
            width="20"
            height="20"
            stroke="currentColor"
            strokeWidth="2"
            className="overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={timing(SWAP)}
          >
            <motion.path d="M6 6l12 12M18 6 6 18" />
          </motion.svg>
        </AnimatePresence>
      </motion.button>

      <span role="status" aria-live="polite" className="sr-only">
        {status === "kept" ? "Stayed on this page" : ""}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            style={{ width: PANEL }}
            className={cn(
              "absolute inset-y-0 right-0 flex items-center justify-center gap-2 rounded-2xl",
              RECESS
            )}
            variants={reduced ? undefined : panelMotion}
            initial="hidden"
            animate="shown"
            exit="hidden"
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 -left-1.25 z-20 h-2.5 w-1.5 -translate-y-1/2 [clip-path:polygon(100%_0,0_50%,100%_100%)]",
                "bg-background"
              )}
            />
            <Circle
              label="Go back home"
              onClick={goHome}
              circleClassName="h-9 w-9"
              iconSize={18}
            >
              <path
                d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
                stroke={ACCENT}
              />
              <path d="M9 22v-8h6v8" stroke={ACCENT} />
            </Circle>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default BackHomeButton

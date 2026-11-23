"use client"

import { useState } from "react"
import { ArrowUp } from "lucide-react"
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "motion/react"
import { buttonVariants } from "@/components/ui/button"

export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const reducedMotion = useReducedMotion()
  const smoothProgress = useSpring(scrollYProgress, { duration: reducedMotion === false ? 0.2 : 0, bounce: 0 })
  const [percent, setPercent] = useState(0)

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setPercent(Math.round(Math.min(1, Math.max(0, value)) * 100))
  })

  return (
    <aside className="reading-progress glass-surface fixed inset-x-4 z-20 mx-auto flex max-w-sm items-center gap-3 rounded-full border border-border px-4 py-2 text-caption" aria-label="Reading tools">
      <span className="text-muted-foreground">Reading</span>
      <div
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <motion.div className="h-full origin-left rounded-full bg-primary" style={{ scaleX: reducedMotion === false ? smoothProgress : scrollYProgress }} />
      </div>
      <span className="w-10 text-right text-muted-foreground tabular-nums" aria-hidden="true">{percent}%</span>
      <a href="#top" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Back to top">
        <ArrowUp aria-hidden="true" />
      </a>
    </aside>
  )
}

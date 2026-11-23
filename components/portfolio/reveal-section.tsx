"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

// Content is visible in server HTML and without JavaScript. Only its first
// viewport entrance gets a short movement; scrolling back never replays it.
export function RevealSection({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.section
      className="reveal-section"
      initial={false}
      whileInView={reducedMotion === false ? { opacity: [0.6, 1], y: [6, 0] } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  )
}

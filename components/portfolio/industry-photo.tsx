"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"

// Motion's scroll-linked image reveal (https://motion.dev/examples/react-scroll-image-reveal),
// reduced to a small scale so the photo settles as it enters the page.
export function IndustryPhoto({ src, alt, wide }: { src: string; alt: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.14, 1])

  return (
    <div ref={ref} className="industry-photo">
      <motion.div className="industry-photo-inner" style={reducedMotion ? undefined : { scale }}>
        <Image src={src} alt={alt} fill sizes={wide ? "(min-width: 48rem) 45rem, 92vw" : "(min-width: 48rem) 34rem, 92vw"} className="object-cover" />
      </motion.div>
    </div>
  )
}

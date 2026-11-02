"use client"

import { useRef, useState } from "react"
import { BookOpen, BrainCircuit, CircleAlert, Code2, Database, FileCheck, FileText, ListChecks, MessageCircle, MessageSquareText, RefreshCcw, Search, Truck } from "lucide-react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"

type Flow = "orders" | "fleet" | "policy" | "library-eval" | "model-training"

const labels = {
  orders: ["Purchase orders", "Match and check", "Sales orders"],
  fleet: ["Fleet tracking", "Compare trips", "SAP"],
  policy: ["Reader's question", "Find the library guide", "Answer or ask for help"],
  "library-eval": ["Test questions", "Run the assistant", "Check the answers"],
  "model-training": ["Training data", "Learn patterns", "Trained model"],
} as const

const libraryFlows = {
  policy: { title: "A question grounded in the library guide", caption: "If the guide does not answer the question, a librarian can help.", description: "A reader asks a question; the assistant checks the library guide before answering" },
  "library-eval": { title: "Check the assistant", caption: "Review incorrect answers and add new cases when the guide changes.", description: "Explore expected results for library assistant test cases" },
  "model-training": { title: "From examples to a useful response", caption: "Books, articles, and code provide examples. Training adjusts the network; afterward, a model can respond to new requests.", description: "Books, articles, and code feed into a network that is trained through repeated adjustments. The trained model can then respond to a new request." },
} as const

function ModelTrainingScene({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 640 220" className="block h-auto w-full" aria-hidden="true">
      <path d="M167 108H230M410 108H466" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" />
      <path d="m224 102 6 6-6 6m236-12 6 6-6 6" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="28" y="31" width="112" height="46" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="42" y="86" width="112" height="46" rx="8" fill="var(--background)" stroke="var(--border)" />
      <rect x="28" y="141" width="112" height="46" rx="8" fill="var(--background)" stroke="var(--border)" />
      <BookOpen x={40} y={42} width={24} height={24} color="var(--primary)" strokeWidth={1.7} />
      <FileText x={54} y={97} width={24} height={24} color="var(--primary)" strokeWidth={1.7} />
      <Code2 x={40} y={152} width={24} height={24} color="var(--primary)" strokeWidth={1.7} />
      <path d="M75 48h49m-49 10h32M89 103h49m-49 10h32M75 158h49m-49 10h32" stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />

      <rect x="230" y="36" width="180" height="145" rx="8" fill="var(--background)" stroke="var(--border)" />
      <path d="M261 75L320 58 379 75M261 75L320 108 379 75M261 108L320 58M261 108L320 108 379 108M261 108L320 158M261 141L320 108 379 141M261 141L320 158 379 108M320 158L379 141" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" />
      {[[261, 75], [261, 108], [261, 141], [320, 58], [320, 108], [320, 158], [379, 75], [379, 108], [379, 141]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />)}
      <motion.circle cx="261" cy="75" r="4" fill="var(--primary)" animate={playing ? { cx: [261, 320, 379], cy: [75, 108, 75], opacity: [0, 1, 0] } : { cx: 261, cy: 75, opacity: 0 }} transition={{ duration: 2.8, repeat: playing ? Infinity : 0, ease: "linear" }} />
      <path d="M366 193c-23 19-69 19-92 0m0 0 9-1m-9 1 3 8" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="470" y="48" width="142" height="121" rx="8" fill="var(--background)" stroke="var(--border)" />
      <BrainCircuit x={518} y={57} width={44} height={44} color="var(--primary)" strokeWidth={1.6} />
      <MessageSquareText x={484} y={119} width={28} height={28} color="var(--primary)" strokeWidth={1.6} />
      <path d="M522 125h70m-70 10h57m-57 10h38" stroke="var(--muted-foreground)" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

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

function PolicyScene({ playing, flow }: { playing: boolean; flow: "policy" | "library-eval" }) {
  const [selectedCase, setSelectedCase] = useState(0)
  const label = "flex items-center gap-2 text-label font-semibold uppercase text-subtle-foreground"

  if (flow === "library-eval") {
    return (
      <div className="my-5 rounded-lg border border-border bg-background p-4">
        <div className={label}><ListChecks className="size-4 text-primary" /> Choose a test case</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Reserved book", "Missing rule", "Changed guide"].map((name, index) => (
            <Button key={name} type="button" size="sm" variant={selectedCase === index ? "secondary" : "outline"} aria-pressed={selectedCase === index} onClick={() => setSelectedCase(index)}>{name}</Button>
          ))}
        </div>
        <p className="mt-4 text-caption text-muted-foreground">Expected result</p>
        <p className="mt-2 text-body">{[
          "The assistant explains that a reserved book cannot be renewed.",
          "The assistant says the guide does not specify loan lengths and suggests asking a librarian.",
          "After a policy change, the assistant uses the updated guide rather than the old rule.",
        ][selectedCase]}</p>
      </div>
    )
  }

  return (
    <svg viewBox="0 0 640 220" className="block h-auto w-full" aria-hidden="true">
      <path d="M166 108H280M360 108H474" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" />
      <path d="m274 102 6 6-6 6m194-12 6 6-6 6" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <MessageCircle x={65} y={69} width={76} height={76} color="var(--primary)" strokeWidth={1.6} />
      <circle cx="320" cy="108" r="38" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <Search x={300} y={88} width={40} height={40} color="var(--primary)" strokeWidth={1.7} />
      <FileCheck x={497} y={69} width={76} height={76} color="var(--primary)" strokeWidth={1.6} />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <motion.circle cx={166} cy={108} r={6} fill="var(--primary)" animate={playing ? { cx: [166, 279], opacity: [0, 1, 1, 0] } : { cx: 166, opacity: 0 }} transition={{ duration: 3, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: index * 0.85, ease: "linear" }} />
          <motion.circle cx={360} cy={108} r={6} fill="var(--primary)" animate={playing ? { cx: [360, 473], opacity: [0, 1, 1, 0] } : { cx: 360, opacity: 0 }} transition={{ duration: 3, times: [0, 0.15, 0.85, 1], repeat: playing ? Infinity : 0, delay: 1 + index * 0.85, ease: "linear" }} />
        </g>
      ))}
      <path d="M320 147v38" stroke="var(--muted-foreground)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="320" cy="190" r="5" fill="var(--primary)" />
    </svg>
  )
}

export function AutomationFlowVisual({ flow }: { flow: Flow }) {
  const figureRef = useRef<HTMLElement>(null)
  const isInView = useInView(figureRef, { amount: 0.3 })
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const playing = isInView && !reducedMotion && !paused
  const isOrders = flow === "orders"

  const libraryFlow = flow !== "orders" && flow !== "fleet" ? libraryFlows[flow] : null

  return (
    <figure ref={figureRef} className="rounded-lg border border-border bg-card p-4 sm:p-6" aria-label={isOrders ? "Purchase orders become sales orders" : libraryFlow ? libraryFlow.description : "Fleet trips sync into SAP"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-label font-semibold uppercase text-subtle-foreground">{isOrders ? "Order automation" : flow === "model-training" ? "AI model" : libraryFlow ? "AI assistant" : "Fleet automation"}</span>
        <strong className="text-title text-primary">{isOrders ? "Hundreds of orders a day" : libraryFlow ? libraryFlow.title : "Trips kept current across the fleet"}</strong>
      </div>
      {flow !== "library-eval" && <div className="mt-5 grid grid-cols-3 gap-2 text-center text-label font-medium text-muted-foreground">
        {labels[flow].map((label) => <span key={label}>{label}</span>)}
      </div>}
      {flow === "orders" ? <OrderScene playing={playing} /> : flow === "fleet" ? <FleetScene playing={playing} /> : flow === "model-training" ? <ModelTrainingScene playing={playing} /> : <PolicyScene playing={playing} flow={flow} />}
      <figcaption className="flex items-center gap-2 text-caption text-muted-foreground">
        <CircleAlert className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {isOrders ? "Uncertain matches go to a person for review." : libraryFlow ? libraryFlow.caption : "Duplicates are skipped; changed trips are reconciled."}
      </figcaption>
      {(flow === "policy" || flow === "model-training") && !reducedMotion && <Button type="button" variant="ghost" size="xs" className="mt-2" onClick={() => setPaused(!paused)}>{paused ? "Play animation" : "Pause animation"}</Button>}
    </figure>
  )
}

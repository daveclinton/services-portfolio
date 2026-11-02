"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  AppWindow,
  Check,
  CircleCheck,
  CircleStop,
  ClipboardCheck,
  Code2,
  Database,
  Dices,
  Eye,
  FileText,
  GraduationCap,
  Grid3x3,
  Hash,
  Layers,
  Library,
  Mail,
  Mails,
  MessageCircle,
  MessagesSquare,
  Pause,
  Play,
  RefreshCcw,
  Repeat,
  RotateCcw,
  ScrollText,
  StepForward,
  Tag,
  Target,
  Thermometer,
  TrendingDown,
  Type,
  User,
  WholeWord,
  Wrench,
  X,
} from "lucide-react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"

type Concept = "rules-vs-learning" | "training" | "tokens" | "prediction" | "generation" | "attention" | "fine-tuning" | "application"

type SceneProps = {
  /** Visible, not paused, and motion allowed. */
  playing: boolean
  /** The reader prefers reduced motion: show the finished, static state. */
  still: boolean
  /** The figure has been scrolled into view at least once. */
  seen: boolean
}

const titles: Record<Concept, string> = {
  "rules-vs-learning": "Rules: written vs. learned",
  training: "Training loop",
  tokens: "Text → tokens → IDs → vectors",
  prediction: "Next-token probabilities",
  generation: "Generation loop",
  attention: "Attention",
  "fine-tuning": "Pretrain → fine-tune → evaluate",
  application: "Inside an AI application",
}

const scenes: Record<Concept, (props: SceneProps) => ReactNode> = {
  "rules-vs-learning": RulesScene,
  training: TrainingScene,
  tokens: TokensScene,
  prediction: PredictionScene,
  generation: GenerationScene,
  attention: AttentionScene,
  "fine-tuning": FineTuningScene,
  application: ApplicationScene,
}

export function ModelConceptVisual({ concept }: { concept: Concept }) {
  const figureRef = useRef<HTMLElement>(null)
  const inView = useInView(figureRef, { amount: 0.3 })
  const seen = useInView(figureRef, { amount: 0.3, once: true })
  const still = useReducedMotion() ?? false
  const [paused, setPaused] = useState(false)
  const title = titles[concept]
  const Scene = scenes[concept]

  return (
    <figure ref={figureRef} className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <figcaption className="flex items-center justify-between gap-2">
        <strong className="text-title text-primary">{title}</strong>
        <span className="flex items-center gap-1">
          <span className="text-label font-semibold uppercase text-subtle-foreground" title="Values are illustrative">Illustrative</span>
          {!still && (
            <IconButton label={paused ? "Play animation" : "Pause animation"} variant="ghost" onClick={() => setPaused(!paused)}>
              {paused ? <Play /> : <Pause />}
            </IconButton>
          )}
        </span>
      </figcaption>
      <div className="mt-4">
        <Scene playing={inView && !paused && !still} still={still} seen={seen || still} />
      </div>
    </figure>
  )
}

/* ---------- Shared pieces ---------- */

/** Playback speed for every animation in these figures. 1 = original timing. */
const SPEED = 5
const fast = (seconds: number) => seconds / SPEED
/** Smooth ease-out used by every transition: quick to start, gentle to settle. */
const EASE = [0.22, 1, 0.36, 1] as const
const CSS_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
/** Transition length: sped up with SPEED, but never so short that it reads as a jump. */
const smooth = (seconds: number) => Math.max(seconds / SPEED, 0.25)
const cssTransition = (...properties: string[]) => properties.map((property) => `${property} ${smooth(0.3) * 1000}ms ${CSS_EASE}`).join(", ")

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace"
const monoWidth = (text: string, size: number) => text.length * size * 0.6
const pct = (value: number) => (value < 0.005 ? "<1%" : `${Math.round(value * 100)}%`)

function useCycle(length: number, active: boolean, ms: number) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % length), ms / SPEED)
    return () => window.clearInterval(timer)
  }, [active, length, ms])
  return [index, setIndex] as const
}

function IconButton({ label, pressed, variant, onClick, children }: { label: string; pressed?: boolean; variant?: "ghost" | "outline" | "secondary"; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" size="icon-sm" variant={variant ?? (pressed ? "secondary" : "outline")} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </Button>
  )
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>
}

function Diagram({ viewBox, title, description, children }: { viewBox: string; title: string; description: string; children: ReactNode }) {
  const id = useId()
  return (
    <svg viewBox={viewBox} className="block h-auto w-full" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{description}</desc>
      {children}
    </svg>
  )
}

/** Orthogonal connector with an arrowhead on the final segment. */
function Connector({ points, active = false, dashed = false }: { points: [number, number][]; active?: boolean; dashed?: boolean }) {
  const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join("")
  const [x1, y1] = points[points.length - 2]
  const [x2, y2] = points[points.length - 1]
  const dx = Math.sign(x2 - x1)
  const dy = Math.sign(y2 - y1)
  const head = `M${x2 - dx * 6 - dy * 5} ${y2 - dy * 6 - dx * 5}L${x2} ${y2}L${x2 - dx * 6 + dy * 5} ${y2 - dy * 6 + dx * 5}`
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={active ? "var(--primary)" : "var(--muted-foreground)"} strokeOpacity={active ? 1 : 0.55} strokeWidth="1.5" strokeDasharray={dashed ? "4 4" : undefined} style={{ transition: cssTransition("stroke", "stroke-opacity") }} />
      <path d={head} stroke="var(--primary)" strokeWidth="1.5" />
    </g>
  )
}

function Node({ x, y, width, height, active = false, children }: { x: number; y: number; width: number; height: number; active?: boolean; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="6" fill="var(--background)" stroke={active ? "var(--primary)" : "var(--border)"} strokeWidth={active ? 1.5 : 1} style={{ transition: cssTransition("stroke", "stroke-width") }} />
      {children}
    </g>
  )
}

function Mono({ x, y, children, size = 13, anchor = "start", color = "var(--foreground)" }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; color?: string }) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size} fontFamily={MONO}>{children}</text>
}

/** Small neural-network glyph used as the symbol for "model" in every figure. */
function ModelGlyph({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const layers = [[-7, 7], [-12, 0, 12], [-7, 7]].map((ys, column) => ys.map((y): [number, number] => [cx + (column - 1) * 16 * scale, cy + y * scale]))
  const links = layers.slice(0, -1).flatMap((layer, column) => layer.flatMap(([ax, ay]) => layers[column + 1].map(([bx, by]) => `M${ax} ${ay}L${bx} ${by}`)))
  return (
    <g>
      <path d={links.join("")} stroke="var(--muted-foreground)" strokeOpacity=".5" strokeWidth="1" />
      {layers.flat().map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2 * scale} fill="var(--card)" stroke="var(--primary)" strokeWidth="1.5" />)}
    </g>
  )
}

/** A vector drawn as a strip of cells: blue for positive, grey for negative, stronger for larger values. */
function VectorCells({ x, y, values, cell = 14, thickness = 14, gap = 2, vertical = false, animate = false, playing = false }: { x: number; y: number; values: number[]; cell?: number; thickness?: number; gap?: number; vertical?: boolean; animate?: boolean; playing?: boolean }) {
  return (
    <g>
      {values.map((value, index) => {
        const offset = index * (cell + gap)
        const opacity = 0.2 + Math.abs(value) * 0.8
        return (
          <motion.rect
            key={index}
            x={vertical ? x : x + offset}
            y={vertical ? y + offset : y}
            width={vertical ? thickness : cell}
            height={vertical ? cell : thickness}
            rx="2"
            fill={value >= 0 ? "var(--primary)" : "var(--muted-foreground)"}
            initial={false}
            animate={{ fillOpacity: animate && playing ? [opacity, Math.max(0.15, opacity - 0.45), opacity] : opacity }}
            transition={animate && playing ? { duration: fast(4), delay: fast(index * 0.3), repeat: Infinity, ease: "easeInOut" } : { duration: smooth(0.3), ease: EASE }}
          />
        )
      })}
    </g>
  )
}

/** A dot that travels along a list of points. */
function Pulse({ points, playing, duration = 3, delay = 0 }: { points: [number, number][]; playing: boolean; duration?: number; delay?: number }) {
  const lengths = points.slice(1).map(([x, y], index) => Math.hypot(x - points[index][0], y - points[index][1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const times = [0, ...lengths.map((_, index) => lengths.slice(0, index + 1).reduce((sum, length) => sum + length, 0) / total)]
  const opacity = points.map((_, index) => (index === 0 || index === points.length - 1 ? 0 : 1))
  return (
    <motion.circle
      r="4"
      cx={points[0][0]}
      cy={points[0][1]}
      fill="var(--primary)"
      initial={{ opacity: 0 }}
      animate={playing ? { cx: points.map(([x]) => x), cy: points.map(([, y]) => y), opacity } : { opacity: 0 }}
      transition={playing ? { duration: fast(duration), delay: fast(delay), times, ease: "linear", repeat: Infinity, repeatDelay: fast(0.6) } : { duration: smooth(0.2), ease: EASE }}
    />
  )
}

const iconProps = (x: number, y: number, size = 18, color = "var(--primary)") => ({ x, y, width: size, height: size, color, strokeWidth: 1.8 })

/* ---------- 1. Rules vs. learning ---------- */

const learnedWeights = [0.8, -0.6, 0.3, 0.95, -0.2, 0.5]

function RulesScene({ playing }: SceneProps) {
  return (
    <Diagram
      viewBox="0 0 600 232"
      title="Traditional software compared with machine learning"
      description="Top row: a person writes a rule, FREE in the subject means spam. The program applies it to a new email and outputs spam. Bottom row: 10,000 example emails and their labels go into a repeated training loop, and the output is a learned vector of parameters, which plays the role of the rule."
    >
      <User {...iconProps(20, 31, 22, "var(--muted-foreground)")} />
      <Node x={54} y={24} width={196} height={36} active>
        <ScrollText {...iconProps(64, 33)} />
        <Mono x={92} y={47}>{'"FREE" → spam'}</Mono>
      </Node>
      <Node x={54} y={68} width={196} height={36}>
        <Mail {...iconProps(64, 77)} />
        <Mono x={92} y={91}>{'"FREE trip!"'}</Mono>
      </Node>
      <Connector points={[[250, 42], [270, 42], [270, 64], [290, 64]]} />
      <Connector points={[[250, 86], [270, 86], [270, 64], [290, 64]]} />
      <Node x={290} y={40} width={90} height={48}><Code2 {...iconProps(323, 52, 24)} /></Node>
      <Connector points={[[380, 64], [420, 64]]} />
      <Node x={420} y={46} width={160} height={36}>
        <Tag {...iconProps(432, 55)} />
        <Mono x={460} y={69}>spam</Mono>
      </Node>
      <Pulse playing={playing} points={[[250, 42], [270, 42], [270, 64], [380, 64], [420, 64]]} />

      <path d="M20 122H580" stroke="var(--border)" strokeDasharray="3 5" />

      <Database {...iconProps(20, 151, 22, "var(--muted-foreground)")} />
      <Node x={54} y={140} width={196} height={36}>
        <Mails {...iconProps(64, 149)} />
        <Mono x={92} y={163}>× 10,000</Mono>
      </Node>
      <Node x={54} y={184} width={196} height={36}>
        <Tag {...iconProps(64, 193)} />
        <Mono x={92} y={207}>spam | ok | …</Mono>
      </Node>
      <Connector points={[[250, 158], [270, 158], [270, 180], [290, 180]]} />
      <Connector points={[[250, 202], [270, 202], [270, 180], [290, 180]]} />
      <Node x={290} y={156} width={90} height={48}>
        <motion.g style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={playing ? { rotate: -360 } : { rotate: 0 }} transition={playing ? { duration: fast(3), repeat: Infinity, ease: "linear" } : { duration: smooth(0.3), ease: EASE }}>
          <RefreshCcw {...iconProps(323, 168, 24)} />
        </motion.g>
      </Node>
      <Connector points={[[380, 180], [420, 180]]} />
      <Node x={420} y={148} width={160} height={64} active>
        <ScrollText {...iconProps(432, 156)} />
        <Mono x={458} y={170} color="var(--primary)">w</Mono>
        <VectorCells x={432} y={184} values={learnedWeights} cell={18} gap={4} thickness={16} animate playing={playing} />
      </Node>
      <Pulse playing={playing} delay={1.5} points={[[250, 158], [270, 158], [270, 180], [380, 180], [420, 180]]} />
      <Pulse playing={playing} delay={1.9} points={[[250, 202], [270, 202], [270, 180], [380, 180], [420, 180]]} />
    </Diagram>
  )
}

/* ---------- 2. Training loop ---------- */

const trainingCandidates = ["blue", "green", "cold"]
const trainingSteps = [
  { probs: [0.2, 0.45, 0.35], knobs: [0.25, 0.7, 0.45] },
  { probs: [0.45, 0.35, 0.2], knobs: [0.45, 0.55, 0.5] },
  { probs: [0.7, 0.2, 0.1], knobs: [0.6, 0.4, 0.58] },
  { probs: [0.88, 0.08, 0.04], knobs: [0.68, 0.32, 0.62] },
]
const trainingLoss = (step: number) => -Math.log(trainingSteps[step].probs[0])

function TrainingScene({ playing, still }: SceneProps) {
  const [manual, setManual] = useState(false)
  const [tick, setTick] = useCycle(5, playing && !manual, 1700)
  const step = still && !manual ? 3 : Math.min(tick, 3)
  const { probs, knobs } = trainingSteps[step]
  const loss = trainingLoss(step)
  const chartPoint = (index: number): [number, number] => [56 + index * 46, 226 - (trainingLoss(index) / 1.7) * 56]
  const transition = { duration: still ? 0 : smooth(0.6), ease: EASE }

  return (
    <>
      <Controls>
        <IconButton label={step === 3 ? "Start over" : "Next training step"} onClick={() => { setManual(true); setTick((step + 1) % 4) }}>
          {step === 3 ? <RotateCcw /> : <StepForward />}
        </IconButton>
        <span className="font-mono text-caption text-muted-foreground">{step + 1}/4</span>
      </Controls>
      <Diagram
        viewBox="0 0 600 236"
        title="The training loop for one example"
        description={`Input: The sky is. With parameters ${knobs.join(", ")}, the model predicts blue ${pct(probs[0])}, green ${pct(probs[1])}, cold ${pct(probs[2])}. The target is blue, so the loss is ${loss.toFixed(2)}. The gradient adjusts the parameters, and over four steps the loss falls.`}
      >
        <Node x={20} y={44} width={120} height={40}><Mono x={80} y={69} anchor="middle">The sky is</Mono></Node>
        <Connector points={[[140, 64], [170, 64]]} />

        <Node x={170} y={20} width={150} height={110}>
          <Mono x={184} y={40} color="var(--primary)">w</Mono>
          {knobs.map((value, index) => (
            <g key={index}>
              <path d={`M184 ${62 + index * 24}H262`} stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" />
              <motion.circle cy={62 + index * 24} r="6" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" initial={false} animate={{ cx: 184 + value * 78 }} transition={transition} />
              <Mono x={308} y={66 + index * 24} size={11} anchor="end" color="var(--muted-foreground)">{value.toFixed(2)}</Mono>
            </g>
          ))}
        </Node>
        <Connector points={[[320, 64], [350, 64]]} />

        <Node x={350} y={20} width={230} height={110}>
          <Mono x={364} y={40} color="var(--primary)">p</Mono>
          {trainingCandidates.map((word, index) => (
            <g key={word}>
              <Mono x={364} y={66 + index * 24} color={index === 0 ? "var(--foreground)" : "var(--muted-foreground)"}>{word}</Mono>
              <rect x={420} y={56 + index * 24} width="110" height="12" rx="3" fill="var(--muted)" />
              <motion.rect x={420} y={56 + index * 24} height="12" rx="3" fill={index === 0 ? "var(--primary)" : "var(--muted-foreground)"} fillOpacity={index === 0 ? 1 : 0.5} initial={false} animate={{ width: probs[index] * 110 }} transition={transition} />
              <Mono x={572} y={66 + index * 24} size={11} anchor="end" color="var(--muted-foreground)">{pct(probs[index])}</Mono>
            </g>
          ))}
        </Node>

        <Connector points={[[465, 130], [465, 156]]} />
        <Node x={350} y={156} width={230} height={46}>
          <Target {...iconProps(362, 168, 22)} />
          <Mono x={394} y={184}>blue</Mono>
          <Mono x={568} y={184} anchor="end" color="var(--muted-foreground)">L = <tspan fill="var(--primary)">{loss.toFixed(2)}</tspan></Mono>
        </Node>

        <Connector points={[[350, 179], [245, 179], [245, 130]]} />
        <rect x={278} y={170} width={44} height={18} fill="var(--card)" />
        <Mono x={300} y={183} size={12} anchor="middle" color="var(--primary)">−∇L</Mono>

        <TrendingDown {...iconProps(20, 150, 18, "var(--muted-foreground)")} />
        <path d="M36 226H210" stroke="var(--border)" />
        <path d={trainingSteps.slice(0, step + 1).map((_, index) => `${index ? "L" : "M"}${chartPoint(index).join(" ")}`).join("")} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
        {trainingSteps.map((_, index) => {
          const [cx, cy] = chartPoint(index)
          return <circle key={index} cx={cx} cy={cy} r={index === step ? 5 : 3.5} fill={index <= step ? "var(--primary)" : "var(--muted)"} style={{ transition: cssTransition("fill", "r") }} />
        })}
      </Diagram>
    </>
  )
}

/* ---------- 3. Tokens ---------- */

const tokenExamples = [
  { name: "Question", Icon: MessageCircle, text: "Why is the sky blue?", tokens: ["Why", " is", " the", " sky", " blue", "?"], ids: [10445, 382, 290, 17307, 9861, 30] },
  { name: "Long word", Icon: WholeWord, text: "Tokenization isn't magic.", tokens: ["Token", "ization", " isn", "'t", " magic", "."], ids: [4421, 2860, 8740, 1348, 15217, 13] },
  { name: "Code", Icon: Code2, text: "def add(a, b):", tokens: ["def", " add", "(a", ",", " b", "):"], ids: [1314, 1147, 6271, 11, 287, 3127] },
]
/** Deterministic stand-in for an embedding lookup. */
const embedding = (id: number) => [0, 1, 2, 3].map((dimension) => Math.sin(id * 0.37 + dimension * 1.9))

function TokensScene({ playing, still }: SceneProps) {
  const [selected, setSelected] = useState(0)
  const [cycle] = useCycle(1000, playing, 5000)
  const { text, tokens, ids } = tokenExamples[selected]
  const widths = tokens.map((token) => Math.max(monoWidth(token.replace(" ", "·"), 15) + 20, 40))
  const gap = 10
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (tokens.length - 1)
  const starts = widths.map((_, index) => (600 - total) / 2 + widths.slice(0, index).reduce((sum, width) => sum + width + gap, 0))

  return (
    <>
      <Controls>
        {tokenExamples.map(({ name, Icon }, index) => (
          <IconButton key={name} label={name} pressed={selected === index} onClick={() => setSelected(index)}><Icon /></IconButton>
        ))}
      </Controls>
      <Diagram
        viewBox="0 0 600 228"
        title={`Tokenizing: ${text}`}
        description={`The text "${text}" (${text.length} characters) splits into ${tokens.length} tokens: ${tokens.map((token) => `"${token}"`).join(", ")}. Each token maps to an ID, ${ids.join(", ")}, and each ID to a vector of numbers.`}
      >
        <Node x={90} y={10} width={420} height={40}>
          <Type {...iconProps(102, 21, 18, "var(--muted-foreground)")} />
          <Mono x={310} y={36} size={15} anchor="middle">{text}</Mono>
        </Node>
        <Connector points={[[300, 50], [300, 74]]} />
        {tokens.map((token, index) => {
          const x = starts[index]
          const width = widths[index]
          const center = x + width / 2
          const leadingSpace = token.startsWith(" ")
          return (
            <motion.g key={`${selected}-${cycle}-${index}`} initial={still ? false : { opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: smooth(0.35), delay: fast(0.15 + index * 0.1), ease: EASE }}>
              <rect x={x} y={78} width={width} height={36} rx="6" fill="var(--background)" stroke="var(--primary)" />
              <text x={center} y={101} textAnchor="middle" fill="var(--foreground)" fontSize="15" fontFamily={MONO}>
                {leadingSpace && <tspan fill="var(--muted-foreground)">·</tspan>}
                {leadingSpace ? token.slice(1) : token}
              </text>
              <path d={`M${center} 114V122M${center} 141V147`} stroke="var(--muted-foreground)" strokeOpacity=".55" />
              <Mono x={center} y={136} size={11.5} anchor="middle" color="var(--muted-foreground)">{ids[index]}</Mono>
              <VectorCells x={center - 7} y={150} values={embedding(ids[index])} cell={9} thickness={14} vertical />
            </motion.g>
          )
        })}
        <g>
          <Type {...iconProps(190, 202, 16, "var(--muted-foreground)")} />
          <Mono x={212} y={215} color="var(--muted-foreground)">{text.length}</Mono>
          <Connector points={[[238, 210], [264, 210]]} />
          <Hash {...iconProps(270, 202, 16, "var(--muted-foreground)")} />
          <Mono x={292} y={215} color="var(--muted-foreground)">{tokens.length}</Mono>
          <Connector points={[[310, 210], [336, 210]]} />
          <Grid3x3 {...iconProps(342, 202, 16, "var(--muted-foreground)")} />
          <Mono x={364} y={215} color="var(--muted-foreground)">{tokens.length} × 4</Mono>
        </g>
      </Diagram>
    </>
  )
}

/* ---------- 4. Prediction and temperature ---------- */

const predictionCandidates = [
  { word: "blue", score: 4.0 },
  { word: "clear", score: 2.9 },
  { word: "gray", score: 2.4 },
  { word: "dark", score: 1.6 },
  { word: "falling", score: 0.6 },
]
const temperatureOptions = [0.2, 1, 1.8]
/** Autoplay order: default, low, high temperature. Fixed rolls keep server and client renders identical. */
const autoTemperatureOrder = [1, 0.2, 1.8]
const autoRolls = [0.62, 0.35, 0.18, 0.93, 0.47, 0.81]

function softmax(scores: number[], temperature: number) {
  const scaled = scores.map((score) => score / temperature)
  const max = Math.max(...scaled)
  const exps = scaled.map((value) => Math.exp(value - max))
  const sum = exps.reduce((total, value) => total + value, 0)
  return exps.map((value) => value / sum)
}

function pickIndex(probs: number[], roll: number) {
  let remaining = roll
  const index = probs.findIndex((p) => (remaining -= p) < 0)
  return index === -1 ? probs.length - 1 : index
}

function PredictionScene({ playing, seen, still }: SceneProps) {
  const [manual, setManual] = useState(false)
  const [tick] = useCycle(6, playing && !manual, 2400)
  const [chosenTemperature, setTemperature] = useState(1)
  const [chosenPick, setPicked] = useState<number | null>(null)
  const temperature = manual ? chosenTemperature : autoTemperatureOrder[Math.floor(tick / 2)]
  const probs = softmax(predictionCandidates.map(({ score }) => score), temperature)
  const picked = manual ? chosenPick : tick % 2 === 1 ? pickIndex(probs, autoRolls[tick]) : null

  function sample() {
    setManual(true)
    setTemperature(temperature)
    setPicked(pickIndex(probs, Math.random()))
  }

  return (
    <>
      <Controls>
        <Thermometer className="size-4 text-muted-foreground" aria-hidden="true" />
        {temperatureOptions.map((value) => (
          <Button key={value} type="button" size="sm" className="font-mono" variant={temperature === value ? "secondary" : "outline"} aria-label={`Temperature ${value}`} aria-pressed={temperature === value} onClick={() => { setManual(true); setTemperature(value); setPicked(null) }}>{value.toFixed(1)}</Button>
        ))}
        <IconButton label="Pick a token" onClick={sample}><Dices /></IconButton>
      </Controls>
      <Diagram
        viewBox="0 0 600 210"
        title="Next-token probabilities for The sky is"
        description={`At temperature ${temperature}, the scores ${predictionCandidates.map(({ word, score }) => `${word} ${score}`).join(", ")} become probabilities ${predictionCandidates.map(({ word }, index) => `${word} ${pct(probs[index])}`).join(", ")}.${picked === null ? "" : ` The token picked was ${predictionCandidates[picked].word}.`}`}
      >
        <Node x={20} y={84} width={118} height={44}><Mono x={79} y={110} anchor="middle">The sky is</Mono></Node>
        <Connector points={[[138, 106], [168, 106]]} />
        <Node x={168} y={78} width={72} height={56}><ModelGlyph cx={204} cy={106} scale={0.9} /></Node>
        <Connector points={[[240, 106], [270, 106]]} />
        <path d="M276 22V198" stroke="var(--border)" strokeWidth="1.5" />

        <Mono x={380} y={14} size={11} anchor="middle" color="var(--muted-foreground)">z</Mono>
        <Mono x={462} y={14} size={11} anchor="middle" color="var(--muted-foreground)">softmax(z / T)</Mono>
        <Thermometer {...iconProps(514, 3, 14, "var(--primary)")} />
        <Mono x={582} y={14} size={12} anchor="end" color="var(--primary)">T = {temperature.toFixed(1)}</Mono>

        {predictionCandidates.map(({ word, score }, index) => {
          const y = 26 + index * 36
          const isPicked = picked === index
          return (
            <g key={word}>
              <rect x={284} y={y - 2} width={302} height={30} rx="6" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity={isPicked ? 1 : 0} style={{ transition: cssTransition("opacity") }} />
              <Mono x={292} y={y + 18} size={14} color={isPicked ? "var(--primary)" : "var(--foreground)"}>{word}</Mono>
              <Mono x={380} y={y + 18} size={12} anchor="middle" color="var(--muted-foreground)">{score.toFixed(1)}</Mono>
              <rect x={410} y={y + 7} width="110" height="13" rx="3" fill="var(--muted)" />
              <motion.rect x={410} y={y + 7} height="13" rx="3" fill="var(--primary)" initial={false} animate={{ width: seen ? Math.max(probs[index] * 110, 1) : 0 }} transition={{ duration: still ? 0 : smooth(0.5), ease: EASE, delay: still ? 0 : fast(index * 0.04) }} />
              <Mono x={578} y={y + 18} size={12} anchor="end" color="var(--muted-foreground)">{pct(probs[index])}</Mono>
            </g>
          )
        })}
      </Diagram>
    </>
  )
}

/* ---------- 5. Generation loop ---------- */

const promptTokens = ["The", " sky", " is"]
const generatedTokens = [" blue", " today", ".", "<end>"]

function GenerationScene({ playing, still }: SceneProps) {
  const [manual, setManual] = useState(false)
  const [tick, setTick] = useCycle(6, playing && !manual, 1500)
  const rows = still && !manual ? 4 : Math.min(tick + 1, 4)
  const chipWidth = (token: string) => Math.max(monoWidth(token.trim(), 13) + 18, 30)
  const chipStarts = (tokens: string[]) => tokens.map((_, index) => 44 + tokens.slice(0, index).reduce((sum, token) => sum + chipWidth(token) + 6, 0))
  const outX = 436

  return (
    <>
      <Controls>
        <IconButton label={rows >= 4 ? "Start over" : "Add the next token"} onClick={() => { setManual(true); setTick(rows >= 4 ? 0 : rows) }}>
          {rows >= 4 ? <RotateCcw /> : <StepForward />}
        </IconButton>
      </Controls>
      <Diagram
        viewBox="0 0 600 216"
        title="Generating a response one token at a time"
        description={`Starting from the prompt The sky is, the model predicts blue. The sky is blue becomes the next input and the model predicts today, then a full stop, then an end token that stops generation. ${rows} of 4 steps are shown.`}
      >
        {generatedTokens.map((output, row) => {
          if (row >= rows) return null
          const context = [...promptTokens, ...generatedTokens.slice(0, row)]
          const starts = chipStarts(context)
          const y = 12 + row * 54
          const target = chipStarts([...context, output])[context.length] + chipWidth(output) / 2
          const outWidth = chipWidth(output)
          const contextEnd = starts[context.length - 1] + chipWidth(context[context.length - 1])
          const isEnd = output === "<end>"
          return (
            <motion.g key={row} initial={still || row === 0 ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: smooth(0.35), ease: EASE }}>
              <Mono x={22} y={y + 22} size={11} color="var(--subtle-foreground)">{row + 1}</Mono>
              {context.map((token, index) => (
                <g key={index}>
                  <rect x={starts[index]} y={y} width={chipWidth(token)} height={34} rx="6" fill="var(--background)" stroke={index >= promptTokens.length ? "var(--primary)" : "var(--border)"} />
                  <Mono x={starts[index] + chipWidth(token) / 2} y={y + 22} anchor="middle">{token.trim()}</Mono>
                </g>
              ))}
              <Connector points={[[contextEnd + 6, y + 17], [352, y + 17]]} />
              <rect x={352} y={y + 3} width={56} height={28} rx="6" fill="var(--background)" stroke="var(--border)" />
              <ModelGlyph cx={380} cy={y + 17} scale={0.55} />
              <Connector points={[[408, y + 17], [outX, y + 17]]} />
              <rect x={outX} y={y} width={outWidth} height={34} rx="6" fill="var(--background)" stroke="var(--primary)" strokeWidth="1.5" />
              <Mono x={outX + outWidth / 2} y={y + 22} anchor="middle" color={isEnd ? "var(--muted-foreground)" : "var(--foreground)"}>{isEnd ? "<end>" : output.trim()}</Mono>
              {isEnd && <CircleStop {...iconProps(outX + outWidth + 10, y + 8, 18, "var(--muted-foreground)")} />}
              {!isEnd && row + 1 < rows && (
                <Connector dashed active points={[[outX + outWidth / 2, y + 34], [outX + outWidth / 2, y + 44], [target, y + 44], [target, y + 54]]} />
              )}
            </motion.g>
          )
        })}
      </Diagram>
    </>
  )
}

/* ---------- 6. Attention ---------- */

const sentence = ["The", "cat", "sat", "on", "the", "mat", "because", "it", "was", "tired"]
const attentionWeights: Record<string, number[]> = {
  it: [0.03, 0.52, 0.06, 0.02, 0.03, 0.22, 0.12],
  tired: [0.02, 0.2, 0.04, 0.01, 0.02, 0.05, 0.1, 0.41, 0.15],
  sat: [0.22, 0.78],
}
const queryWords = ["it", "tired", "sat"]

function AttentionScene({ playing, seen, still }: SceneProps) {
  const [manual, setManual] = useState(false)
  const [tick] = useCycle(queryWords.length, playing && !manual, 2600)
  const [chosenQuery, setQuery] = useState("it")
  const query = manual ? chosenQuery : queryWords[tick]
  const queryIndex = sentence.indexOf(query)
  const weights = attentionWeights[query]
  const size = 15
  const gap = 16
  const widths = sentence.map((word) => monoWidth(word, size))
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (sentence.length - 1)
  const centers = widths.map((width, index) => (600 - total) / 2 + widths.slice(0, index).reduce((sum, w) => sum + w + gap, 0) + width / 2)
  const baseline = 140
  const barBase = 214
  const ranked = weights.map((weight, index) => ({ word: sentence[index], weight })).sort((a, b) => b.weight - a.weight)

  return (
    <>
      <Controls>
        <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
        {queryWords.map((word) => (
          <Button key={word} type="button" size="sm" variant={query === word ? "secondary" : "outline"} aria-pressed={query === word} onClick={() => { setManual(true); setQuery(word) }} className="font-mono">{word}</Button>
        ))}
      </Controls>
      <Diagram
        viewBox="0 0 600 222"
        title={`Attention from the word ${query}`}
        description={`In the sentence The cat sat on the mat because it was tired, the word ${query} pays the most attention to ${ranked[0].word} (${pct(ranked[0].weight)})${ranked[1] ? ` and ${ranked[1].word} (${pct(ranked[1].weight)})` : ""}. Words after ${query} are not used.`}
      >
        {weights.map((weight, index) => {
          const from = centers[queryIndex]
          const to = centers[index]
          const lift = Math.min(108, 22 + Math.abs(from - to) * 0.3)
          return (
            <motion.path
              key={`${query}-${index}`}
              d={`M${from} ${baseline - 22}C${from} ${baseline - 22 - lift} ${to} ${baseline - 22 - lift} ${to} ${baseline - 22}`}
              fill="none"
              stroke="var(--primary)"
              strokeLinecap="round"
              strokeWidth={1 + weight * 9}
              strokeOpacity={0.25 + weight * 0.75}
              initial={still ? false : { pathLength: 0 }}
              animate={{ pathLength: seen ? 1 : 0 }}
              transition={{ duration: still ? 0 : smooth(0.7), delay: still ? 0 : fast(index * 0.05), ease: EASE }}
            />
          )
        })}
        <path d={`M${centers[0] - 24} ${barBase}H${centers[centers.length - 1] + 24}`} stroke="var(--border)" />
        {sentence.map((word, index) => {
          const isQuery = index === queryIndex
          const isFuture = index > queryIndex
          const weight = index < queryIndex ? weights[index] : 0
          return (
            <g key={index} opacity={isFuture ? 0.35 : 1} style={{ transition: cssTransition("opacity") }}>
              <text x={centers[index]} y={baseline} textAnchor="middle" fill={isQuery ? "var(--primary)" : "var(--foreground)"} fontSize={size} fontFamily={MONO} fontWeight={isQuery ? 600 : 400}>{word}</text>
              {isQuery && <path d={`M${centers[index] - widths[index] / 2} ${baseline + 7}h${widths[index]}`} stroke="var(--primary)" strokeWidth="2" />}
              <Mono x={centers[index]} y={baseline + 26} size={11} anchor="middle" color="var(--muted-foreground)">{index < queryIndex ? pct(weight) : isQuery ? "" : "–"}</Mono>
              <motion.rect x={centers[index] - 8} width={16} rx="2" fill="var(--primary)" fillOpacity={0.35 + weight * 0.65} initial={false} animate={{ height: seen ? weight * 38 : 0, y: barBase - (seen ? weight * 38 : 0) }} transition={{ duration: still ? 0 : smooth(0.5), ease: EASE }} />
            </g>
          )
        })}
      </Diagram>
    </>
  )
}

/* ---------- 7. Pretraining, fine-tuning, evaluation ---------- */

const stages = [
  { name: "Pretrained model", Icon: Library, response: ["What is the capital of Germany? What is the", "capital of Spain? What is the capital of Italy?"] },
  { name: "Fine-tuned model", Icon: GraduationCap, response: ["The capital of France is Paris."] },
]
const evalResults = [true, true, false, true, true]

function FineTuningScene({ playing, still }: SceneProps) {
  const [manual, setManual] = useState(false)
  const [tick, setTick] = useCycle(2, playing && !manual, 4200)
  const stage = still && !manual ? 1 : tick
  const { response, Icon: StageIcon } = stages[stage]
  const boxes = [
    { x: 20, Icon: Library, name: "Pretrain", detail: "10¹³ tokens" },
    { x: 215, Icon: GraduationCap, name: "Fine-tune", detail: "10⁵ examples" },
    { x: 410, Icon: ClipboardCheck, name: "Evaluate", detail: null },
  ]

  return (
    <>
      <Controls>
        {stages.map(({ name, Icon }, index) => (
          <IconButton key={name} label={name} pressed={stage === index} onClick={() => { setManual(true); setTick(index) }}><Icon /></IconButton>
        ))}
      </Controls>
      <Diagram
        viewBox="0 0 600 250"
        title="Pretraining, fine-tuning and evaluation"
        description={`Pretraining on about 10 to the 13 tokens, fine-tuning on about 10 to the 5 examples, then evaluation, where 4 of 5 test cases pass and failures loop back to fine-tuning. Asked What is the capital of France, the ${stage === 0 ? "pretrained model continues with more quiz questions" : "fine-tuned model answers: The capital of France is Paris"}.`}
      >
        {boxes.map(({ x, Icon, name, detail }, index) => (
          <Node key={name} x={x} y={12} width={170} height={64} active={index === stage}>
            <Icon {...iconProps(x + 14, 22, 20, index === stage ? "var(--primary)" : "var(--muted-foreground)")} />
            <text x={x + 42} y={37} fill={index === stage ? "var(--primary)" : "var(--foreground)"} fontSize="14" fontWeight="600" style={{ transition: cssTransition("fill") }}>{name}</text>
            {detail ? (
              <Mono x={x + 14} y={63} size={12} color="var(--muted-foreground)">{detail}</Mono>
            ) : (
              <g>
                {evalResults.map((pass, result) => pass
                  ? <Check key={result} {...iconProps(x + 14 + result * 18, 50, 14, "var(--primary)")} />
                  : <X key={result} {...iconProps(x + 14 + result * 18, 50, 14, "var(--destructive)")} />)}
                <Mono x={x + 156} y={63} size={12} anchor="end" color="var(--muted-foreground)">4/5</Mono>
              </g>
            )}
          </Node>
        ))}
        <Connector points={[[190, 44], [215, 44]]} />
        <Connector points={[[385, 44], [410, 44]]} />
        <Connector points={[[495, 76], [495, 94], [300, 94], [300, 76]]} />
        <rect x={386} y={85} width={22} height={18} fill="var(--card)" />
        <RotateCcw {...iconProps(390, 87, 14, "var(--primary)")} />

        <Node x={20} y={112} width={560} height={126}>
          <User {...iconProps(36, 127, 18, "var(--muted-foreground)")} />
          <text x={64} y={141} fill="var(--foreground)" fontSize="14.5">What is the capital of France?</text>
          <path d="M36 156H564" stroke="var(--border)" />
          <motion.g key={stage} initial={still ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: smooth(0.4), ease: EASE }}>
            <StageIcon {...iconProps(36, 170, 18)} />
            {response.map((line, index) => <text key={line} x={64} y={184 + index * 21} fill={stage === 1 ? "var(--primary)" : "var(--foreground)"} fontSize="14.5">{line}</text>)}
            {stage === 1 ? <CircleCheck {...iconProps(546, 170, 18)} /> : <Repeat {...iconProps(546, 170, 18, "var(--muted-foreground)")} />}
          </motion.g>
        </Node>
      </Diagram>
    </>
  )
}

/* ---------- 8. Application and model ---------- */

const contextRows = [
  { Icon: ScrollText, text: "system: internal support" },
  { Icon: FileText, text: "returns-policy.md" },
  { Icon: Wrench, text: "lookup_order(id)" },
  { Icon: MessagesSquare, text: "messages × 2" },
  { Icon: MessageCircle, text: '"Return order A123?"' },
]

function ApplicationScene({ playing, still }: SceneProps) {
  const [tick] = useCycle(5, playing, 1900)
  const phase = still ? -1 : tick
  const on = (step: number) => phase === step

  return (
    <Diagram
      viewBox="0 0 600 296"
      title="How an application uses a model"
      description="Inside an application, the context is assembled from a system instruction, a retrieved document, a tool definition, earlier messages and the user's message, about 1,850 tokens. 1: the context goes to the model. 2: the model requests the lookup_order tool for order A123. 3: the application runs the tool and adds the result, status delivered, to the context. 4: the model writes the answer shown to the user."
    >
      <rect x={8} y={8} width={584} height={280} rx="8" fill="none" stroke="var(--border)" strokeDasharray="4 4" />
      <AppWindow {...iconProps(20, 16, 18, "var(--muted-foreground)")} />

      {contextRows.map(({ Icon, text }, index) => {
        const y = 48 + index * 40
        return (
          <Node key={text} x={24} y={y} width={272} height={34} active={on(0) || (on(2) && index === 2)}>
            <Icon {...iconProps(36, y + 9, 16)} />
            <Mono x={60} y={y + 22} size={12}>{text}</Mono>
          </Node>
        )
      })}
      <Layers {...iconProps(24, 254, 16, "var(--muted-foreground)")} />
      <Mono x={46} y={266} size={12} color="var(--muted-foreground)">≈ 1,850 tokens</Mono>

      <Connector points={[[296, 145], [350, 145]]} active={on(0) || on(3)} />
      <Node x={350} y={113} width={100} height={64} active={on(0) || on(1) || on(3)}>
        <ModelGlyph cx={400} cy={145} scale={1.2} />
      </Node>

      <Connector points={[[400, 113], [400, 78], [460, 78]]} active={on(1)} />
      <Node x={460} y={52} width={124} height={52} active={on(1)}>
        <Wrench {...iconProps(470, 62, 16)} />
        <Mono x={492} y={74} size={11.5}>lookup_order</Mono>
        <Mono x={492} y={92} size={11.5} color="var(--muted-foreground)">{'("A123")'}</Mono>
      </Node>

      <Connector points={[[522, 52], [522, 32], [160, 32], [160, 48]]} active={on(2)} />
      <rect x={266} y={22} width={168} height={20} rx="4" fill="var(--card)" stroke={on(2) ? "var(--primary)" : "var(--border)"} style={{ transition: cssTransition("stroke") }} />
      <Mono x={350} y={36} size={11} anchor="middle" color={on(2) ? "var(--foreground)" : "var(--muted-foreground)"}>{'{ status: "delivered" }'}</Mono>

      <Connector points={[[400, 177], [400, 214], [460, 214]]} active={on(3)} />
      <Node x={460} y={188} width={124} height={52} active={on(3)}>
        <MessageCircle {...iconProps(470, 197, 16)} />
        <User {...iconProps(560, 197, 14, "var(--muted-foreground)")} />
        <Mono x={470} y={230} size={11.5}>{'"Yes, eligible."'}</Mono>
      </Node>

      {[
        [323, 145],
        [430, 78],
        [220, 32],
        [430, 214],
      ].map(([cx, cy], index) => (
        <g key={index}>
          <circle cx={cx} cy={cy} r="9" fill={on(index) ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" style={{ transition: cssTransition("fill") }} />
          <text x={cx} y={cy + 4} textAnchor="middle" fill={on(index) ? "var(--primary-foreground)" : "var(--primary)"} fontSize="11" fontWeight="600" style={{ transition: cssTransition("fill") }}>{index + 1}</text>
        </g>
      ))}
    </Diagram>
  )
}

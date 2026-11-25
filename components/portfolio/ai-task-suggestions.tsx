"use client"

import { useId, useState } from "react"
import { Briefcase, FolderGit2, Waypoints } from "lucide-react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
import { aiTaskGroups } from "@/lib/portfolio-data"
import { MARK } from "@/lib/mark"
import type { ChatWorkflow } from "@/lib/ai-client"

const icons = [FolderGit2, Briefcase, Waypoints]

// The existing portfolio mark and SVG scene conventions, animated by the
// selected task rather than a looping or simulated AI activity indicator.
function TaskIllustration({ group }: { group: number }) {
  const reduced = useReducedMotion()
  const positions = group === 0 ? [[152, 48], [152, 144], [472, 48], [472, 144]]
    : group === 1 ? [[152, 64], [152, 128], [472, 64], [472, 128]]
      : [[128, 96], [256, 96], [384, 96], [512, 96]]
  return (
    <svg viewBox="0 0 640 220" className="block h-auto w-full" aria-hidden="true">
      {positions.map(([x, y], index) => (
        <motion.g key={index} initial={false} animate={{ x, y }} transition={reduced ? { duration: 0 } : undefined}>
          <motion.path initial={false} animate={{ d: `M0 0 L${320 - x} ${110 - y}` }} transition={reduced ? { duration: 0 } : undefined} stroke="var(--border)" fill="none" />
          <circle r={17} fill="var(--card)" stroke="var(--primary)" />
          <path d="M-6 0h12m-6-6v12" stroke="var(--primary)" fill="none" />
        </motion.g>
      ))}
      <g transform="translate(288 78)">
        <circle {...MARK.bowl} fill="var(--primary)" />
        <rect {...MARK.stem} fill="var(--primary)" />
      </g>
    </svg>
  )
}

export function AiTaskSuggestions({ onChoose }: { onChoose: (workflow: ChatWorkflow, prompt: string) => void }) {
  const [selected, setSelected] = useState(0)
  const id = useId()
  const reduced = useReducedMotion()
  const group = aiTaskGroups[selected]
  const Icon = icons[selected]
  return (
    <LayoutGroup id={id}>
      <section aria-label="Choose what to do" className="flex min-w-0 flex-col gap-4">
        <div role="tablist" aria-label="Tasks" className="flex flex-wrap gap-2">
          {aiTaskGroups.map((item, index) => (
            <Button
              key={item.id} id={`${id}-${item.id}`} role="tab" type="button"
              aria-selected={selected === index} aria-controls={`${id}-panel`} tabIndex={selected === index ? 0 : -1}
              variant="ghost" className="relative isolate"
              onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                const next = event.key === "ArrowRight" ? (index + 1) % aiTaskGroups.length
                  : event.key === "ArrowLeft" ? (index + aiTaskGroups.length - 1) % aiTaskGroups.length
                    : event.key === "Home" ? 0 : event.key === "End" ? aiTaskGroups.length - 1 : null
                if (next === null) return
                event.preventDefault()
                setSelected(next)
                document.getElementById(`${id}-${aiTaskGroups[next].id}`)?.focus()
              }}
            >
              {selected === index ? <motion.span layoutId="selected-task" transition={reduced ? { duration: 0 } : undefined} className="absolute inset-0 -z-10 rounded-lg bg-secondary" /> : null}
              {item.label}
            </Button>
          ))}
        </div>
        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${group.id}`} className="min-w-0">
          <div className="grid items-center gap-2 sm:grid-cols-2">
            <p className="text-body text-muted-foreground">{group.description}</p>
            <TaskIllustration group={selected} />
          </div>
          <motion.ul key={group.id} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="grid min-w-0 gap-2 sm:grid-cols-2">
            {group.tasks.map((task) => (
              <li key={task.label} className="min-w-0">
                <PromptSuggestion className="h-full items-start" onClick={() => onChoose(task.workflow, task.prompt)}>
                  <Icon aria-hidden="true" />
                  <span className="min-w-0">
                    <strong className="block text-body font-medium text-foreground">{task.label}</strong>
                    <span className="block text-caption">{task.description}</span>
                  </span>
                </PromptSuggestion>
              </li>
            ))}
          </motion.ul>
        </div>
      </section>
    </LayoutGroup>
  )
}

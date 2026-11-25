"use client"

import { Briefcase, FolderGit2, Waypoints } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
import { aiTaskGroups } from "@/lib/portfolio-data"
import type { ChatWorkflow } from "@/lib/ai-client"

const icons = [FolderGit2, Briefcase, Waypoints]

// Matches the two Grok screenshots supplied for this change: category rows
// below the composer first, then only the chosen category's suggestions.
// NN/g: https://www.nngroup.com/articles/progressive-disclosure/
export function AiTaskSuggestions({ groupId, onGroupChange, onChoose }: {
  groupId: string | null
  onGroupChange: (groupId: string | null) => void
  onChoose: (workflow: ChatWorkflow, prompt: string) => void
}) {
  const group = aiTaskGroups.find((item) => item.id === groupId)
  const Icon = icons[group ? aiTaskGroups.indexOf(group) : 0]
  return (
    <section aria-label={group ? `${group.label} suggestions` : "Choose what to do"}>
      {group ? (
        <div className="mb-2 flex items-center justify-between gap-2 text-caption text-muted-foreground">
          <span>{group.label}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onGroupChange(null)}>Back to all tasks</Button>
        </div>
      ) : null}
      <ul key={group?.id ?? "categories"} className="flex min-w-0 flex-col gap-2 animate-in fade-in duration-150 motion-reduce:animate-none">
        {group ? group.tasks.map((task) => (
          <li key={task.label}>
            <PromptSuggestion onClick={() => onChoose(task.workflow, task.prompt)}>
              <Icon aria-hidden="true" />
              <span className="text-body">{task.label}</span>
            </PromptSuggestion>
          </li>
        )) : aiTaskGroups.map((item, index) => {
          const CategoryIcon = icons[index]
          return (
            <li key={item.id}>
              <PromptSuggestion onClick={() => onGroupChange(item.id)}>
                <CategoryIcon aria-hidden="true" />
                <span className="text-body">{item.label}</span>
              </PromptSuggestion>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

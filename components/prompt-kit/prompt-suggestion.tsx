import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Adapted from prompt-kit's PromptSuggestion (MIT): a pill that fills the
// composer with a starter question.
function PromptSuggestion({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-auto min-h-9 rounded-full bg-background px-4 py-2 text-caption font-normal whitespace-normal text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { PromptSuggestion }

import { cn } from "@/lib/utils"

// Adapted from prompt-kit's PromptSuggestion (MIT), in its quiet list style:
// a full-width text row rather than a button-looking chip, so suggestions stay
// light next to the input (Nielsen Norman Group, "Designing Use-Case Prompt
// Suggestions").
function PromptSuggestion({ className, type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-caption text-muted-foreground transition-colors outline-none hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-subtle-foreground",
        className
      )}
      {...props}
    />
  )
}

export { PromptSuggestion }

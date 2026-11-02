import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Markdown } from "./markdown"

// Adapted from prompt-kit's Message (MIT), using Base UI tooltips.

function Message({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      {children}
    </div>
  )
}

function MessageContent({
  children,
  markdown = false,
  className,
}: {
  children: React.ReactNode
  markdown?: boolean
  className?: string
}) {
  const classNames = cn("break-words [overflow-wrap:anywhere] text-foreground", className)
  return markdown ? (
    <Markdown className={classNames}>{children as string}</Markdown>
  ) : (
    <div className={classNames}>{children}</div>
  )
}

function MessageActions({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-0 text-muted-foreground", className)} {...props}>
      {children}
    </div>
  )
}

function MessageAction({
  tooltip,
  children,
  side = "bottom",
}: {
  tooltip: React.ReactNode
  children: React.ReactElement
  side?: "top" | "bottom" | "left" | "right"
}) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger render={children} />
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Message, MessageContent, MessageActions, MessageAction }

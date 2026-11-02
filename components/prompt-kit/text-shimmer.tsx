import { cn } from "@/lib/utils"

// Adapted from prompt-kit's TextShimmer (MIT): a light sweep across muted
// text, used as the "working on it" status line instead of a spinner.
export function TextShimmer({
  className,
  duration = 2.5,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { duration?: number }) {
  return (
    <span
      className={cn(
        "animate-[text-shimmer_linear_infinite] bg-size-[200%_auto] bg-clip-text text-transparent motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--muted-foreground) 30%, var(--foreground) 50%, var(--muted-foreground) 70%)",
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </span>
  )
}

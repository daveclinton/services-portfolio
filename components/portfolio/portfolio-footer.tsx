import { footer } from "@/lib/portfolio-data"

/** The layout pins this to the bottom of the viewport and draws its hairline. */
export function PortfolioFooter() {
  return (
    <footer>
      <p className="text-caption text-muted-foreground">
        © {new Date().getFullYear()} {footer.name}
      </p>
    </footer>
  )
}

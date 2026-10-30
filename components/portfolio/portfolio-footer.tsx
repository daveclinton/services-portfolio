import { footer } from "@/lib/portfolio-data"

export function PortfolioFooter() {
  return (
    <footer>
      <p className="text-caption text-muted-foreground">
        © {new Date().getFullYear()} {footer.name}
      </p>
    </footer>
  )
}

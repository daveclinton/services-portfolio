import { footer } from "@/lib/portfolio-data"

export function PortfolioFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 sm:mt-14">
      <p className="text-caption text-muted-foreground">
        © {new Date().getFullYear()} {footer.name}
      </p>
    </footer>
  )
}

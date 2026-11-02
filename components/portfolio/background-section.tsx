import { Timeline } from "@/components/portfolio/timeline"
import { backgroundItems } from "@/lib/portfolio-data"

export function BackgroundSection() {
  return (
    <>
      <header className="page-header">
        <h1>Work experience</h1>
        <p>Where I&apos;ve worked, most recent first.</p>
      </header>
      <Timeline items={backgroundItems} />
    </>
  )
}

import type { Metadata } from "next"
import { NumberedPage } from "@/components/portfolio/numbered-page"
import { backgroundItems, formatRoleDates, site } from "@/lib/portfolio-data"

export const metadata: Metadata = {
  title: "Work experience",
  alternates: { canonical: "/experience" },
  openGraph: { type: "website", siteName: site.name, title: "Work experience", description: site.description, url: "/experience" },
  twitter: { card: "summary_large_image", title: "Work experience", description: site.description },
}

export default function ExperiencePage() {
  return (
    <NumberedPage
      id="experience"
      heading="Work experience"
      items={backgroundItems.map((role) => ({
        key: role.id,
        title: role.company,
        image: role.iconSrc,
        body: (
          <>
            <p className="signal-meta">{[formatRoleDates(role), role.location, role.arrangement].filter(Boolean).join(" · ")}</p>
            <p>{role.description}</p>
            {role.highlights?.length ? (
              <ul className="signal-points">
                {role.highlights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </>
        ),
      }))}
    />
  )
}

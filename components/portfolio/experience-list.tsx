import { NumberedPage } from "@/components/portfolio/numbered-page"
import { backgroundItems, formatRoleDates } from "@/lib/portfolio-data"

export function ExperienceList({ initial }: { initial?: number }) {
  return (
    <NumberedPage
      id="experience"
      heading="Work experience"
      listPath="/experience"
      basePath="/experience"
      initial={initial}
      items={backgroundItems.map((role) => ({
        slug: role.slug,
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

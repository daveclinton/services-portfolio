import Image from "next/image"

import { formatRoleDates, type TimelineEntry } from "@/lib/portfolio-data"

export function TimelineItem({
  company,
  iconSrc,
  location,
  arrangement,
  start,
  end,
  description,
  highlights,
}: TimelineEntry) {
  const meta = [formatRoleDates({ start, end }), location, arrangement].filter(Boolean).join(" · ")

  return (
    <li>
      <div aria-hidden="true">
        {iconSrc ? (
          <Image src={iconSrc} alt="" width={36} height={36} className="role-logo" />
        ) : null}
      </div>
      <div>
        <h2>{company}</h2>
        <p className="post-meta">{meta}</p>
        <p className="role-description">{description}</p>
        {highlights?.length ? (
          <ul className="role-highlights">
            {highlights.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

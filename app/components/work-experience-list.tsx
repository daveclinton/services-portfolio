'use client'

import { useMemo, useState } from 'react'

type Experience = {
  company: string
  role: string
  start: string
  end: string
  duration: string
  location: string
  highlights: string[]
}

export function WorkExperienceList({ experiences }: { experiences: Experience[] }) {
  const initialOpen = useMemo(() => '', [])

  const [openItem, setOpenItem] = useState(initialOpen)

  return (
    <section className="work-content" aria-label="Experience timeline">
      {experiences.map((experience) => {
        const key = `${experience.company}-${experience.start}`
        const isOpen = openItem === key

        return (
          <article key={key} className={`work-item ${isOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="work-item-toggle"
              aria-expanded={isOpen}
              onClick={() => setOpenItem((current) => (current === key ? '' : key))}
            >
              <div className="work-item-headline">
                <h2>{experience.role}</h2>
                <span className="work-item-actions">
                  {!isOpen ? (
                    <span className="work-item-ping" aria-hidden="true">
                      <span className="work-item-ping-dot" />
                      <span className="work-item-ping-ring" />
                    </span>
                  ) : null}
                  <span className={`work-item-chevron ${isOpen ? 'open' : ''}`}>▾</span>
                </span>
              </div>
              <p className="work-company">{experience.company}</p>
              <p className="work-date">
                {experience.start} - {experience.end} ({experience.duration})
              </p>
            </button>

            <div className={`work-item-panel ${isOpen ? 'open' : 'closed'}`}>
              <div className="work-item-panel-inner">
                <p className="work-location">{experience.location}</p>
                <ul>
                  {experience.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}

import { useEffect, useState } from 'react'

/** Matches Excalidraw phone breakpoint (MQ_MAX_MOBILE = 599). */
const MOBILE_QUERY = '(max-width: 599px), (max-height: 500px) and (max-width: 999px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}
import { useEffect } from 'react'
import type { RefObject } from 'react'

type OutsideClickEvent = Event & { target: Element }

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: (event: OutsideClickEvent) => void,
  isInside?: (event: OutsideClickEvent, container: T) => boolean | undefined,
) {
  useEffect(() => {
    const onPointerStart = (event: Event) => {
      const container = ref.current
      const target = event.target

      if (!container || !(target instanceof Element)) return

      const typedEvent = event as OutsideClickEvent
      const customInside = isInside?.(typedEvent, container)

      if (typeof customInside === 'boolean') {
        if (!customInside) callback(typedEvent)
        return
      }

      if (container.contains(target)) return
      if (!document.documentElement.contains(target)) return
      if (target.closest('[data-radix-portal]')) return
      if (document.body.style.pointerEvents === 'none' && target.closest('[data-radix-portal]')) return
      if (target.closest('[data-prevent-outside-click]')) return

      callback(typedEvent)
    }

    document.addEventListener('pointerdown', onPointerStart)
    document.addEventListener('touchstart', onPointerStart)

    return () => {
      document.removeEventListener('pointerdown', onPointerStart)
      document.removeEventListener('touchstart', onPointerStart)
    }
  }, [callback, isInside, ref])
}

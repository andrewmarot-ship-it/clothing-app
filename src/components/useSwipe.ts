import { useRef, type PointerEvent } from 'react'

/** Horizontal swipe handlers: calls back with +1 for a left swipe (next) and −1 for a right swipe. */
export function useSwipe(onSwipe: (dir: 1 | -1) => void, threshold = 36) {
  const startX = useRef<number | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      startX.current = e.clientX
    },
    onPointerUp: (e: PointerEvent) => {
      if (startX.current == null) return
      const dx = e.clientX - startX.current
      startX.current = null
      if (Math.abs(dx) > threshold) onSwipe(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => {
      startX.current = null
    },
  }
}

import { useEffect, useState } from 'react'
import { CHIPS, PRESETS } from '../domain/occasions'
import { today, useApp } from './context'
import { readOccasion } from './occasionApi'

/** Wait for a pause in typing before asking Claude. */
const READ_DELAY_MS = 700
const CHIP_LABELS = new Set(CHIPS.map((k) => PRESETS[k].label))

/**
 * Ask Claude to read typed occasion text (not a quick-pick chip) once typing
 * pauses, while the caller is mounted. Signed-in only; keywords cover the rest.
 * Returns whether a reading is in flight.
 */
export function useOccasionReading(): boolean {
  const { state, set, cloud } = useApp()
  const [reading, setReading] = useState(false)
  const text = state.occText.trim()
  const wants = !!cloud.user && text.length >= 4 && !CHIP_LABELS.has(text) && state.occAi?.text !== state.occText
  useEffect(() => {
    if (!wants) return
    const typed = state.occText
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setReading(true)
      const occasion = await readOccasion(typed, today(), ctrl.signal)
      if (ctrl.signal.aborted) return
      setReading(false)
      if (occasion) set({ occAi: { text: typed, occasion } })
    }, READ_DELAY_MS)
    return () => {
      clearTimeout(t)
      ctrl.abort()
      setReading(false)
    }
  }, [wants, state.occText, set])
  return reading
}

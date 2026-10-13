import { useEffect, useSyncExternalStore } from 'react'

/** Light is Linen, dark is Nocturne. System follows the device. */
export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'clothesline-theme-v1'
/** Matches --color-bg in each theme, for the browser and phone chrome. */
const CHROME: Record<'light' | 'dark', string> = { light: '#efeee9', dark: '#161826' }

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // fall through
  }
  return 'light'
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function applyTheme(pref: ThemePref) {
  const theme = pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[theme])
}

// A tiny store, so any screen can read or change the preference.
let pref: ThemePref = loadThemePref()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // It still applies for this visit.
  }
  applyTheme(next)
  listeners.forEach((fn) => fn())
}

/** The theme preference, kept applied (and following the device when set to System). */
export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const current = useSyncExternalStore(subscribe, () => pref)
  useEffect(() => {
    applyTheme(current)
    if (current !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [current])
  return [current, setThemePref]
}

/**
 * The glow behind garments. Tone tints it with the clothes' own colours,
 * accent uses the app's violet, and off removes it.
 */
export type GlowPref = 'tone' | 'accent' | 'off'

const GLOW_KEY = 'clothesline-glow-v1'

export function parseGlow(v: string | null): GlowPref {
  return v === 'accent' || v === 'off' ? v : 'tone'
}

let glow: GlowPref = (() => {
  try {
    return parseGlow(localStorage.getItem(GLOW_KEY))
  } catch {
    return 'tone'
  }
})()
const glowListeners = new Set<() => void>()

export function setGlowPref(next: GlowPref) {
  glow = next
  try {
    localStorage.setItem(GLOW_KEY, next)
  } catch {
    // Still applies for this visit.
  }
  glowListeners.forEach((fn) => fn())
}

export function useGlowPref(): [GlowPref, (p: GlowPref) => void] {
  const current = useSyncExternalStore(
    (fn) => {
      glowListeners.add(fn)
      return () => glowListeners.delete(fn)
    },
    () => glow,
  )
  return [current, setGlowPref]
}

/** One colour for an outfit: the top leads, the bottom (if any) blends in. */
export const outfitColour = (top: string, bottom?: string | null) => (bottom ? `color-mix(in oklch, ${top} 55%, ${bottom})` : top)

/** Background for a glow behind a garment, `strength` % of the colour at its centre. */
export function glowFill(pref: GlowPref, colour: string, strength: number): string {
  if (pref === 'off') return 'none'
  if (pref === 'accent') return 'radial-gradient(closest-side, var(--color-accent-800), transparent)'
  return `radial-gradient(closest-side, color-mix(in oklch, ${colour} ${strength}%, transparent), transparent)`
}

/** The wash across the top of the Outfit screen: the outfit's colour, faintly. Tone only. */
export function washFill(pref: GlowPref, colour: string): string {
  if (pref !== 'tone') return 'none'
  return `radial-gradient(80% 55% at 50% 0%, color-mix(in oklch, ${colour} 32%, transparent), transparent)`
}

/** The user's palette as a conic gradient, for the aura blobs and the Add ring. */
export const paletteConic = (palette: string[]) => `conic-gradient(from 0deg, ${[...palette, palette[0]].join(', ')})`

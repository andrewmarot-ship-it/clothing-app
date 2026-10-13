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

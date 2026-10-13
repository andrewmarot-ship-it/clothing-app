/**
 * Haptics and sound. One fx(kind) call per moment, each channel gated on its
 * own setting. Settings stay on this device. Sound is synthesised with
 * WebAudio, so there are no files to load.
 */
import { useSyncExternalStore } from 'react'

export type FxKind = 'tick' | 'peg' | 'match' | 'tap'

export interface FeedbackSettings {
  sound: boolean
  haptics: boolean
}

const KEY = 'clothesline-feedback-v1'
/** Haptics are subtle; sound could surprise someone in public, so it starts off. */
export const DEFAULT_FEEDBACK: FeedbackSettings = { sound: false, haptics: true }

export const VIBRATION: Record<FxKind, number | number[]> = { tick: 6, tap: 4, peg: [10, 40, 14], match: [8, 30, 8, 30, 18] }

export function parseFeedback(raw: string | null): FeedbackSettings {
  try {
    const v = JSON.parse(raw ?? 'null') as Partial<FeedbackSettings> | null
    return {
      sound: typeof v?.sound === 'boolean' ? v.sound : DEFAULT_FEEDBACK.sound,
      haptics: typeof v?.haptics === 'boolean' ? v.haptics : DEFAULT_FEEDBACK.haptics,
    }
  } catch {
    return DEFAULT_FEEDBACK
  }
}

function load(): FeedbackSettings {
  try {
    return parseFeedback(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_FEEDBACK
  }
}

let settings = load()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setFeedback(patch: Partial<FeedbackSettings>) {
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Still applies for this visit.
  }
  listeners.forEach((fn) => fn())
}

export function useFeedback(): FeedbackSettings {
  return useSyncExternalStore(subscribe, () => settings)
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

let audio: AudioContext | null = null

/** A short tone with a 4ms attack and an exponential decay. */
function blip(ctx: AudioContext, freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const t0 = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.004)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(amp).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function play(kind: FxKind) {
  if (kind === 'tap') return
  // Created on first use, which is always inside a tap, so the browser allows it.
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
  if (kind === 'tick') blip(audio, 1800, 0, 0.03, 0.03)
  if (kind === 'peg') {
    blip(audio, 900, 0, 0.025, 0.06, 'triangle')
    blip(audio, 1400, 0.05, 0.03, 0.05, 'triangle')
  }
  if (kind === 'match') [523, 659, 784, 1047].forEach((f, i) => blip(audio!, f, i * 0.07, 0.22, 0.045))
}

/**
 * Feedback for a moment in the app. tick: a piece snaps into place; peg: a
 * look is saved or a piece added; match: an outfit is found or hung; tap:
 * plain navigation. Never throws.
 */
export function fx(kind: FxKind, override?: Partial<FeedbackSettings>) {
  const s = { ...settings, ...override }
  try {
    // Not on iOS Safari; skipped when the user has asked for less motion.
    if (s.haptics && typeof navigator.vibrate === 'function' && !reducedMotion()) navigator.vibrate(VIBRATION[kind])
  } catch {
    // ignore
  }
  try {
    if (s.sound && typeof AudioContext === 'function') play(kind)
  } catch {
    // ignore
  }
}

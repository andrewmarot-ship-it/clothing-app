import { rankTones } from './tones.ts'

export type QuizAnswers = [h: number | null, v: number | null, c: number | null]

export interface QuizOption {
  label: string
  value: number
  sub: string
  swatches: string[]
}

export interface QuizQuestion {
  dim: 'Hue' | 'Value' | 'Chroma'
  q: string
  help: string
  opts: QuizOption[]
}

const opt = (label: string, value: number, sub: string, swatches: string[]): QuizOption => ({ label, value, sub, swatches })

export const QUIZ: QuizQuestion[] = [
  {
    dim: 'Hue',
    q: 'Which metal looks better against your skin?',
    help: 'Hold gold, then silver, under your chin in daylight. Pick the one that makes your skin look clear and even.',
    opts: [
      opt('Gold', 1, 'Warm undertone', ['#b8862f', '#c9a24a', '#e0b85c', '#f1d58a']),
      opt('Both, gold edges it', 0.5, 'Warm-neutral', ['#c9a24a', '#e0b85c', '#c8ccd6', '#b2b6ca']),
      opt('Both, silver edges it', -0.5, 'Cool-neutral', ['#c8ccd6', '#b2b6ca', '#c9a24a', '#e0b85c']),
      opt('Silver', -1, 'Cool undertone', ['#9397ab', '#b2b6ca', '#cfd3e5', '#e4e7f5']),
    ],
  },
  {
    dim: 'Value',
    q: 'Which shades sit best near your face?',
    help: 'Not washed out, not heavy. Your skin should look even and awake.',
    opts: [
      opt('Light', 0.15, 'Pastels, ivory, soft grey', ['#f3e6d4', '#e7d3dc', '#d5e1ea', '#e9e3cf']),
      opt('Mid', 0.5, 'Camel, sage, dusty rose', ['#c9a27e', '#8f9a6e', '#b5735a', '#8a9bb0']),
      opt('Deep', 0.85, 'Espresso, forest, burgundy', ['#3e2b22', '#2f4a3a', '#5b1a2e', '#2a2d3a']),
    ],
  },
  {
    dim: 'Chroma',
    q: 'Clear and bright, or soft and muted?',
    help: 'Bright colours either light you up or wear you. Muted ones either calm you or dull you.',
    opts: [
      opt('Clear and bright', 0.9, 'Saturated, crisp', ['#ff6f61', '#00b3a6', '#3fa7f5', '#e8418c']),
      opt('In between', 0.5, 'Rich but not loud', ['#c46a2b', '#5b7fb3', '#2e6b5e', '#d16b8c']),
      opt('Soft and muted', 0.15, 'Greyed, gentle', ['#a67b5b', '#8a9bb0', '#8f9a6e', '#b0909c']),
    ],
  },
]

/** Tones still in the running: top 5 − answered, or the top 3 once all are answered. */
export function shortlist(answers: QuizAnswers): number[] {
  const answered = answers.filter((a) => a != null).length
  if (!answered) return []
  return rankTones(...answers).slice(0, answered === 3 ? 3 : 5 - answered)
}

export const quizResult = (answers: QuizAnswers) => rankTones(...answers)[0]

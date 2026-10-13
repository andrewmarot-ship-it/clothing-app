import { useEffect } from 'react'
import { SignInForm } from '../components/SignIn'
import { SILHOUETTES } from '../domain/silhouettes'
import { TONES } from '../domain/tones'
import type { Kind } from '../domain/types'
import { useApp } from '../state/context'
import { markWelcomed } from '../state/welcome'

const autumn = TONES.find((t) => t.name === 'True Autumn')!.palette

/** Three pieces on the line, each placed (in the 390×200 stage) where the line passes. */
const PIECES: { kind: Kind; color: string; x: number; y: number; pegs: [number, number] }[] = [
  { kind: 'tee', color: autumn[6], x: 36, y: 63, pegs: [31, 64] },
  { kind: 'jeans', color: autumn[5], x: 145, y: 78, pegs: [29, 66] },
  { kind: 'shirt', color: autumn[0], x: 250, y: 66, pegs: [34, 61] },
]

/**
 * First launch: a clothesline draws itself, three pieces are pegged to it,
 * then a calm sign-in form settles in. Signing in is optional.
 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const { cloud } = useApp()

  const finish = () => {
    markWelcomed()
    onDone()
  }

  // Signed in (here, or in another tab via the emailed link): straight to the app.
  useEffect(() => {
    if (!cloud.user) return
    markWelcomed()
    onDone()
  }, [cloud.user, onDone])

  return (
    <div className="page">
      <main className="app welcome">
        <svg viewBox="0 0 390 200" className="welcome-stage" aria-hidden="true">
          <path className="welcome-line" d="M0 40 Q195 120 390 40" fill="none" stroke="url(#fade)" strokeWidth={2} />
          {PIECES.map((p, i) => (
            <g key={p.kind} transform={`translate(${p.x} ${p.y}) scale(1.05)`}>
              <g className={`welcome-drop welcome-drop--${i + 1}`}>
                <path d={SILHOUETTES[p.kind]} fill={p.color} strokeWidth={0.8} strokeLinejoin="round" style={{ stroke: 'var(--color-neutral-700)' }} />
                <path d={SILHOUETTES[p.kind]} fill="url(#shade)" opacity={0.35} />
                {p.pegs.map((x) => (
                  <rect key={x} x={x} y={-4} width={5} height={12} rx={1.5} style={{ fill: 'var(--color-accent)' }} />
                ))}
              </g>
            </g>
          ))}
        </svg>

        <div className="welcome-brand pad">
          <h1 className="welcome-word">Clothesline</h1>
          <p className="welcome-tag">Your wardrobe, matched to your colours.</p>
        </div>

        <div className="welcome-form pad">
          {cloud.enabled && <SignInForm />}
          <button type="button" className={`btn ${cloud.enabled ? 'btn-ghost btn-quiet' : 'btn-primary'} btn-tall`} onClick={finish}>
            {cloud.enabled ? 'Continue without an account' : 'Get started'}
          </button>
        </div>
      </main>
    </div>
  )
}

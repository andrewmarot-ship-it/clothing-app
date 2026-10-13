import { CaretLeft, CoatHanger, Dresser, Heart, Plus, User, type Icon } from '@phosphor-icons/react'
import type { CSSProperties, ReactNode } from 'react'
import { TONES } from '../domain/tones'
import { TABS, useApp, type Tab } from '../state/context'
import { fx } from '../state/feedback'
import { outfitColour, paletteConic, useGlowPref } from '../state/theme'

/** The back row that replaces the tab bar on pushed screens. */
export function BackRow({ label, onBack, right }: { label: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="back-row">
      <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
        <CaretLeft size={16} />
        {label}
      </button>
      {right && <span className="back-right">{right}</span>}
    </div>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`kicker ${className ?? ''}`}>{children}</span>
}

const TAB_INFO: Record<Tab, { label: string; icon: Icon }> = {
  outfit: { label: 'Stage', icon: CoatHanger },
  wardrobe: { label: 'Wardrobe', icon: Dresser },
  add: { label: 'Add', icon: Plus },
  looks: { label: 'Looks', icon: Heart },
  profile: { label: 'Profile', icon: User },
}

/**
 * The floating dock: the active tab widens to show its label, Add pokes up
 * out of the middle inside a turning ring of the user's palette, and the
 * dock's glow and top hairline take on the outfit's colour.
 */
export function Dock() {
  const { state, go, outfit, userTone } = useApp()
  const [glow] = useGlowPref()
  const colour = outfit ? outfitColour(outfit.t.color, outfit.b?.color) : null
  const tint = glow === 'tone' && colour
  const vars = {
    '--dock-glow': tint ? `color-mix(in oklch, ${colour} 22%, transparent)` : 'transparent',
    '--dock-line': tint ? `color-mix(in oklch, ${colour} 50%, var(--color-accent))` : 'var(--color-accent)',
    '--dock-palette': paletteConic(TONES[userTone].palette),
  } as CSSProperties
  return (
    <>
      <div className="dock-fade" aria-hidden="true" />
      <nav className="dock" aria-label="Main" style={vars}>
        {TABS.map((k) => {
          const { label, icon: TabIcon } = TAB_INFO[k]
          const active = state.screen === k
          if (k === 'add')
            return (
              <button
                key={k}
                type="button"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="dock-add"
                onClick={() => {
                  fx('peg')
                  go(k, { retakeId: null })
                }}
              >
                <span className="dock-add-ring" aria-hidden="true" />
                <span className="dock-add-btn">
                  <Plus size={24} weight="bold" />
                </span>
              </button>
            )
          return (
            <button
              key={k}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`dock-tab ${active ? 'is-active' : ''}`}
              onClick={() => {
                fx('tap')
                go(k)
              }}
            >
              <TabIcon size={24} />
              <span className="dock-label">{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

/** A row of filled/empty dots for a 1…max scale. */
export function Dots({ n, max }: { n: number; max: number }) {
  return (
    <span className="dots" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ background: i < n ? 'var(--color-accent)' : 'var(--color-neutral-800)' }} />
      ))}
    </span>
  )
}

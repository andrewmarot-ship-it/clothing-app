import { CaretLeft, Dresser, Heart, Plus, TShirt, User, type Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { TABS, useApp, type Tab } from '../state/context'

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
  outfit: { label: 'Outfit', icon: TShirt },
  wardrobe: { label: 'Wardrobe', icon: Dresser },
  add: { label: 'Add', icon: Plus },
  looks: { label: 'Looks', icon: Heart },
  profile: { label: 'Profile', icon: User },
}

export function TabBar() {
  const { state, go } = useApp()
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((k) => {
        const { label, icon: TabIcon } = TAB_INFO[k]
        const active = state.screen === k
        return (
          <button
            key={k}
            type="button"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`tab ${k === 'add' ? 'tab--add' : ''} ${active ? 'is-active' : ''}`}
            onClick={() => go(k, k === 'add' ? { retakeId: null } : {})}
          >
            <span className="tab-icon">
              <TabIcon size={20} />
            </span>
            {k !== 'add' && <span>{label}</span>}
          </button>
        )
      })}
    </nav>
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

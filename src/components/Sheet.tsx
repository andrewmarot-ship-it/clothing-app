import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/** A bottom sheet over the Stage. Always mounted so it can slide in and out. */
export function Sheet({ open, label, kicker, onClose, children }: { open: boolean; label: string; kicker: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className={`sheet ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open || undefined} inert={!open || undefined}>
      <span className="sheet-grabber" aria-hidden="true" />
      <div className="sheet-head">
        <span className="sheet-kicker">{kicker}</span>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  )
}

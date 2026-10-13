/** An on/off switch row: a label, a line of explanation, and the pill. */
export function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch-row" onClick={() => onChange(!checked)}>
      <span className="col gap-2px">
        <span className="switch-label">{label}</span>
        <span className="meta">{hint}</span>
      </span>
      <span className={`switch ${checked ? 'is-on' : ''}`} aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  )
}

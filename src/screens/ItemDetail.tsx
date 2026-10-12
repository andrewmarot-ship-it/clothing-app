import type { ReactNode } from 'react'
import { BackRow, Dots, Kicker } from '../components/Chrome'
import { Garment, Line, Pins } from '../components/Garment'
import { itemMatch } from '../components/match'
import { CODES, PRESETS } from '../domain/occasions'
import { bestPartners, toneFit } from '../domain/scoring'
import { TONES } from '../domain/tones'
import { useApp } from '../state/context'

export function ItemDetail() {
  const { state, go, set, byId, rated } = useApp()
  const item = byId(state.itemId)
  const backTo = state.from === 'outfit' ? 'outfit' : 'wardrobe'
  const back = <BackRow label={backTo === 'outfit' ? 'Outfit' : 'Wardrobe'} onBack={() => go(backTo)} />

  if (!item) {
    return (
      <>
        {back}
        <p className="pad top-8 muted">This piece is no longer in your wardrobe.</p>
      </>
    )
  }

  const m = itemMatch(item)
  const partners = bestPartners(item, rated, PRESETS.today)
  const isLast = !rated.some((i) => i.id !== item.id && i.cat === item.cat)

  const remove = () => {
    if (isLast) return
    set((s) => ({
      items: s.items.filter((i) => i.id !== item.id),
      saved: s.saved.filter((l) => l.topId !== item.id && l.botId !== item.id),
    }))
    go('wardrobe')
  }

  const attrs: { k: string; v: ReactNode; swatch?: string; dots?: [number, number] }[] = [
    { k: 'Colour', v: item.colorName, swatch: item.color },
    { k: 'Tone', v: TONES[item.tone].name },
    { k: 'Fabric', v: item.fabric },
    { k: 'Formality', v: CODES[item.f - 1], dots: [item.f, 4] },
    { k: 'Warmth', v: ['Light', 'Mid', 'Warm'][item.w - 1], dots: [item.w, 3] },
    { k: 'Worn', v: item.wears ? `${item.wears} times` : 'Not yet' },
  ]

  return (
    <>
      {back}
      <div className="stage stage--item">
        <div className="glow-bg" />
        <Line sag={22} width={1.2} style={{ top: 8 }} />
        <div className="item-figure">
          <Pins top="-3%" width="3.5%" height="9%" />
          <Garment item={item} className="fill" />
        </div>
      </div>
      <div className="pad top-4 stack-2">
        <Kicker>{item.cat === 'top' ? 'Top' : 'Bottom'}</Kicker>
        <h1 className="title">{item.name}</h1>
        <div className="match-row" style={{ color: m.color }}>
          <span className={`dot7 match-dot--${item.match}`} />
          {m.label}
        </div>
      </div>
      <div className="pad top-6 col">
        {attrs.map((a) => (
          <div key={a.k} className="kv-row" style={{ gridTemplateColumns: '96px minmax(0,1fr)' }}>
            <span className="kv-key">{a.k}</span>
            <span className="row gap-3">
              {a.swatch && <span className="swatch-sm" style={{ background: a.swatch }} />}
              <span>{a.v}</span>
              {a.dots && <Dots n={a.dots[0]} max={a.dots[1]} />}
            </span>
          </div>
        ))}
      </div>
      <div className="pad top-6 stack-3">
        <Kicker>Goes with</Kicker>
        <div className="grid-3">
          {partners.map((p) => {
            const other = item.cat === 'top' ? p.b : p.t
            return (
              <button key={other.id} type="button" className="card partner" onClick={() => go('outfit', { topId: p.t.id, botId: p.b.id })}>
                <Garment item={other} stroke={1.5} shade={false} align="center" className="partner-img" />
                <span className="partner-name">{other.name}</span>
                <span className="meta">Fit {toneFit(p.t, p.b)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="pad top-6 actions-item">
        <button
          type="button"
          className="btn btn-ghost btn-tall btn-quiet"
          onClick={remove}
          disabled={isLast}
          title={isLast ? `You need at least one ${item.cat} on the line` : undefined}
        >
          Remove
        </button>
        <button type="button" className="btn btn-primary btn-tall" onClick={() => go('outfit', item.cat === 'top' ? { topId: item.id } : { botId: item.id })}>
          Put on the line
        </button>
      </div>
    </>
  )
}

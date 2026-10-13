import { PencilSimple } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { BackRow, Dots, Kicker } from '../components/Chrome'
import { Garment, Line, Pins } from '../components/Garment'
import { ToneOverride } from '../components/ToneOverride'
import { CODES, PRESETS } from '../domain/occasions'
import { bestPartners, toneFit } from '../domain/scoring'
import { CATEGORY_LABELS } from '../domain/tags'
import { TONES } from '../domain/tones'
import { useApp } from '../state/context'

export function ItemDetail() {
  const { state, go, hang, byId, rated, removeItem } = useApp()
  const item = byId(state.itemId)
  const backTo = state.from === 'outfit' ? 'outfit' : 'wardrobe'
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(t)
  }, [confirming])
  const editButton = item && (
    <button type="button" className="btn btn-ghost back-edit" onClick={() => go('edit', { itemId: item.id })}>
      <PencilSimple size={14} />
      Edit
    </button>
  )
  const back = <BackRow label={backTo === 'outfit' ? 'Outfit' : 'Wardrobe'} onBack={() => go(backTo)} right={editButton} />

  if (!item) {
    return (
      <>
        {back}
        <p className="pad top-8 muted">This piece is no longer in your wardrobe.</p>
      </>
    )
  }

  const partners = bestPartners(item, rated, PRESETS.today)
  const lastWorn = state.wearLog
    .filter((w) => w.topId === item.id || w.botId === item.id)
    .reduce<string | null>((latest, w) => (!latest || w.date > latest ? w.date : latest), null)
  const lastWornLabel = lastWorn ? new Date(`${lastWorn}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null

  // Removing deletes the photo too, so it takes a second tap to confirm.
  const remove = () => {
    if (!confirming) return setConfirming(true)
    removeItem(item.id)
    go('wardrobe')
  }

  const attrs: { k: string; v: ReactNode; swatch?: string; swatch2?: string; dots?: [number, number] }[] = [
    { k: 'Colour', v: item.pattern ? `${item.colorName} · patterned` : item.colorName, swatch: item.color, swatch2: item.color2 },
    { k: 'Tone', v: TONES[item.tone].name },
    { k: 'Fabric', v: item.fabric },
    { k: 'Formality', v: CODES[item.f - 1], dots: [item.f, 4] },
    { k: 'Warmth', v: ['Light', 'Mid', 'Warm'][item.w - 1], dots: [item.w, 3] },
    { k: 'Worn', v: item.wears ? `${item.wears} ${item.wears === 1 ? 'time' : 'times'}${lastWornLabel ? ` · last ${lastWornLabel}` : ''}` : 'Not yet' },
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
        <Kicker>{CATEGORY_LABELS[item.cat]}</Kicker>
        <h1 className="title">{item.name}</h1>
        <ToneOverride item={item} />
      </div>
      <div className="pad top-6 col">
        {attrs.map((a) => (
          <div key={a.k} className="kv-row" style={{ gridTemplateColumns: '96px minmax(0,1fr)' }}>
            <span className="kv-key">{a.k}</span>
            <span className="row gap-3">
              {a.swatch && <span className="swatch-sm" style={{ background: a.swatch }} />}
              {a.swatch2 && <span className="swatch-sm" style={{ background: a.swatch2 }} />}
              <span>{a.v}</span>
              {a.dots && <Dots n={a.dots[0]} max={a.dots[1]} />}
            </span>
          </div>
        ))}
      </div>
      {partners.length > 0 && (
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
      )}
      <div className="pad top-6 actions-item">
        <button type="button" className={`btn btn-ghost btn-tall ${confirming ? 'btn-danger' : 'btn-quiet'}`} onClick={remove}>
          {confirming ? 'Tap again to remove' : 'Remove'}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-tall"
          onClick={() => {
            hang(item.id)
            go('outfit')
          }}
        >
          Put on the line
        </button>
      </div>
    </>
  )
}

import { Camera, CoatHanger, Image as ImageIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Garment } from '../components/Garment'
import { matchInfo } from '../components/match'
import { classifyHex, colourName } from '../domain/color'
import { processPhoto } from '../domain/photo'
import { TONES, matchOf } from '../domain/tones'
import type { Category, Item } from '../domain/types'
import { useApp } from '../state/context'

const STEPS = ['Finding the garment', 'Removing the background', 'Reading its colour', 'Placing it in a TCI tone']
const STEP_MS = 750

type Step = 'idle' | 'scan' | 'done'

export function AddPiece() {
  const { go, set, userTone } = useApp()
  const [step, setStep] = useState<Step>('idle')
  const [scanI, setScanI] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [color, setColor] = useState('#ef7a5f')
  const [name, setName] = useState('Crew tee')
  const [cat, setCat] = useState<Category>('top')
  const camRef = useRef<HTMLInputElement>(null)
  const upRef = useRef<HTMLInputElement>(null)

  // Tick through the scan steps, then land on the done state.
  useEffect(() => {
    if (step !== 'scan') return
    const timer = setTimeout(() => (scanI >= STEPS.length - 1 ? setStep('done') : setScanI(scanI + 1)), STEP_MS)
    return () => clearTimeout(timer)
  }, [step, scanI])

  const startScan = (p: string | null, c: string) => {
    setPhoto(p)
    setColor(c)
    setName(p ? 'New piece' : 'Crew tee')
    setCat('top')
    setScanI(0)
    setStep('scan')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { url, color } = await processPhoto(file)
      startScan(url, color)
    } catch {
      startScan(null, '#b8946a')
    }
  }

  const toneI = classifyHex(color)
  const m = matchInfo(matchOf(toneI, userTone), TONES[toneI].name)

  const hang = () => {
    const item: Item = {
      id: `n${Date.now()}`,
      cat,
      name: name.trim() || 'New piece',
      kind: cat === 'top' ? 'tee' : 'jeans',
      color,
      colorName: colourName(color),
      fabric: 'Cotton',
      tone: toneI,
      f: 1,
      w: 1,
      wears: 0,
      ...(photo ? { photo } : {}),
    }
    set((s) => ({ items: [...s.items, item], [cat === 'top' ? 'topId' : 'botId']: item.id }))
    go('outfit')
  }

  return (
    <>
      <header className="pad top-8 col">
        <h1 className="display">Add a piece</h1>
        <span className="sub pretty">Shoot it flat or on a hanger in daylight. We cut it out, tag it and place its colour in a tone.</span>
      </header>
      <div className="pad top-6">
        <div className="viewfinder">
          <span className="corner corner--tl" />
          <span className="corner corner--tr" />
          <span className="corner corner--bl" />
          <span className="corner corner--br" />
          {step !== 'idle' &&
            (photo ? (
              <div className="lighten viewfinder-photo">
                <div role="img" aria-label="Your photo" className="garment-photo garment-photo--center" style={{ backgroundImage: `url("${photo}")` }} />
              </div>
            ) : (
              <Garment
                item={{ kind: cat === 'top' ? 'tee' : 'jeans', color, name }}
                align="center"
                className="viewfinder-demo"
                style={{ opacity: step === 'done' ? 1 : 0.55 }}
              />
            ))}
          {step === 'idle' && (
            <div className="viewfinder-idle">
              <CoatHanger size={40} weight="light" />
              <span>One item per photo works best</span>
            </div>
          )}
          {step === 'scan' && <span className="scan-line" />}
        </div>

        {step === 'idle' && (
          <>
            <div className="actions-2 top-6">
              <button type="button" className="btn btn-primary btn-tall" onClick={() => camRef.current?.click()}>
                <Camera size={18} />
                Take photo
              </button>
              <button type="button" className="btn btn-secondary btn-tall" onClick={() => upRef.current?.click()}>
                <ImageIcon size={18} />
                Upload
              </button>
            </div>
            <button type="button" className="btn btn-ghost btn-block btn-quiet" onClick={() => startScan(null, '#ef7a5f')}>
              Try with a sample photo
            </button>
          </>
        )}

        {step === 'scan' && (
          <ol className="scan-steps top-6" aria-live="polite">
            {STEPS.map((label, i) => (
              <li key={label} style={{ color: i <= scanI ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>
                <span
                  className="scan-dot"
                  style={{ background: i < scanI ? 'var(--color-accent)' : i === scanI ? 'var(--color-accent-300)' : 'var(--color-neutral-700)' }}
                />
                {label}
              </li>
            ))}
          </ol>
        )}

        {step === 'done' && (
          <div className="top-6 stack-4 pop">
            <div className="field stack-2">
              <label htmlFor="new-name" className="kicker">
                Name
              </label>
              <input id="new-name" className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="actions-2 gap-2" role="radiogroup" aria-label="Category">
              {(['top', 'bottom'] as Category[]).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cat === c} className={`btn ${cat === c ? 'btn-primary' : 'btn-ghost'}`} style={{ minHeight: 40 }} onClick={() => setCat(c)}>
                  {c === 'top' ? 'Top' : 'Bottom'}
                </button>
              ))}
            </div>
            <div className="row gap-3 body-13">
              <span className="swatch" style={{ background: color }} />
              <span>{TONES[toneI].name}</span>
              <span style={{ color: m.color }}>· {m.short}</span>
            </div>
            <div className="actions-item">
              <button type="button" className="btn btn-ghost btn-tall" onClick={() => setStep('idle')}>
                Retake
              </button>
              <button type="button" className="btn btn-primary btn-tall" onClick={hang}>
                Hang it on the line
              </button>
            </div>
          </div>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
        <input ref={upRef} type="file" accept="image/*" onChange={onFile} hidden />
      </div>
    </>
  )
}

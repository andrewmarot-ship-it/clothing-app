import { Camera, CoatHanger, Image as ImageIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BackRow } from '../components/Chrome'
import { DetailsForm, type Details } from '../components/DetailsForm'
import { Garment } from '../components/Garment'
import { matchInfo } from '../components/match'
import { useObjectUrl } from '../components/useObjectUrl'
import { classifyHex, colourName } from '../domain/color'
import { PhotoError, analysePhoto, preparePhoto, type AnalysedPhoto, type PreparedPhoto, type Stage, type Warning } from '../domain/photo'
import type { QualityIssue } from '../domain/pixels'
import { KINDS, defaultKind } from '../domain/tags'
import { TONES, matchOf } from '../domain/tones'
import { RateLimitedError, SignInRequiredError } from '../state/processPhoto'
import { SignInForm } from '../components/SignIn'
import type { Category, Item } from '../domain/types'
import { useApp } from '../state/context'

const STEPS = ['Finding the garment', 'Removing the background', 'Reading its colour', 'Placing it in a TCI tone']
/** Keep the steps on screen long enough to read, even when the network is fast. */
const MIN_SCAN_MS = 1400

const ISSUES: Record<QualityIssue, string> = {
  blurry: 'This looks blurry. Hold steady and tap to focus before you shoot.',
  dark: 'This is quite dark. Daylight or a brighter room gives truer colour.',
  bright: 'This is very bright. Step out of direct sun or away from glare.',
}

const WARNINGS: Record<Warning, string> = {
  cut_off: 'Part of it may be out of frame. Retake from a little further back for a cleaner cut-out.',
  no_cutout: 'We couldn’t cut it out this time, so it’s drawn for now. Your photo is saved.',
  no_tags: 'We couldn’t tag it automatically. Check the details below.',
  not_supported: 'Dresses, outerwear and shoes aren’t on the line yet. Pick Top or Bottom to hang it anyway.',
}

type Step = 'idle' | 'check' | 'scan' | 'done'

export function AddPiece() {
  const { state, go, userTone, addItem, updateItem, byId, cloud } = useApp()
  // Photos are processed on paid services, so adding needs an account when sign-in is set up.
  const needsSignIn = cloud.enabled && !cloud.user
  const retaking = byId(state.retakeId)
  const [step, setStep] = useState<Step>('idle')
  const [scanI, setScanI] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null)
  const [result, setResult] = useState<AnalysedPhoto | null>(null)
  const [color, setColor] = useState('#b8946a')
  const [details, setDetails] = useState<Details>({ name: 'New piece', cat: 'top', kind: 'tee', fabric: 'Cotton', f: 1, w: 1 })
  const camRef = useRef<HTMLInputElement>(null)
  const upRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const previewUrl = useObjectUrl(prepared?.upload ?? null)
  const cutoutUrl = useObjectUrl(result?.photo ?? null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const reset = (message: string | null = null) => {
    abortRef.current?.abort()
    setStep('idle')
    setPrepared(null)
    setResult(null)
    setNotice(message)
  }

  const run = async (p: PreparedPhoto) => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setScanI(0)
    setStep('scan')
    const started = Date.now()
    try {
      const r = await analysePhoto(p, (s: Stage) => setScanI(s), ctrl.signal)
      await new Promise((ok) => setTimeout(ok, Math.max(0, MIN_SCAN_MS - (Date.now() - started))))
      if (ctrl.signal.aborted) return
      const t = r.tags
      setResult(r)
      setColor(r.color)
      if (retaking) {
        // A retake keeps what the user already set; only the photo and colour change.
        setDetails({ name: retaking.name, cat: retaking.cat, kind: retaking.kind, fabric: retaking.fabric, f: retaking.f, w: retaking.w })
      } else {
        const cat: Category = t?.category === 'bottom' ? 'bottom' : 'top'
        setDetails({
          name: t?.name ?? 'New piece',
          cat,
          kind: t && KINDS[cat].includes(t.kind) ? t.kind : defaultKind(cat),
          fabric: t?.fabric ?? 'Cotton',
          f: t?.formality ?? 1,
          w: t?.warmth ?? 1,
        })
      }
      setStep('done')
    } catch (e) {
      if (ctrl.signal.aborted) return
      reset(
        e instanceof PhotoError
          ? 'We couldn’t find a garment in that photo. Lay one piece flat on a plain surface and try again.'
          : e instanceof RateLimitedError
            ? 'You’ve added a lot of photos in the last hour. Try again a bit later.'
            : e instanceof SignInRequiredError
              ? 'Your sign-in has expired. Sign in again on Profile, then retake the photo.'
              : 'Something went wrong reading that photo. Try another one.',
      )
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setNotice(null)
    try {
      const p = await preparePhoto(file)
      setPrepared(p)
      if (p.issue) setStep('check')
      else void run(p)
    } catch {
      reset('We couldn’t open that image. Try a JPEG or PNG photo.')
    }
  }

  const toneI = classifyHex(color)
  const m = matchInfo(matchOf(toneI, userTone), TONES[toneI].name)
  const hang = () => {
    const fromPhoto = {
      color,
      colorName: result?.tags?.colourName || colourName(color),
      tone: toneI,
      color2: result?.color2 ?? undefined,
      pattern: result?.pattern || undefined,
    }
    const images = { photo: result?.photo, original: result?.original }
    if (retaking) {
      updateItem(retaking.id, { ...fromPhoto, ...cleanDetails(details) }, images)
      go('item', { itemId: retaking.id, retakeId: null })
      return
    }
    const item: Item = {
      id: `n${Date.now()}`,
      ...cleanDetails(details),
      ...fromPhoto,
      wears: 0,
    }
    addItem(item, images)
    go('outfit')
  }

  const showCutout = step === 'done' && !!cutoutUrl
  // The raw photo only shows while checking and scanning; without a cut-out the result is drawn.
  const showRaw = (step === 'check' || step === 'scan') && !!previewUrl

  return (
    <>
      {retaking && <BackRow label={retaking.name} onBack={() => go('item', { itemId: retaking.id, retakeId: null })} right="New photo" />}
      <header className={`pad col ${retaking ? 'top-4' : 'top-8'}`}>
        <h1 className="display">{retaking ? 'Retake photo' : 'Add a piece'}</h1>
        <span className="sub pretty">Lay it flat on a plain, light surface and shoot from directly above in daylight. We cut it out, tag it and place its colour in a tone.</span>
      </header>
      <div className="pad top-6">
        <div className="viewfinder">
          <span className="corner corner--tl" />
          <span className="corner corner--tr" />
          <span className="corner corner--bl" />
          <span className="corner corner--br" />
          {showCutout && (
            <div className="viewfinder-photo pop">
              <div role="img" aria-label={details.name} className="garment-photo garment-photo--center cutout cutout-shadow" style={{ backgroundImage: `url("${cutoutUrl}")` }} />
            </div>
          )}
          {showRaw && (
            <div className="lighten viewfinder-photo">
              <div role="img" aria-label="Your photo" className="garment-photo garment-photo--center" style={{ backgroundImage: `url("${previewUrl}")` }} />
            </div>
          )}
          {!showCutout && !showRaw && step !== 'idle' && (
            <Garment
              item={{ kind: details.kind, color, name: details.name }}
              align="center"
              className="viewfinder-demo"
              style={{ opacity: step === 'done' ? 1 : 0.55 }}
            />
          )}
          {step === 'idle' && (
            <div className="viewfinder-idle">
              <CoatHanger size={40} weight="light" />
              <span>One item per photo works best</span>
            </div>
          )}
          {step === 'scan' && <span className="scan-line" />}
        </div>

        {notice && step === 'idle' && (
          <p className="notice top-4" role="alert">
            {notice}
          </p>
        )}

        {step === 'idle' && needsSignIn && (
          <div className="top-6">
            <SignInForm intro="Sign in to add pieces. We cut out and tag each photo on our servers, and keep your wardrobe backed up. No password needed." />
          </div>
        )}

        {step === 'idle' && !needsSignIn && (
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
          </>
        )}

        {step === 'check' && prepared?.issue && (
          <div className="top-6 stack-4 pop">
            <p className="notice" role="alert">
              {ISSUES[prepared.issue]}
            </p>
            <div className="actions-item">
              <button type="button" className="btn btn-ghost btn-tall" onClick={() => reset()}>
                Retake
              </button>
              <button type="button" className="btn btn-secondary btn-tall" onClick={() => void run(prepared)}>
                Use it anyway
              </button>
            </div>
          </div>
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
            {result?.warnings.map((w) => (
              <p key={w} className="notice">
                {WARNINGS[w]}
              </p>
            ))}
            <DetailsForm value={details} onChange={setDetails} />
            <div className="row gap-3 body-13">
              <span className="swatch" style={{ background: color }} />
              {result?.color2 && <span className="swatch" style={{ background: result.color2 }} title="Second colour" />}
              <span>{TONES[toneI].name}</span>
              <span style={{ color: m.color }}>· {m.short}</span>
            </div>
            <div className="actions-item">
              <button type="button" className="btn btn-ghost btn-tall" onClick={() => reset()}>
                Retake
              </button>
              <button type="button" className="btn btn-primary btn-tall" onClick={hang}>
                {retaking ? 'Save new photo' : 'Hang it on the line'}
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

const cleanDetails = (d: Details) => ({ ...d, name: d.name.trim() || 'New piece', fabric: d.fabric.trim() || 'Cotton' })

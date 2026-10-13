import { EnvelopeSimple } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useApp } from '../state/context'

type Step = 'idle' | 'sending' | 'sent' | 'error'

/** Passwordless sign-in: we email a link, the link signs you in. */
export function SignInForm({ intro }: { intro?: string }) {
  const { cloud } = useApp()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStep('sending')
    try {
      await cloud.signIn(email.trim())
      setStep('sent')
    } catch {
      setStep('error')
    }
  }

  if (step === 'sent') {
    return (
      <div className="signin-sent pop" role="status">
        <EnvelopeSimple size={22} />
        <span className="col gap-2px">
          <span className="strong">Check your inbox</span>
          <span className="meta">We sent a sign-in link to {email.trim()}. Open it on this device.</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('idle')}>
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form className="stack-3" onSubmit={submit}>
      {intro && <p className="meta-12 pretty" style={{ margin: 0 }}>{intro}</p>}
      <label htmlFor="signin-email" className="kicker">
        Email
      </label>
      <input
        id="signin-email"
        className="input input-lg"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" className="btn btn-primary btn-tall" disabled={step === 'sending'}>
        {step === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {step === 'error' && (
        <p className="notice" role="alert">
          We couldn’t send the link. Check the address and your connection, then try again.
        </p>
      )}
    </form>
  )
}

const STATUS: Record<string, string> = {
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline. Changes will sync when you’re back online',
  error: 'Couldn’t sync. We’ll try again shortly',
}

/** Account card for Profile: sign in, or who you are and how sync is doing. */
export function AccountCard() {
  const { cloud } = useApp()
  const [leaving, setLeaving] = useState<'idle' | 'busy' | 'blocked'>('idle')
  if (!cloud.enabled) return null

  if (!cloud.user) {
    return (
      <section className="pad top-6">
        <div className="card account">
          <span className="card-kicker">Account</span>
          <span className="setup-title">Keep your wardrobe safe</span>
          <SignInForm intro="Sign in to back up your pieces and photos, use them on your other devices, and add new pieces. No password needed." />
        </div>
      </section>
    )
  }

  const signOut = async () => {
    setLeaving('busy')
    try {
      await cloud.signOut()
    } catch {
      setLeaving('blocked')
    }
  }

  return (
    <section className="pad top-6">
      <div className="card account">
        <span className="card-kicker">Account</span>
        <div className="spread">
          <span className="col gap-2px">
            <span className="strong body-13">{cloud.user.email}</span>
            <span className={`meta sync-${cloud.status}`}>{STATUS[cloud.status] ?? ''}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm btn-quiet" onClick={signOut} disabled={leaving === 'busy'}>
            Sign out
          </button>
        </div>
        {leaving === 'blocked' && (
          <p className="notice" role="alert">
            Some changes haven’t synced yet, so we kept you signed in. Check your connection and try again in a moment.
          </p>
        )}
      </div>
    </section>
  )
}

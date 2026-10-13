import { BackRow, Kicker } from '../components/Chrome'
import { QUIZ, quizResult, shortlist, type QuizAnswers } from '../domain/quiz'
import { TONES, matchOf, toneDesc } from '../domain/tones'
import { useApp } from '../state/context'
import { fx } from '../state/feedback'

export function Quiz() {
  const { state, set, go } = useApp()
  const { quizStep: step, quiz: answers } = state
  const asking = step < QUIZ.length
  const q = asking ? QUIZ[step] : null
  const answered = answers.filter((a) => a != null).length
  const short = shortlist(answers)
  const best = quizResult(answers)
  const blocked = asking && answers[step] == null

  const answer = (value: number) => {
    const next = [...answers] as QuizAnswers
    next[step] = value
    fx('tick')
    set({ quiz: next })
  }
  // Opened from the first-run checklist on Outfit, or from Profile.
  const home = state.from === 'outfit' ? 'outfit' : 'profile'
  const back = () => (step > 0 ? set({ quizStep: step - 1 }) : go(home))
  const next = () => {
    if (!asking) go(home, { tone: best })
    else if (!blocked) set({ quizStep: step + 1 })
  }

  return (
    <>
      <BackRow label={home === 'outfit' ? 'Stage' : 'Aura'} onBack={back} right={asking ? `${step + 1} of 3` : 'Result'} />
      <div className="pad top-4 quiz-bars" aria-hidden="true">
        {QUIZ.map((_, i) => (
          <span key={i} className={i < step || (i === step && answers[i] != null) || !asking ? 'is-on' : ''} />
        ))}
      </div>

      {q && (
        <>
          <div className="pad top-8 stack-2">
            <Kicker>{q.dim}</Kicker>
            <h1 className="question">{q.q}</h1>
            <span className="sub pretty">{q.help}</span>
          </div>
          <div className="pad top-6 stack-3" role="radiogroup" aria-label={q.dim}>
            {q.opts.map((o) => {
              const on = answers[step] === o.value
              return (
                <button key={o.label} type="button" role="radio" aria-checked={on} className={`quiz-opt ${on ? 'is-on' : ''}`} onClick={() => answer(o.value)}>
                  <span className="quiz-sw">
                    {o.swatches.map((c, i) => (
                      <span key={i} style={{ background: c }} />
                    ))}
                  </span>
                  <span className="col gap-2px">
                    <span className="quiz-label">{o.label}</span>
                    <span className="meta-12">{o.sub}</span>
                  </span>
                  <span className="quiz-radio" />
                </button>
              )
            })}
          </div>
        </>
      )}

      {!asking && (
        <div className="pad top-8 stack-2 pop">
          <Kicker>Your closest tone</Kicker>
          <h1 className="tone-hero">{TONES[best].name}</h1>
          <span className="sub">{toneDesc(TONES[best])}</span>
          <div className="quiz-pal top-4">
            {TONES[best].palette.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
        </div>
      )}

      <div className="pad top-8 stack-3">
        <Kicker>{asking ? (answered ? 'Narrowing to' : 'All 12 tones') : 'Neighbouring tones'}</Kicker>
        <div className="chips">
          {TONES.map((t, i) => {
            const inS = asking ? short.includes(i) : i === best || matchOf(i, best) === 'near'
            const lit = !answered || inS
            const top = i === best && answered > 0
            return (
              <span
                key={t.name}
                className="tone-pill"
                style={{
                  color: lit ? 'var(--color-text)' : 'var(--color-neutral-700)',
                  boxShadow: `inset 0 0 0 1px ${top ? 'var(--color-accent)' : inS ? 'var(--color-neutral-600)' : 'var(--color-neutral-800)'}`,
                }}
              >
                {t.name}
              </span>
            )
          })}
        </div>
      </div>

      <div className="pad top-8 stack-3">
        <button type="button" className="btn btn-primary btn-block btn-tall" disabled={blocked} onClick={next}>
          {asking ? (step === QUIZ.length - 1 ? 'See my tone' : 'Continue') : `Use ${TONES[best].name}`}
        </button>
        <span className="hint">A starting point. A certified TCI analysis confirms your tone.</span>
      </div>
    </>
  )
}

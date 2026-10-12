import { describe, expect, it } from 'vitest'
import { ProviderError } from './handler.ts'
import { createOccasionHandler } from './occasion.ts'

const post = (body: unknown) => new Request('http://x/api/occasion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) })
const reading = { label: 'Date night', code: 'dressy', date: null, timeOfDay: 'evening', setting: 'Dinner', indoor: true, contrast: 'none', line: 'Polished.', finish: [{ name: 'Block heels', colour: '#5c3a26' }] }

describe('occasion handler', () => {
  it('returns a normalised occasion', async () => {
    let seen = ''
    const res = await createOccasionHandler(async (text, today) => ((seen = `${text}|${today}`), reading))(post({ text: '  dinner with Sam  ', today: '2026-10-12' }))
    expect(res.status).toBe(200)
    expect(seen).toBe('dinner with Sam|2026-10-12')
    expect(((await res.json()) as { occasion: unknown }).occasion).toMatchObject({ label: 'Date night', code: 3, when: 'Today · evening', finish: [['Block heels', '#5c3a26']] })
  })

  it('rejects bad input before calling Claude', async () => {
    let calls = 0
    const h = createOccasionHandler(async () => (calls++, reading))
    for (const body of ['nope', { text: '', today: '2026-10-12' }, { text: 'x'.repeat(201), today: '2026-10-12' }, { text: 'party', today: 'friday' }]) {
      expect((await h(post(body))).status).toBe(400)
    }
    expect(calls).toBe(0)
  })

  it('reports provider failures so the client falls back to keywords', async () => {
    const res = await createOccasionHandler(async () => Promise.reject(new ProviderError('refused')))(post({ text: 'party', today: '2026-10-12' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'refused' })
  })
})

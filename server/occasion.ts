import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { occasionFromAi } from '../src/domain/occasions.ts'
import { ProviderError } from './handler.ts'

/** Cheap and fast is right for a short structured read; set OCCASION_MODEL to try a bigger model. */
const MODEL = process.env.OCCASION_MODEL || process.env.TAG_MODEL || 'claude-haiku-5-5'
const MAX_TEXT = 200

const Reading = z.object({
  label: z.string().describe('Short title for the occasion, 2–5 words, e.g. "Work holiday party".'),
  code: z.enum(['casual', 'smart', 'dressy', 'formal']).describe('Dress code.'),
  date: z.string().nullable().describe('The date as YYYY-MM-DD if the text implies one (resolve "Friday", "tomorrow" from today); otherwise null.'),
  timeOfDay: z.enum(['morning', 'daytime', 'evening', 'late']),
  setting: z.string().describe('Where and what, in under 8 words, e.g. "Office party, then a bar".'),
  indoor: z.boolean().describe('True if most of the time is spent indoors.'),
  contrast: z.enum(['high', 'medium', 'none']).describe('high for nights out and parties that want shine; medium for interviews and formal meetings; none otherwise.'),
  line: z.string().describe('One friendly sentence (under 20 words) on what to aim for, e.g. "Polished without looking like you tried too hard."'),
  finish: z
    .array(z.object({ name: z.string().describe('An accessory or shoe, 1–3 words.'), colour: z.string().describe('Its colour as #rrggbb.') }))
    .describe('Two or three accessories or shoes that would finish the look.'),
})

const SYSTEM = `You help a wardrobe app understand what someone is dressing for.
Read the occasion they typed and describe it. Be practical and specific to the event.
If something isn't stated, pick the most likely option for that kind of event.`

let client: Anthropic | null = null

export type ReadOccasion = (text: string, today: string) => Promise<unknown>

/** Ask Claude for a structured reading of a free-text occasion. */
export const readOccasion: ReadOccasion = async (text, today) => {
  if (!process.env.ANTHROPIC_API_KEY) throw new ProviderError('not_configured', 'ANTHROPIC_API_KEY is not set')
  client ??= new Anthropic()
  const weekday = new Date(`${today}T12:00`).toLocaleDateString('en-GB', { weekday: 'long' })
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(Reading) },
      messages: [{ role: 'user', content: `Today is ${weekday} ${today}.\nOccasion: ${text}` }],
    })
    if (response.stop_reason === 'refusal') throw new ProviderError('refused')
    if (!response.parsed_output) throw new ProviderError('unparsed', `stop_reason ${response.stop_reason}`)
    return response.parsed_output
  } catch (e) {
    if (e instanceof ProviderError) throw e
    if (e instanceof Anthropic.AuthenticationError) throw new ProviderError('bad_key', e.message)
    if (e instanceof Anthropic.RateLimitError) throw new ProviderError('rate_limited', e.message)
    if (e instanceof Anthropic.APIError) throw new ProviderError('failed', `${e.status}: ${e.message}`)
    throw e
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/**
 * POST { text, today: 'YYYY-MM-DD' } → { occasion }. The client keeps its
 * keyword parser as the fallback, so failures are reported, not hidden.
 */
export function createOccasionHandler(read: ReadOccasion) {
  return async function handle(request: Request): Promise<Response> {
    let body: { text?: unknown; today?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return json({ error: 'expected JSON' }, 400)
    }
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const today = typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : ''
    if (!text || text.length > MAX_TEXT) return json({ error: 'text must be 1–200 characters' }, 400)
    if (!today) return json({ error: 'today must be YYYY-MM-DD' }, 400)
    try {
      const occasion = occasionFromAi(await read(text, today), text, today)
      return occasion ? json({ occasion }) : json({ error: 'unreadable' }, 502)
    } catch (e) {
      console.error('occasion reading failed', e)
      return json({ error: e instanceof ProviderError ? e.code : 'failed' }, 502)
    }
  }
}

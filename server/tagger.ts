import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { ProviderError, type Image } from './handler.ts'

/** Cheap and fast is right for tagging; set TAG_MODEL to try a bigger model. */
const MODEL = process.env.TAG_MODEL || 'claude-haiku-5-5'

const Tags = z.object({
  isGarment: z.boolean().describe('True only if the photo shows one clothing item.'),
  category: z.enum(['top', 'bottom', 'dress', 'other']).describe('"dress" for dresses and jumpsuits; "other" for outerwear, shoes, bags, accessories.'),
  kind: z.enum(['shirt', 'tee', 'tank', 'jeans', 'shorts', 'skirt', 'dress', 'jumpsuit', 'other']),
  name: z.string().describe('2–3 word everyday name, e.g. "Striped shirt", "Wide jeans".'),
  fabric: z.string().describe('Most likely fabric in one or two words, e.g. "Cotton", "Denim", "Wool knit".'),
  colourName: z.string().describe('Plain colour name of the main colour, e.g. "Rust", "Navy", "Cream".'),
  formality: z.enum(['casual', 'smart', 'dressy', 'formal']),
  warmth: z.enum(['light', 'mid', 'warm']).describe('How warm it is to wear.'),
  pattern: z.boolean().describe('True for stripes, checks, prints; false for solid colours.'),
})

const SYSTEM = `You tag clothing for a wardrobe app. The user photographs one garment laid flat on a surface.
Look only at the garment, not the surface. Describe what you can see; when unsure, pick the most common option.
Kinds: shirt = any long-sleeved or button-up top, knits and blouses included; tee = short-sleeved top; tank = sleeveless top;
jeans = any full-length trousers (denim, chinos, cords); shorts; skirt;
dress = any dress, whatever the length; jumpsuit = jumpsuits, playsuits and rompers.`

const FORMALITY = { casual: 1, smart: 2, dressy: 3, formal: 4 } as const
const WARMTH = { light: 1, mid: 2, warm: 3 } as const

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp'

let client: Anthropic | null = null

export async function tagGarment(img: Image): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) throw new ProviderError('not_configured', 'ANTHROPIC_API_KEY is not set')
  client ??= new Anthropic()
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(Tags) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: img.type as MediaType, data: Buffer.from(img.bytes).toString('base64') } },
            { type: 'text', text: 'Tag this garment.' },
          ],
        },
      ],
    })
    if (response.stop_reason === 'refusal') throw new ProviderError('refused')
    const t = response.parsed_output
    if (!t) throw new ProviderError('unparsed', `stop_reason ${response.stop_reason}`)
    return { ...t, formality: FORMALITY[t.formality], warmth: WARMTH[t.warmth] }
  } catch (e) {
    if (e instanceof ProviderError) throw e
    if (e instanceof Anthropic.AuthenticationError) throw new ProviderError('bad_key', e.message)
    if (e instanceof Anthropic.RateLimitError) throw new ProviderError('rate_limited', e.message)
    if (e instanceof Anthropic.APIError) throw new ProviderError('failed', `${e.status}: ${e.message}`)
    throw e
  }
}

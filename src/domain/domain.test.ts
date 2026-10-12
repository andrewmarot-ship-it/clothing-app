import { describe as suite, expect, it } from 'vitest'
import { classifyHex, colourName, oklch } from './color'
import { PRESETS, occasionFor, parseOccasion } from './occasions'
import { quizResult, shortlist } from './quiz'
import { bestPartners, contrastLabel, describe, lookTitle, rankLooks, rate, scoreLook, toneFit } from './scoring'
import { FIXTURE_ITEMS } from './fixtures'
import { TONES, matchOf, nearestTone, rankTones, toneDesc, toneIndex } from './tones'

const SOFT_AUTUMN = toneIndex('Soft Autumn')
const rated = rate(FIXTURE_ITEMS, SOFT_AUTUMN)
const byId = (id: string) => rated.find((i) => i.id === id)!

suite('tones', () => {
  it('has twelve tones, three per season', () => {
    expect(TONES).toHaveLength(12)
    for (const s of ['Spring', 'Summer', 'Autumn', 'Winter']) expect(TONES.filter((t) => t.season === s)).toHaveLength(3)
  })

  it('matches by circular distance, wrapping around the wheel', () => {
    expect(matchOf(SOFT_AUTUMN, SOFT_AUTUMN)).toBe('in')
    expect(matchOf(toneIndex('Soft Summer'), SOFT_AUTUMN)).toBe('near')
    expect(matchOf(toneIndex('True Autumn'), SOFT_AUTUMN)).toBe('near')
    expect(matchOf(toneIndex('Dark Autumn'), SOFT_AUTUMN)).toBe('out')
    expect(matchOf(toneIndex('Light Summer'), toneIndex('Light Spring'))).toBe('near')
  })

  it('describes a tone along its three axes', () => {
    expect(toneDesc(TONES[SOFT_AUTUMN])).toBe('Warm-neutral · Medium · Soft')
  })

  it('finds the nearest tone and ignores unanswered dimensions', () => {
    expect(nearestTone(0.5, 0.45, 0.2)).toBe(SOFT_AUTUMN)
    expect(rankTones(null, null, null)).toEqual(TONES.map((_, i) => i))
  })
})

suite('colour', () => {
  it('converts sRGB to OKLCH', () => {
    expect(oklch('#ffffff').L).toBeCloseTo(1, 3)
    expect(oklch('#000000').L).toBeCloseTo(0, 3)
    expect(oklch('#808080').C).toBeLessThan(0.001)
  })

  it('classifies colours into tones', () => {
    expect(TONES[classifyHex('#c9a27e')].season).toBe('Autumn')
    expect(TONES[classifyHex('#0067c6')].name).toMatch(/Winter|Summer/)
  })

  it('names colours roughly', () => {
    expect(colourName('#f4f1e8')).toBe('Ivory')
    expect(colourName('#1f3a8a')).toBe('Navy')
  })
})

suite('occasions', () => {
  it('parses keywords in priority order', () => {
    expect(parseOccasion('')).toBe('today')
    expect(parseOccasion('Work holiday party, Friday evening')).toBe('holiday')
    expect(parseOccasion('Friendsgiving at Sam’s')).toBe('thanksgiving')
    expect(parseOccasion('Drinks with the girls')).toBe('night')
    expect(parseOccasion('Anniversary dinner')).toBe('date')
    expect(parseOccasion('Sunday brunch')).toBe('thanksgiving')
    expect(parseOccasion('Wedding in the vineyard')).toBe('custom')
  })

  it('turns unknown text into a smart custom occasion', () => {
    const occ = occasionFor('custom', 'wedding in the vineyard with all my cousins')
    expect(occ.label).toBe('Wedding in the vineyard with all')
    expect(occ.code).toBe(2)
  })
})

suite('scoring', () => {
  it('weights the top more in tone fit', () => {
    // Linen shirt (in) + midi skirt (near): 100·0.6 + 72·0.4
    expect(toneFit(byId('t1'), byId('b4'))).toBe(89)
    expect(toneFit(byId('b4'), byId('t1'))).toBe(83)
  })

  it('labels contrast from the lightness difference', () => {
    expect(contrastLabel(byId('t1'), byId('b1'))).toBe('High')
    expect(contrastLabel(byId('t1'), byId('b2'))).toBe('Low')
  })

  it('puts cream & slate first for a holiday party in Soft Autumn', () => {
    const [best] = rankLooks(rated, PRESETS.holiday, 3)
    expect(lookTitle(best.t, best.b)).toBe('Cream & slate')
    expect(toneFit(best.t, best.b)).toBe(89)
  })

  it('returns five ranked looks', () => {
    const looks = rankLooks(rated, PRESETS.today, 1)
    expect(looks).toHaveLength(5)
    for (let i = 1; i < looks.length; i++) expect(looks[i - 1].score).toBeGreaterThanOrEqual(looks[i].score)
  })

  it('penalises a dressy event with no dressy piece', () => {
    const casual = scoreLook(byId('t3'), byId('b3'), PRESETS.holiday, 3)
    const dressy = scoreLook(byId('t3'), byId('b4'), PRESETS.holiday, 3)
    expect(dressy).toBeGreaterThan(casual)
  })

  it('picks partners from the other category', () => {
    const partners = bestPartners(byId('t1'), rated, PRESETS.today)
    expect(partners).toHaveLength(3)
    for (const p of partners) expect(p.t.id).toBe('t1')
  })

  it('writes reason copy', () => {
    const [occ, tone, weather] = describe(byId('t1'), byId('b4'), PRESETS.holiday, 3, SOFT_AUTUMN)
    expect(occ.v).toBe('Dressed up enough for a party, relaxed enough for a work crowd. The satin midi skirt does the dressing up.')
    expect(tone.v).toBe('Cream is core Soft Autumn; slate borrows from Soft Summer next door, so it still flatters. Strong light–dark contrast.')
    expect(weather.v).toBe('4° out, warm inside. Bring a warm layer.')
  })

  it('does not repeat the fabric when the name contains it', () => {
    const linen = { ...byId('t1'), f: 3 }
    expect(describe(linen, byId('b3'), PRESETS.date, 3, SOFT_AUTUMN)[0].v).toContain('The linen shirt does the dressing up.')
  })
})

suite('your call on tone', () => {
  it('lets the user overrule the classifier', () => {
    const fuchsia = FIXTURE_ITEMS.find((i) => i.id === 't5')!
    expect(rate([fuchsia], SOFT_AUTUMN)[0]).toMatchObject({ match: 'out', matchSource: 'tone' })
    expect(rate([{ ...fuchsia, matchOverride: 'in' }], SOFT_AUTUMN)[0]).toMatchObject({ match: 'in', matchSource: 'you' })
  })

  it('counts pieces close to one of your colours as in tone', () => {
    const fuchsia = FIXTURE_ITEMS.find((i) => i.id === 't5')!
    expect(rate([fuchsia], SOFT_AUTUMN, ['#c51a5e'])[0]).toMatchObject({ match: 'in', matchSource: 'palette' })
    expect(rate([fuchsia], SOFT_AUTUMN, ['#2f6b3a'])[0].matchSource).toBe('tone')
  })

  it('puts your own call ahead of your colours', () => {
    const fuchsia = { ...FIXTURE_ITEMS.find((i) => i.id === 't5')!, matchOverride: 'out' as const }
    expect(rate([fuchsia], SOFT_AUTUMN, ['#c2185b'])[0]).toMatchObject({ match: 'out', matchSource: 'you' })
  })

  it('explains a near piece by your call rather than the neighbouring tone', () => {
    const t = { ...byId('t1') }
    const b = rate([{ ...FIXTURE_ITEMS.find((i) => i.id === 'b1')!, matchOverride: 'near' }], SOFT_AUTUMN)[0]
    expect(describe(t, b, PRESETS.today, 1, SOFT_AUTUMN)[1].v).toContain('you rate indigo close enough to work')
  })
})

suite('quiz', () => {
  it('narrows the shortlist as answers come in', () => {
    expect(shortlist([null, null, null])).toEqual([])
    expect(shortlist([0.5, null, null])).toHaveLength(4)
    expect(shortlist([0.5, 0.5, null])).toHaveLength(3)
    expect(shortlist([0.5, 0.5, 0.15])).toHaveLength(3)
  })

  it('lands warm, mid, muted on Soft Autumn', () => {
    expect(TONES[quizResult([0.5, 0.5, 0.15])].name).toBe('Soft Autumn')
  })
})

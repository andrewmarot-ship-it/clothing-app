import { describe as suite, expect, it } from 'vitest'
import { classifyHex, colourName, oklch } from './color'
import { PRESETS, formatWhen, occasionFor, occasionFromAi, parseOccasion, withWeather } from './occasions'
import { quizResult, shortlist } from './quiz'
import { migrateDress } from './tags'
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

suite('occasions from Claude', () => {
  const TODAY = '2026-10-12'
  const good = { label: 'Work holiday party', code: 'dressy', date: '2026-10-16', timeOfDay: 'evening', setting: 'Office party, then drinks', indoor: true, contrast: 'none', line: 'Festive but still work-appropriate.', finish: [{ name: 'Gold hoops', colour: '#c9a24a' }] }

  it('normalises a well-formed answer', () => {
    expect(occasionFromAi(good, 'work holiday party friday', TODAY)).toMatchObject({ label: 'Work holiday party', code: 3, date: '2026-10-16', time: 'evening', indoor: true, when: 'Fri 16 Oct · evening', contrast: undefined, finish: [['Gold hoops', '#c9a24a']] })
  })

  it('falls back safely on bad or missing values', () => {
    const o = occasionFromAi({ code: 9, date: 'friday', timeOfDay: 'noonish', finish: [{ name: 'x', colour: 'red' }, 'junk'] }, 'beach day', TODAY)!
    expect(o).toMatchObject({ label: 'Beach day', code: 4, date: null, time: 'daytime', when: 'Today · daytime', finish: PRESETS.today.finish })
    expect(occasionFromAi(null, 'x', TODAY)).toBeNull()
  })

  it('caps accessories at three and trims long text', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ name: `Thing ${i}`, colour: '#123456' }))
    const o = occasionFromAi({ ...good, finish: many, line: 'x'.repeat(500) }, '', TODAY)!
    expect(o.finish).toHaveLength(3)
    expect(o.line.length).toBeLessThanOrEqual(140)
  })

  it('leaves an already-normalised occasion unchanged (server then client)', () => {
    const once = occasionFromAi(good, 'party', TODAY)!
    expect(occasionFromAi(once, 'party', TODAY)).toEqual(once)
  })

  it('says today and tomorrow in words', () => {
    expect(formatWhen(null, 'morning', TODAY)).toBe('Today · morning')
    expect(formatWhen('2026-10-13', 'late', TODAY)).toBe('Tomorrow · late evening')
  })

  it('takes weather and warmth from the forecast for the right day', () => {
    const days = [{ date: '2026-10-16', tMax: 5, tMin: 0, code: 71, rain: 80 }]
    const party = occasionFromAi(good, '', TODAY)!
    expect(withWeather(party, days, TODAY)).toMatchObject({ weather: '2° out, snow', warmth: 2.5 })
    expect(withWeather(PRESETS.garden, days, TODAY).weather).toBe('')
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
    expect(weather.v).toBe('Bring a warm layer.')
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

suite('dresses', () => {
  const dress = (extra = {}) => rate([{ ...FIXTURE_ITEMS[0], id: 'd1', cat: 'dress' as const, kind: 'dress' as const, name: 'Floral sundress', colorName: 'Cream', fabric: 'Cotton', f: 3, ...extra }], SOFT_AUTUMN)[0]

  it('ranks a dress on its own alongside top and bottom pairs', () => {
    const looks = rankLooks([...rated, dress()], PRESETS.holiday, 3, Infinity)
    const d = looks.find((l) => l.t.id === 'd1')!
    expect(d.b).toBeNull()
    expect(looks).toHaveLength(7 * 6 + 1)
    expect(lookTitle(d.t, d.b)).toBe('Floral sundress')
  })

  it('needs only a dress to make a look', () => {
    expect(rankLooks([dress()], PRESETS.today, 1)).toHaveLength(1)
    expect(rankLooks([byId('t1')], PRESETS.today, 1)).toHaveLength(0)
  })

  it('scores tone fit on the dress alone', () => {
    expect(toneFit(dress(), null)).toBe(100)
  })

  it('never pairs a dress with anything', () => {
    expect(bestPartners(dress(), [...rated, dress()], PRESETS.today)).toEqual([])
    expect(bestPartners(byId('t1'), [...rated, dress()], PRESETS.today).every((p) => p.b.cat === 'bottom')).toBe(true)
  })

  it('writes reason copy for one piece', () => {
    const [occ, tone, weather] = describe(dress(), null, PRESETS.holiday, 3, SOFT_AUTUMN)
    expect(occ.v).toContain('The cotton floral sundress does the dressing up.')
    expect(tone.v).toBe('Cream sits in your Soft Autumn palette, head to toe.')
    // A light dress for an evening party.
    expect(weather.v).toBe('Bring a warm layer.')
  })

  it('moves dresses that were filed as tops, and nothing else', () => {
    const top = FIXTURE_ITEMS[0]
    expect(migrateDress({ ...top, name: 'Floral sundress' }, 5)).toMatchObject({ cat: 'dress', kind: 'dress', updatedAt: 5 })
    expect(migrateDress({ ...top, name: 'Denim jumpsuit' }, 5)).toMatchObject({ cat: 'dress', kind: 'jumpsuit' })
    const shirt = { ...top, name: 'Dress shirt' }
    expect(migrateDress(shirt, 5)).toBe(shirt)
    const trousers = { ...FIXTURE_ITEMS[8], name: 'Dress trousers' }
    expect(migrateDress(trousers, 5)).toBe(trousers)
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

import { describe, expect, it } from 'vitest'
import { glowFill, outfitColour, parseGlow, washFill } from './theme'

describe('glow', () => {
  it('defaults to the tone glow', () => {
    expect(parseGlow(null)).toBe('tone')
    expect(parseGlow('junk')).toBe('tone')
    expect(parseGlow('off')).toBe('off')
  })

  it('tints with the outfit, the top leading', () => {
    expect(outfitColour('#c2185b', '#3e5180')).toBe('color-mix(in oklch, #c2185b 55%, #3e5180)')
    expect(outfitColour('#c2185b', null)).toBe('#c2185b')
    expect(glowFill('tone', '#c2185b', 60)).toBe('radial-gradient(closest-side, color-mix(in oklch, #c2185b 60%, transparent), transparent)')
  })

  it('uses the accent, or nothing, when asked', () => {
    expect(glowFill('accent', '#c2185b', 60)).toContain('var(--color-accent-800)')
    expect(glowFill('off', '#c2185b', 60)).toBe('none')
    expect(washFill('accent', '#c2185b')).toBe('none')
    expect(washFill('tone', '#c2185b')).toContain('32%')
  })
})

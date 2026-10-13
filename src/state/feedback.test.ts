import { describe, expect, it } from 'vitest'
import { DEFAULT_FEEDBACK, parseFeedback } from './feedback'

describe('feedback settings', () => {
  it('starts with haptics on and sound off', () => {
    expect(DEFAULT_FEEDBACK).toEqual({ sound: false, haptics: true })
    expect(parseFeedback(null)).toEqual(DEFAULT_FEEDBACK)
  })

  it('keeps saved choices and fills in anything missing', () => {
    expect(parseFeedback('{"sound":true,"haptics":false}')).toEqual({ sound: true, haptics: false })
    expect(parseFeedback('{"sound":true}')).toEqual({ sound: true, haptics: true })
  })

  it('falls back to the defaults on junk', () => {
    expect(parseFeedback('not json')).toEqual(DEFAULT_FEEDBACK)
    expect(parseFeedback('{"sound":"yes","haptics":1}')).toEqual(DEFAULT_FEEDBACK)
  })
})

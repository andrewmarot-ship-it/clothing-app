import { describe, expect, it } from 'vitest'
import { currentLine, forecastFor, tempBars, timeOfDay, warmthFor, warmthNote, weatherLine, weatherWords, type DayForecast } from './weather'

const day = (tMax: number, tMin: number, code = 3, rain = 0): DayForecast => ({ date: '2026-10-17', tMax, tMin, code, rain })

describe('weather', () => {
  it('names WMO codes in plain words', () => {
    expect([0, 3, 45, 53, 61, 63, 65, 71, 81, 95].map(weatherWords)).toEqual(['clear', 'overcast', 'foggy', 'drizzle', 'light rain', 'rain', 'heavy rain', 'snow', 'showers', 'thunderstorms'])
  })

  it('maps outdoor temperatures onto the warmth scale', () => {
    expect(warmthFor(day(26, 18), 'daytime', false)).toBe(1)
    expect(warmthFor(day(16, 10), 'daytime', false)).toBe(2)
    expect(warmthFor(day(4, -2), 'daytime', false)).toBe(3)
  })

  it('keeps indoor events near the middle', () => {
    expect(warmthFor(day(4, -2), 'evening', true)).toBe(2.5)
    expect(warmthFor(day(28, 20), 'evening', true)).toBe(1.5)
  })

  it('uses the cooler end of the day for evenings', () => {
    expect(warmthFor(day(18, 6), 'evening', false)).toBeGreaterThan(warmthFor(day(18, 6), 'daytime', false))
  })

  it('writes the weather line for indoor and outdoor plans', () => {
    expect(weatherLine(day(6, 2, 61), 'evening', true)).toBe('4° out, light rain')
    expect(weatherLine(day(17, 11, 3, 60), 'daytime', false)).toBe('15° overcast, rain likely')
    expect(currentLine({ temp: 16.6, code: 2 })).toBe('17° partly cloudy')
  })

  it('finds the forecast for a date, or nothing past the horizon', () => {
    expect(forecastFor([day(1, 0)], '2026-10-17')).not.toBeNull()
    expect(forecastFor([day(1, 0)], '2026-11-30')).toBeNull()
  })
})

describe('outfit weather card', () => {
  it('charts every third hour, scaled between 4 and 18px', () => {
    const hours = [10, 11, 12, 14, 15, 16, 18, 18, 17, 16, 15, 14, 12, 11, 10, 9, 9, 8]
    expect(tempBars(hours)).toEqual([6, 12, 18, 15, 9, 4])
    expect(tempBars([5, 5, 5, 5])).toEqual([11, 11])
    expect(tempBars([])).toEqual([])
  })

  it('says whether the outfit is warm enough', () => {
    expect(warmthNote(1, 2)).toBe('bring a layer')
    expect(warmthNote(2, 2)).toBe('right weight')
    expect(warmthNote(3, 2)).toBe('warm enough')
  })

  it('names the part of the day', () => {
    expect([7, 13, 19, 23].map(timeOfDay)).toEqual(['morning', 'daytime', 'evening', 'late'])
  })
})

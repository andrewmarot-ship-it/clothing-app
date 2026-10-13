/**
 * The 3D ring clotheslines on the Stage. Each ring keeps an unbounded spin
 * value (in item steps) so it always turns the shorter way, and can add
 * whole extra turns for a Cast or a shuffle.
 */

/** The new spin value that brings `target` to the front, turning the shorter way, plus `extraTurns` full turns. */
export function nextSpin(spin: number, target: number, n: number, extraTurns = 0): number {
  if (n <= 0) return spin
  const m = ((spin % n) + n) % n
  let d = target - m
  if (d > n / 2) d -= n
  if (d <= -n / 2) d += n
  return spin + d + extraTurns * n
}

/** Angle of item i from the front, in degrees, wrapped to −180…180. */
export function relAngle(i: number, spin: number, n: number): number {
  return ((((i - spin) * 360) / n) % 360 + 540) % 360 - 180
}

/** Items fade towards the back of the ring: cos³ on the front half, almost gone behind. */
export function ringOpacity(i: number, spin: number, n: number): number {
  const c = Math.cos((relAngle(i, spin, n) * Math.PI) / 180)
  return c > 0 ? Math.round((0.12 + 0.88 * c * c * c) * 100) / 100 : 0.05
}

export const isFront = (i: number, spin: number, n: number) => Math.abs(relAngle(i, spin, n)) < 1

/** When to tick during a spin of `ms`: twelve ticks that slow down as the ring settles. */
export function spinTicks(ms: number): number[] {
  return Array.from({ length: 12 }, (_, k) => Math.round(ms * (1 - Math.pow(1 - (k + 1) / 13, 2.2))))
}

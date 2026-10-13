import type { Kind } from './types.ts'

/** Placeholder garment silhouettes (100×100 viewBox), drawn until a real cut-out exists. */
export const SILHOUETTES: Record<Kind, string> = {
  shirt: 'M32 6 L43 3 Q50 10 57 3 L68 6 L84 20 L95 80 L84 84 L72 40 L72 97 L28 97 L28 40 L16 84 L5 80 L16 20 Z',
  tee: 'M30 7 L42 3 Q50 11 58 3 L70 7 L93 24 L83 40 L72 34 L72 97 L28 97 L28 34 L17 40 L7 24 Z',
  tank: 'M34 3 L42 3 Q50 22 58 3 L66 3 L68 28 L75 40 L75 97 L25 97 L25 40 L32 28 Z',
  jeans: 'M27 3 L73 3 L80 97 L56 97 L50 34 L44 97 L20 97 Z',
  shorts: 'M24 3 L76 3 L85 58 L56 62 L50 30 L44 62 L15 58 Z',
  skirt: 'M32 3 L68 3 L86 78 Q50 88 14 78 Z',
}

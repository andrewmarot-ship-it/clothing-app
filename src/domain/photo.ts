const FALLBACK = '#b8946a'
const hex2 = (n: number) => n.toString(16).padStart(2, '0')

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Average colour of the centre of an image, skipping near-white and
 * near-black pixels (background and shadow). Production should cluster the
 * cut-out's opaque pixels instead.
 */
function sampleColor(img: HTMLImageElement): string {
  const c = document.createElement('canvas')
  c.width = c.height = 48
  const x = c.getContext('2d')
  if (!x) return FALLBACK
  x.drawImage(img, 0, 0, 48, 48)
  const d = x.getImageData(14, 14, 20, 20).data
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < d.length; i += 4) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2])
    const mn = Math.min(d[i], d[i + 1], d[i + 2])
    if ((mx > 245 && mn > 235) || mx < 14) continue
    r += d[i]
    g += d[i + 1]
    b += d[i + 2]
    n++
  }
  return n ? `#${hex2(Math.round(r / n))}${hex2(Math.round(g / n))}${hex2(Math.round(b / n))}` : FALLBACK
}

/** Downscale a photo so it fits in local storage. */
function shrink(img: HTMLImageElement, max = 640): string {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * scale)
  c.height = Math.round(img.naturalHeight * scale)
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

export interface ProcessedPhoto {
  url: string
  color: string
}

/** Read a picked photo: a small storable copy plus its dominant colour. */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const src = URL.createObjectURL(file)
  try {
    const img = await loadImage(src)
    return { url: shrink(img), color: sampleColor(img) }
  } finally {
    URL.revokeObjectURL(src)
  }
}

function channel(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relLuminance(r: number, g: number, b: number) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(l1: number, l2: number) {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (a + 0.05) / (b + 0.05)
}

export async function prepareBackground(file: File): Promise<{ dataUrl: string; overlay: number; ratio: number; warn: boolean }> {
  const dataUrl = await resizeImage(file)
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 24
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl, overlay: 0.7, ratio: 4.5, warn: false }
  ctx.drawImage(img, 0, 0, 24, 24)
  const pixels = ctx.getImageData(0, 0, 24, 24).data
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i]
    g += pixels[i + 1]
    b += pixels[i + 2]
    n += 1
  }
  r /= n
  g /= n
  b /= n
  let overlay = 0.62
  let ratio = 1
  for (; overlay <= 0.84; overlay += 0.04) {
    const blended = relLuminance(r * (1 - overlay), g * (1 - overlay), b * (1 - overlay))
    ratio = contrastRatio(1, blended)
    if (ratio >= 4.5) break
  }
  overlay = Math.min(0.84, overlay)
  return { dataUrl, overlay, ratio, warn: ratio < 4.5 }
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 900 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => reject(new Error('image'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

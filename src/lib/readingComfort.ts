import type { LineHeightLevel, LetterSpacingLevel, Preferences } from './types'

const LETTER: Record<LetterSpacingLevel, { letter: string; word: string }> = {
  normal: { letter: '0em', word: '0em' },
  wider: { letter: '0.05em', word: '0.1em' },
  widest: { letter: '0.12em', word: '0.15em' },
}

const LINE: Record<LineHeightLevel, string> = {
  normal: '1.4',
  roomy: '1.7',
  extraRoomy: '2',
}

export function normalizeLetterSpacing(value: unknown): LetterSpacingLevel {
  return value === 'wider' || value === 'widest' ? value : 'normal'
}

export function normalizeLineHeight(value: unknown): LineHeightLevel {
  return value === 'roomy' || value === 'extraRoomy' ? value : 'normal'
}

export function readingComfortVars(prefs: Pick<Preferences, 'letterSpacing' | 'lineHeight'>) {
  const spacing = LETTER[normalizeLetterSpacing(prefs.letterSpacing)]
  const line = LINE[normalizeLineHeight(prefs.lineHeight)]
  return {
    '--reading-letter-spacing': spacing.letter,
    '--reading-word-spacing': spacing.word,
    '--reading-line-height': line,
  } as const
}

export function rulerBandHeightPx(textSizePx: number, lineHeight: LineHeightLevel): number {
  const lh = Number(LINE[normalizeLineHeight(lineHeight)])
  return Math.round(textSizePx * lh * 1.75)
}

/** Visible height vs layout height when #customer-root is CSS-scaled (e.g. phone frame). */
export function rulerRootScale(rootClientHeight: number, rootOffsetHeight: number): number {
  return rootClientHeight / rootOffsetHeight || 1
}

/** Pointer clientY → ruler centre Y in #customer-root local coordinates (pre-clamp). */
export function rulerLocalYFromClient(clientY: number, rootTop: number, scale: number): number {
  return (clientY - rootTop) / scale
}

export function clampRulerCenterY(localY: number, bandH: number, rootClientHeight: number): number {
  const half = bandH / 2
  const maxY = Math.max(half, rootClientHeight - half)
  return Math.min(Math.max(localY, half), maxY)
}

export function rulerBandTop(centerY: number, bandH: number): number {
  return Math.max(0, centerY - bandH / 2)
}

export function pointerInsideRoot(
  clientX: number,
  clientY: number,
  rootLeft: number,
  rootTop: number,
  rootWidth: number,
  rootHeight: number,
): boolean {
  return (
    clientX >= rootLeft &&
    clientX <= rootLeft + rootWidth &&
    clientY >= rootTop &&
    clientY <= rootTop + rootHeight
  )
}

const TEXT_SIZE_MIN = 16
const TEXT_SIZE_MAX = 21

export function clampTextSize(value: unknown): number {
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Number(value) || TEXT_SIZE_MIN))
}

/** Heading size grows more slowly than body text (set on #customer-root). */
export function textDisplayVars(textSize: number) {
  const body = clampTextSize(textSize)
  const h1 = (20 + (body - TEXT_SIZE_MIN) * 0.35) / body
  const h2 = (18 + (body - TEXT_SIZE_MIN) * 0.3) / body
  const h3 = (17 + (body - TEXT_SIZE_MIN) * 0.25) / body
  return {
    '--h1-em': String(h1),
    '--h2-em': String(h2),
    '--h3-em': String(h3),
  } as const
}

export { TEXT_SIZE_MIN, TEXT_SIZE_MAX }
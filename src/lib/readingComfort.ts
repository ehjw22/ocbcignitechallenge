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
  return Math.round(textSizePx * lh * 2)
}
import { contrastRatio, relLuminance } from './contrast'

export function ink(hex: string) {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return '#ffffff'
  return relLuminance(parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)) > 0.45 ? '#111111' : '#ffffff'
}

export function readableAccent(hex: string) {
  let current = hex.startsWith('#') ? hex : `#${hex}`
  for (let i = 0; i < 12; i += 1) {
    const raw = current.replace('#', '')
    if (raw.length !== 6) return '#9F1239'
    const L = relLuminance(parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16))
    if (contrastRatio(1, L) >= 4.5) return current
    const next = [0, 2, 4].map((index) => Math.max(0, Math.round(parseInt(raw.slice(index, index + 2), 16) * 0.86)))
    current = `#${next.map((n) => n.toString(16).padStart(2, '0')).join('')}`
  }
  return '#7A0010'
}

function lum(hex: string) {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 0
  return relLuminance(parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16))
}

function shift(hex: string, lighter: boolean) {
  const raw = hex.replace('#', '')
  const next = [0, 2, 4].map((index) => {
    const n = parseInt(raw.slice(index, index + 2), 16)
    const value = lighter ? Math.min(255, Math.round(n + (255 - n) * 0.28)) : Math.max(0, Math.round(n * 0.86))
    return value.toString(16).padStart(2, '0')
  })
  return `#${next.join('')}`
}

export function linkColor(accent: string, background: string) {
  let current = accent
  const lighter = lum(background) < 0.4
  for (let i = 0; i < 16; i += 1) {
    const ratio = contrastRatio(lum(current), lum(background))
    if (ratio >= 4.5) return current
    current = shift(current, lighter)
  }
  return lighter ? '#ffffff' : '#161616'
}

export function themeVars(prefs: { colourVision: string; scheme: string; accent: string; highContrast: boolean }) {
  const cvAccent: Record<string, string> = {
    protanopia: '#0057B8',
    deuteranopia: '#004E9A',
    tritanopia: '#9F1239',
    monochrome: prefs.scheme === 'dark' ? '#F4F4F5' : '#161616',
  }
  const accent = readableAccent(cvAccent[prefs.colourVision] || prefs.accent)
  const dark = prefs.scheme === 'dark'
  const hc = prefs.highContrast
  const text = hc ? (dark ? '#ffffff' : '#000000') : dark ? '#F2F2F2' : '#2F353D'
  const bg = hc ? (dark ? '#000000' : '#ffffff') : dark ? '#121416' : '#FFFFFF'
  const card = hc ? (dark ? '#0a0a0a' : '#ffffff') : dark ? '#1C1F22' : '#FFFFFF'
  const muted = hc ? (dark ? '#f5f5f5' : '#1a1a1a') : dark ? '#C8CDD2' : '#3E4650'
  const line = hc ? (dark ? '#ffffff' : '#000000') : dark ? '#33383C' : '#E7E7E7'
  const soft = hc ? (dark ? '#1a1a1a' : '#f2f2f2') : dark ? '#25292C' : '#F3ECEB'
  const link = hc ? (dark ? '#ffffff' : '#000000') : dark ? '#9CC0FF' : '#0B3A8C'
  const slate = dark ? '#4A606C' : '#3D525D'
  let danger = dark ? '#ffb4b4' : '#9f1239'
  let ok = dark ? '#86efac' : '#0b7a3b'
  let warn = dark ? '#fde68a' : '#8a5a00'
  if (prefs.colourVision === 'protanopia' || prefs.colourVision === 'deuteranopia') {
    danger = dark ? '#ffcc80' : '#9a3412'
    ok = dark ? '#bfdbfe' : '#004e9a'
    warn = dark ? '#ffcc80' : '#9a3412'
  } else if (prefs.colourVision === 'tritanopia') {
    danger = dark ? '#fecdd3' : '#9f1239'
    ok = dark ? '#e9d5ff' : '#5b21b6'
    warn = dark ? '#fecdd3' : '#9f1239'
  } else if (prefs.colourVision === 'monochrome') {
    danger = text
    ok = text
    warn = text
  }
  const accentText = linkColor(accent, bg)
  return {
    '--accent': accent,
    '--accent-text': accentText,
    '--link': linkColor(link, bg),
    '--slate': slate,
    '--on-accent': ink(accent),
    '--bg': bg,
    '--card': card,
    '--text': text,
    '--muted': muted,
    '--line': line,
    '--soft': soft,
    '--danger': danger,
    '--ok': ok,
    '--success': ok,
    '--warn': warn,
    '--warning': warn,
    '--header': accent,
    '--header-text': ink(accent),
  } as Record<string, string>
}

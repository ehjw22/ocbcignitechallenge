/**
 * Static locale probe: key coverage and copied-English signals (run before Playwright).
 * Usage: node scripts/probe-languages.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')
const allow = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'i18n-allow.json'), 'utf8'))

const LANGS = ['en', 'zh', 'zh-TW', 'ms', 'ta', 'id', 'vi', 'th', 'tl', 'ko', 'ja', 'hi', 'bn']
const CORE = new Set(['en', 'zh', 'zh-TW', 'ms', 'ta'])

function flat(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta') continue
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flat(value, next, out)
    else out[next] = value
  }
  return out
}

const en = flat(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8')))

const rows = []
for (const lang of LANGS) {
  const local = flat(JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')))
  let missing = 0
  let identical = 0
  for (const [key, value] of Object.entries(en)) {
    if (typeof value !== 'string') continue
    const translated = local[key]
    if (!translated?.trim()) missing += 1
    else if (translated === value && /[A-Za-z]{4,}/.test(value) && CORE.has(lang)) identical += 1
  }
  rows.push({ lang, missing, identical, ok: missing === 0 && (!CORE.has(lang) || identical < 5) })
}

console.log('| Lang | Missing | Identical (core) | OK |')
console.log('|------|---------|------------------|-----|')
for (const row of rows) {
  console.log(`| ${row.lang} | ${row.missing} | ${row.identical} | ${row.ok ? '✓' : '✗'} |`)
}
if (!rows.every((r) => r.missing === 0)) process.exit(1)
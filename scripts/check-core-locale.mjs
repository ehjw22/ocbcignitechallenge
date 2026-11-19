import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')
const allow = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'i18n-allow.json'), 'utf8'))

const files = Object.fromEntries(
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => [name.replace('.json', ''), JSON.parse(readFileSync(join(dir, name), 'utf8'))]),
)

function flat(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta') continue
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flat(value, next, out)
    else out[next] = value
  }
  return out
}

function placeholders(value) {
  return [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1])
}

function allowedEnglish(text) {
  const trimmed = String(text).trim()
  if (!trimmed) return true
  if (allow.keys.some((k) => trimmed === k)) return true
  const latinWords = trimmed.match(/\b[A-Za-z][A-Za-z'-]{2,}\b/g) || []
  return latinWords.every((word) => allow.substrings.some((bit) => word.includes(bit) || bit.includes(word)))
}

const en = flat(files.en)
const CORE = ['zh', 'zh-TW', 'ms', 'ta']
const problems = []

for (const lang of CORE) {
  const local = flat(files[lang] || {})
  for (const [key, value] of Object.entries(en)) {
    if (typeof value !== 'string' || !String(value).trim()) continue
    if (key.startsWith('admin.') || key.startsWith('staff.')) continue
    const translated = local[key]
    if (typeof translated !== 'string' || !translated.trim()) {
      problems.push(`${lang} missing ${key}`)
      continue
    }
    const enPh = placeholders(value).sort().join(',')
    const locPh = placeholders(translated).sort().join(',')
    if (enPh !== locPh) problems.push(`${lang} placeholder mismatch ${key}`)
    if (translated === value && /[A-Za-z]{4,}/.test(translated) && !allow.keys.some((k) => key === k || key.endsWith(`.${k}`))) {
      if (!allowedEnglish(translated)) problems.push(`${lang} still English ${key}`)
    }
  }
}

if (problems.length) {
  console.error(problems.slice(0, 40).join('\n'))
  console.error(`${problems.length} core locale problem(s)`)
  process.exit(1)
}
console.log(`Core locales OK: ${CORE.join(', ')}`)
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')
const files = Object.fromEntries(readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => {
  return [name.replace('.json', ''), JSON.parse(readFileSync(join(dir, name), 'utf8'))]
}))

function flat(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flat(value, next, out)
    else out[next] = value
  }
  return out
}

const en = flat(files.en)
const keep = ['PayNow', 'GIRO', 'IBAN', 'SWIFT', 'NRIC', 'UEN', 'OCBC', 'PIN', 'OTP', 'Ollie', 'Arif', 'SP Group', 'Singtel', 'Auntie Mei']
const problems = []
for (const lang of ['zh', 'zh-TW']) {
  const local = flat(files[lang] || {})
  for (const [key, value] of Object.entries(en)) {
    const translated = local[key]
    if (!String(value || '').trim()) continue
    if (typeof translated !== 'string' || !translated.trim()) {
      problems.push(`${lang} missing ${key}`)
      continue
    }
    if (translated === value && /[A-Za-z]{4,}/.test(translated) && !keep.some((word) => translated.includes(word))) {
      problems.push(`${lang} still English ${key}: ${translated}`)
    }
  }
}
if (problems.length) {
  console.error(problems.slice(0, 40).join('\n'))
  console.error(`${problems.length} i18n problem(s)`)
  process.exit(1)
}
console.log('zh and zh-TW cover every English string')

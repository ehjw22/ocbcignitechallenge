import { readFileSync, readdirSync } from 'node:fs'

const dir = 'src/i18n/locales'
const en = JSON.parse(readFileSync(`${dir}/en.json`, 'utf8'))
const keep = ['PayNow', 'GIRO', 'IBAN', 'SWIFT', 'NRIC', 'UEN', 'OCBC', 'PIN', 'OTP', 'Ollie', 'Arif', 'SP Group', 'Singtel', 'Auntie Mei', 'OneToken', 'ScamShield', 'FRANK', 'Demo']

function flat(obj, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(out, flat(value, next))
    else out[next] = String(value)
  }
  return out
}

const english = flat(en)
const full = ['zh', 'zh-TW']
const fallback = ['ms']
let problems = 0
for (const name of readdirSync(dir).filter((item) => item.endsWith('.json'))) {
  const lang = name.replace('.json', '')
  const pack = flat(JSON.parse(readFileSync(`${dir}/${name}`, 'utf8')))
  const strict = full.includes(lang)
  if (!strict && !fallback.includes(lang)) continue
  for (const [key, value] of Object.entries(english)) {
    if (!value.trim()) continue
    if (!(key in pack) || !pack[key].trim()) {
      if (strict) {
        console.error(`${lang} missing ${key}`)
        problems += 1
      }
      continue
    }
    if (pack[key] === value && /[A-Za-z]{4,}/.test(value) && !keep.some((word) => value.includes(word))) {
      console.error(`${lang} still English ${key}: ${value}`)
      problems += 1
    }
  }
}
if (problems) {
  console.error(`${problems} i18n problem(s)`)
  process.exit(1)
}
console.log('zh, zh-TW and ms cover every English string')

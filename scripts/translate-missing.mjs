import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = join(root, 'src/i18n/locales')

function loadDotEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* no .env */
  }
}

loadDotEnv()

const LANG_NAMES = {
  ms: 'Malay (Singapore Bahasa Melayu)',
  ta: 'Tamil (Singapore Tamil, polite register)',
  id: 'Indonesian',
  vi: 'Vietnamese',
  th: 'Thai',
  tl: 'Tagalog (Philippines)',
  ko: 'Korean',
  ja: 'Japanese',
  hi: 'Hindi',
  bn: 'Bengali',
}

function flat(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta') continue
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flat(value, next, out)
    else out[next] = value
  }
  return out
}

function nest(flatMap) {
  const rootObj = {}
  for (const [key, value] of Object.entries(flatMap)) {
    const parts = key.split('.')
    let cur = rootObj
    for (let i = 0; i < parts.length - 1; i += 1) {
      cur[parts[i]] = cur[parts[i]] || {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
  return rootObj
}

function orderedMerge(base, patch) {
  const out = {}
  for (const [key, value] of Object.entries(base)) {
    if (key === '_meta') continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = orderedMerge(value, patch[key] && typeof patch[key] === 'object' ? patch[key] : {})
    } else if (patch[key] !== undefined) {
      out[key] = patch[key]
    } else {
      out[key] = value
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (key === '_meta' || out[key] !== undefined) continue
    out[key] = value
  }
  return out
}

function placeholders(value) {
  const hits = [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1])
  return [...new Set(hits)]
}

function llmClient() {
  const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || ''
  if (!key) throw new Error('No LLM_API_KEY / OPENAI_API_KEY in environment')
  const baseURL = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
  const model = (process.env.LLM_MODEL || 'gemini-flash-lite-latest').trim()
  return { client: new OpenAI({ apiKey: key, baseURL }), model }
}

async function translateBatch(lang, items) {
  const { client, model } = llmClient()
  const glossary = 'Keep these English: PayNow, FRANK, OneToken, GIRO, ScamShield, OCBC, NRIC, UEN, SWIFT, OTP, Ollie.'
  const style =
    lang === 'ms'
      ? 'Use plain words for older users (reading age ~10). Use "pindahan", "penerima", "kod sekali guna (OTP)".'
      : lang === 'ta'
        ? 'Singapore Tamil, polite register, plain words for seniors.'
        : 'Plain words for older banking customers. Reading age ~10.'
  const payload = items.map(({ key, text, ph }) => ({ key, en: text, placeholders: ph }))
  const prompt = [
    `Translate UI strings to ${LANG_NAMES[lang] || lang}.`,
    style,
    glossary,
    'Keep {placeholders} exactly as in English keys.',
    'Return JSON array: [{"key":"...","text":"..."}] only.',
    JSON.stringify(payload),
  ].join('\n')
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 8000,
    temperature: 0.2,
  })
  const raw = res.choices[0]?.message?.content || '[]'
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(json)
}

async function run(lang) {
  const en = JSON.parse(readFileSync(join(localeDir, 'en.json'), 'utf8'))
  const file = join(localeDir, `${lang}.json`)
  const current = JSON.parse(readFileSync(file, 'utf8'))
  const enFlat = flat(en)
  const curFlat = flat(current)
  const todo = []
  for (const [key, value] of Object.entries(enFlat)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const existing = curFlat[key]
    if (!existing || !String(existing).trim() || existing === value) {
      todo.push({ key, text: value, ph: placeholders(value) })
    }
  }
  console.log(`${lang}: ${todo.length} keys to translate`)
  if (!todo.length) return
  const patchFlat = { ...curFlat }
  const batchSize = 40
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize)
    console.log(`  batch ${i / batchSize + 1}/${Math.ceil(todo.length / batchSize)} (${batch.length} keys)`)
    try {
      const rows = await translateBatch(lang, batch)
      for (const row of rows) {
        if (row?.key && typeof row.text === 'string') patchFlat[row.key] = row.text.replace(/\r\n/g, '\n')
      }
    } catch (err) {
      console.error('  batch failed', err.message || err)
    }
  }
  const merged = orderedMerge(current, nest(patchFlat))
  merged._meta = { machine: true, reviewed: [] }
  const text = `${JSON.stringify(merged, null, 2)}\n`.replace(/\r\n/g, '\n')
  writeFileSync(file, text, 'utf8')
  console.log(`wrote ${file}`)
}

const langs = process.argv.slice(2)
if (!langs.length) {
  console.error('Usage: node scripts/translate-missing.mjs ms ta id ...')
  process.exit(1)
}

for (const lang of langs) {
  await run(lang)
}
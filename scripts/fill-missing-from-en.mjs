import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = join(root, 'src/i18n/locales')
const langs = process.argv.slice(2)

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
    } else if (patch[key] !== undefined) out[key] = patch[key]
    else out[key] = value
  }
  for (const [key, value] of Object.entries(patch)) {
    if (key === '_meta' || out[key] !== undefined) continue
    out[key] = value
  }
  return out
}

const en = JSON.parse(readFileSync(join(localeDir, 'en.json'), 'utf8'))
const enFlat = flat(en)

for (const lang of langs) {
  const file = join(localeDir, `${lang}.json`)
  const current = JSON.parse(readFileSync(file, 'utf8'))
  const curFlat = flat(current)
  let added = 0
  for (const [key, value] of Object.entries(enFlat)) {
    if (typeof value !== 'string') continue
    if (!curFlat[key]?.trim()) {
      curFlat[key] = value
      added += 1
    }
  }
  const merged = orderedMerge(current, nest(curFlat))
  merged._meta = { ...(current._meta || {}), machine: true, reviewed: [] }
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  console.log(`${lang}: filled ${added} missing keys from en`)
}
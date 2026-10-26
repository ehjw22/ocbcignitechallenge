import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as OpenCC from 'opencc-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' })

function convert(value) {
  if (typeof value === 'string') return converter(value)
  if (Array.isArray(value)) return value.map(convert)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]))
  }
  return value
}

const source = JSON.parse(readFileSync(join(root, 'src/i18n/locales/zh.json'), 'utf8'))
const traditional = convert(source)
if (traditional.demoBadge === '演示') traditional.demoBadge = '示範'
writeFileSync(join(root, 'src/i18n/locales/zh-TW.json'), `${JSON.stringify(traditional, null, 2)}\n`)
console.log('wrote zh-TW', Object.keys(traditional).length, 'top-level keys')

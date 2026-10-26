import bn from '../src/i18n/locales/bn.json' with { type: 'json' }
import en from '../src/i18n/locales/en.json' with { type: 'json' }
import hi from '../src/i18n/locales/hi.json' with { type: 'json' }
import id from '../src/i18n/locales/id.json' with { type: 'json' }
import ja from '../src/i18n/locales/ja.json' with { type: 'json' }
import ko from '../src/i18n/locales/ko.json' with { type: 'json' }
import ms from '../src/i18n/locales/ms.json' with { type: 'json' }
import ta from '../src/i18n/locales/ta.json' with { type: 'json' }
import th from '../src/i18n/locales/th.json' with { type: 'json' }
import tl from '../src/i18n/locales/tl.json' with { type: 'json' }
import vi from '../src/i18n/locales/vi.json' with { type: 'json' }
import zh from '../src/i18n/locales/zh.json' with { type: 'json' }
import zhTW from '../src/i18n/locales/zh-TW.json' with { type: 'json' }

const PACKS: Record<string, Record<string, unknown>> = {
  bn,
  en,
  hi,
  id,
  ja,
  ko,
  ms,
  ta,
  th,
  tl,
  vi,
  zh,
  'zh-TW': zhTW,
}

function merge(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object') {
      out[key] = merge(out[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

export function localePack(lang: string): Record<string, unknown> {
  const safe = /^[a-z]{2}(-[A-Z]{2})?$/.test(lang) ? lang : 'en'
  if (safe === 'en') return PACKS.en
  return merge(PACKS.en, PACKS[safe] || {})
}

export function readPath(obj: Record<string, unknown>, pathStr: string): string | undefined {
  let cur: unknown = obj
  for (const part of pathStr.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

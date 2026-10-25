type Dict = Record<string, unknown>

const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<string, { default: Dict }>

const locales: Record<string, Dict> = {}
for (const [file, mod] of Object.entries(modules)) {
  const id = file.split('/').pop()?.replace('.json', '') ?? ''
  locales[id] = mod.default
}

function lookup(dict: Dict | undefined, key: string): string | undefined {
  if (!dict) return undefined
  let cur: unknown = dict
  for (const part of key.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Dict)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

const missing = new Set<string>()

export function translate(lang: string, key: string, vars?: Record<string, string | number>) {
  const local = lookup(locales[lang], key)
  const english = lookup(locales.en, key)
  if (import.meta.env.DEV) {
    const token = `${lang}:${key}`
    if (!english && !missing.has(`en:${key}`)) {
      missing.add(`en:${key}`)
      console.warn(`[i18n] missing key "${key}"`)
    } else if (lang !== 'en' && !local && !missing.has(token)) {
      missing.add(token)
      console.warn(`[i18n] missing key "${key}" for ${lang}`)
    }
  }
  const value = local ?? english ?? key
  if (!vars) return value
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

export function hasLocale(lang: string) {
  return Boolean(locales[lang])
}

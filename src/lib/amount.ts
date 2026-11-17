const AMOUNT_TAIL = /\s*(dollars?|sgd|块|元|蚊)\s*$/i
const AMOUNT_HEAD = /^(s\$|sgd|\$)\s*/i

function stripThousands(value: string) {
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) return value.replace(/,/g, '')
  if (/^\d+,\d{1,2}$/.test(value)) return value.replace(',', '.')
  return value.replace(/,/g, '')
}

export function normaliseAmount(raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return ''
    const text = raw.toFixed(2)
    const trimmed = text.replace(/\.?0+$/, '')
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return ''
    return trimmed
  }
  let value = String(raw).trim()
  if (!value || /^nan$/i.test(value)) return ''
  value = value.replace(AMOUNT_HEAD, '').replace(AMOUNT_TAIL, '').trim()
  value = stripThousands(value.replace(/\s/g, ''))
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return ''
  if (Number(value) <= 0) return ''
  return value.includes('.') ? value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : value
}

export function formatLiveAmount(raw: string) {
  const normal = normaliseAmount(raw)
  if (!normal) return ''
  const [whole, frac] = normal.split('.')
  const grouped = Number(whole || '0').toLocaleString('en-SG')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

export function amountNumber(raw: unknown) {
  const normal = normaliseAmount(raw)
  if (!normal) return null
  return Number(normal)
}

/** Pull a transfer amount from free text without grabbing 8-digit phone numbers. */
export function extractAmountFromText(text: string) {
  const marked = [...text.matchAll(/(?:s\$|sgd|\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi)]
  if (marked.length) {
    const normal = normaliseAmount(marked[marked.length - 1][1])
    if (normal) return normal
  }
  const wordAmount = [...text.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:dollars?|sgd|块|元|蚊)/gi)]
  if (wordAmount.length) {
    const normal = normaliseAmount(wordAmount[wordAmount.length - 1][1])
    if (normal) return normal
  }
  const afterVerb = text.match(/(?:send|transfer|pay|汇|轉|转)\s+(?:[^\d]{0,40})?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i)
  if (afterVerb) {
    const normal = normaliseAmount(afterVerb[1])
    if (normal) return normal
  }
  const spaced = [...text.matchAll(/(?:^|[\s,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?:$|[\s,.])/g)]
  for (const match of spaced.reverse()) {
    const digits = match[1].replace(/\D/g, '')
    if (digits.length === 8 && /^[89]/.test(digits)) continue
    const normal = normaliseAmount(match[1])
    if (normal) return normal
  }
  return ''
}
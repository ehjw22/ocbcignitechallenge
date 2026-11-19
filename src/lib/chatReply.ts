const SUGGESTION_LINES = /^(?:建议操作|建議操作|Suggested actions|Tindakan dicadangkan)\s*[:：].*$/gim

function unescapeReply(raw: string) {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function extractReplyField(text: string): string {
  const match = text.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s)
  if (!match) return ''
  return unescapeReply(match[1])
}

/** Pull a partial reply value from truncated streaming JSON (closing quote optional). */
export function extractPartialReplyField(text: string): string {
  const match = text.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)/s)
  if (!match) return ''
  return unescapeReply(match[1])
}

function looksLikeJsonLeak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('{') || trimmed.startsWith('```')) return true
  if (/"action"\s*:/.test(trimmed) && /"reply"\s*:/.test(trimmed)) return true
  if (trimmed.includes('"scamRisk"')) return true
  if (/^\s*\{\s*"reply"\s*:/.test(trimmed)) return true
  if (/^\s*"reply"\s*:/.test(trimmed)) return true
  return false
}

export function visibleReply(raw: string): string {
  let text = raw.replace(/\r/g, '').replace(SUGGESTION_LINES, '').trim()
  if (!text) return ''
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
  }
  if (looksLikeJsonLeak(text)) {
    const parsed = extractReplyField(text)
    if (parsed) text = parsed
    else {
      const partial = extractPartialReplyField(text)
      if (partial) text = partial
      else {
        try {
          const json = JSON.parse(text) as { reply?: string }
          if (typeof json.reply === 'string') text = json.reply
        } catch {
          return ''
        }
      }
    }
  }
  text = text.replace(SUGGESTION_LINES, '').trim()
  if (looksLikeJsonLeak(text) || /^"reply"\s*:/.test(text)) return ''
  return text
}

/** Prefer the best reply text from a finished (possibly truncated) model payload. */
export function finalizeReply(raw: string, fallback = ''): string {
  const shown = visibleReply(raw)
  if (shown) {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{') && !trimmed.endsWith('}') && extractPartialReplyField(trimmed)) {
      return shown.endsWith('…') ? shown : `${shown}…`
    }
    return shown
  }
  const partial = extractPartialReplyField(raw)
  if (partial) return `${partial}…`
  return fallback
}
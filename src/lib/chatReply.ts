const SUGGESTION_LINES = /^(?:建议操作|建議操作|Suggested actions|Tindakan dicadangkan)\s*[:：].*$/gim

function extractReplyField(text: string): string {
  const match = text.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s)
  if (!match) return ''
  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function looksLikeJsonLeak(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('{') || trimmed.startsWith('```')) return true
  if (/"action"\s*:/.test(trimmed) && /"reply"\s*:/.test(trimmed)) return true
  if (trimmed.includes('"scamRisk"')) return true
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
      try {
        const json = JSON.parse(text) as { reply?: string }
        if (typeof json.reply === 'string') text = json.reply
      } catch {
        return ''
      }
    }
  }
  text = text.replace(SUGGESTION_LINES, '').trim()
  if (looksLikeJsonLeak(text) || /^"reply"\s*:/.test(text)) return ''
  return text
}
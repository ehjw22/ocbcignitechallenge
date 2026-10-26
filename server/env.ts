const RETIRED = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
])

function usableModel(value: string | undefined, fallback: string) {
  const model = (value || '').trim()
  if (!model || RETIRED.has(model)) return fallback
  return model
}

export function llmSettings() {
  const requested = (process.env.LLM_MODEL || '').trim()
  const model = usableModel(requested, 'gemini-flash-lite-latest')
  if (requested && requested !== model) console.error('chat model retired', requested, 'using', model)
  return {
    key: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model,
    fallback: usableModel(process.env.LLM_FALLBACK_MODEL, 'gemini-3.5-flash'),
  }
}

export function speechSettings() {
  return {
    azureKey: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || 'southeastasia',
    googleKey: process.env.GOOGLE_TTS_API_KEY || '',
  }
}

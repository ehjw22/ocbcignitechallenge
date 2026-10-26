export function llmSettings() {
  return {
    key: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: process.env.LLM_MODEL === 'gemini-2.5-flash' || !process.env.LLM_MODEL ? 'gemini-3.8-flash' : process.env.LLM_MODEL,
  }
}

export function speechSettings() {
  return {
    azureKey: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || 'southeastasia',
    googleKey: process.env.GOOGLE_TTS_API_KEY || '',
  }
}

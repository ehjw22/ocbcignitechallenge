import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    let language = 'en'
    try {
      language = JSON.parse(localStorage.getItem('ocbc-adaptive-prefs') || '{}').language || 'en'
    } catch {
      language = 'en'
    }
    const copy = language === 'zh' || language === 'zh-TW'
      ? { title: '职员控制台出了问题', body: '请返回应用后再试。', back: '返回应用' }
      : language === 'ta'
        ? { title: 'ஊழியர் பலகையில் சிக்கல்', body: 'பயன்பாட்டுக்குத் திரும்பி மீண்டும் முயலவும்.', back: 'பயன்பாட்டுக்குத் திரும்பு' }
        : { title: 'The staff console hit a problem', body: 'Go back to the app and try again.', back: 'Back to app' }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f7f9] p-6 text-zinc-900">
        <div className="max-w-md space-y-3 rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p>{copy.body}</p>
          <a href="/" className="inline-flex min-h-11 items-center font-semibold text-[#E30613] underline">{copy.back}</a>
        </div>
      </div>
    )
  }
}

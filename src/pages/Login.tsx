import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'

export function Login() {
  const app = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const t = (key: string) => translate(app.prefs.language, key)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError(t('gate.missingName'))
      return
    }
    app.login(username)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center gap-2 px-2 py-2">
        <button type="button" className="flex h-12 w-12 items-center justify-center" aria-label={t('back')} onClick={() => navigate('/welcome')}>
          <ChevronLeft aria-hidden />
        </button>
        <h1 className="text-xl font-semibold">{t('gate.loginTitle')}</h1>
      </header>
      <form className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6" onSubmit={submit}>
        <p className="text-sm text-[var(--muted)]">{t('gate.demoHint')}</p>
        {sessionStorage.getItem('ocbc-after-login') && <p>{t('gate.loginContinue')}</p>}
        <label className="block font-semibold" htmlFor="username">
          {t('gate.username')}
          <input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3" />
        </label>
        <label className="block font-semibold" htmlFor="password">
          {t('gate.password')}
          <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3" />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="min-h-12 w-full rounded-full bg-[#1C2834] px-4 py-3 font-semibold text-white">
          {t('gate.login')}
        </button>
      </form>
    </div>
  )
}

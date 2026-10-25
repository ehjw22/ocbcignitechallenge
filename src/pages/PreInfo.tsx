import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'

const TOPICS: Record<string, string> = {
  fx: 'gate.fx',
  scan: 'gate.scanPay',
  paynow: 'gate.paynow',
  wealth: 'gate.wealth',
  rewards: 'gate.rewards',
  alerts: 'gate.alerts',
}

export function PreInfo() {
  const { topic = '' } = useParams()
  const navigate = useNavigate()
  const { prefs } = useApp()
  const t = (key: string) => translate(prefs.language, key)
  const title = t(TOPICS[topic] || 'gate.more')

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center gap-2 px-2 py-2">
        <button type="button" className="flex h-12 w-12 items-center justify-center" aria-label={t('back')} onClick={() => navigate('/welcome')}>
          <ChevronLeft aria-hidden />
        </button>
        <h1 className="min-w-0 text-xl font-semibold leading-snug">{title}</h1>
      </header>
      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        <p>{t('gate.preBody')}</p>
        <button type="button" className="min-h-12 w-full rounded-full bg-[#1C2834] px-4 py-3 font-semibold text-white" onClick={() => navigate('/login')}>
          {t('gate.loginTitle')}
        </button>
      </main>
    </div>
  )
}

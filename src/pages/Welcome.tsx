import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Bell, Gift, LayoutGrid, LineChart, ScanLine, Send, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { loadLastUser, saveAfterLogin } from '@/lib/storage'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'

const ACTIONS = [
  { id: 'fx', icon: ArrowLeftRight, label: 'gate.fx', to: '/flow/overseas' },
  { id: 'scan', icon: ScanLine, label: 'gate.scanPay', to: '/flow/scan' },
  { id: 'paynow', icon: Send, label: 'gate.paynow', to: '/flow/paynow' },
  { id: 'wealth', icon: LineChart, label: 'gate.wealth', to: '/insights' },
  { id: 'rewards', icon: Gift, label: 'gate.rewards', to: '/info/rewards' },
  { id: 'more', icon: LayoutGrid, label: 'gate.more', to: '' },
] as const

export function Welcome() {
  const app = useApp()
  const navigate = useNavigate()
  const [more, setMore] = useState(false)
  const last = loadLastUser()
  const t = (key: string) => translate(app.prefs.language, key)
  const askLogin = (path: string) => {
    saveAfterLogin(path)
    navigate('/login')
  }
  const open = (id: string, path: string) => {
    if (id === 'more') {
      setMore(true)
      return
    }
    askLogin(path)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-white text-[#1a1a1a]">
      <section className="relative h-[58%] min-h-[220px] shrink-0 overflow-hidden">
        <img src="/welcome-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 12%' }} />
        <svg className="pointer-events-none absolute bottom-0 left-0 top-0 h-full w-[38%]" viewBox="0 0 140 640" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0H46C92 80 108 170 74 270C44 360 78 470 108 640H0Z" fill="#E30613" />
        </svg>
        <div className="relative flex items-start justify-between px-3 pt-3">
          <button type="button" className="flex h-12 w-12 items-center justify-center text-white" aria-label={t('gate.scan')} onClick={() => askLogin('/flow/scan')}>
            <ScanLine aria-hidden size={26} strokeWidth={1.7} />
          </button>
          <button type="button" className="relative flex h-12 w-12 items-center justify-center text-[#1a1a1a]" aria-label={t('gate.alerts')} onClick={() => askLogin('/notifications')}>
            <Bell aria-hidden size={26} strokeWidth={1.7} />
            <span aria-hidden className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#E30613]" />
          </button>
        </div>
        <div className="absolute right-3 top-12 max-w-[64%] rounded-2xl bg-white/90 px-2.5 py-1.5 text-right">
          <h1 className="text-[1.35rem] font-extrabold leading-tight text-[#E30613]">{t('gate.headline')}</h1>
          <p className="mt-0.5 text-[0.9rem] font-semibold leading-snug text-[#1a1a1a]">{t('gate.brand')}</p>
        </div>
      </section>
      <section className="bg-white">
        <div className="grid grid-cols-3 content-start gap-x-1 gap-y-3 px-2 pt-4">
          {last
            ? last.prefs.shortcuts.map((id) => {
                const Icon = SHORTCUT_ICONS[id] ?? ArrowLeftRight
                return (
                  <button key={id} type="button" className="flex min-h-12 flex-col items-center px-1 text-[#1a1a1a]" onClick={() => askLogin(SHORTCUT_ROUTES[id] || '/pay')}>
                    <span className="flex items-center justify-center rounded-full bg-[#F1F2F4]" style={{ width: 52, height: 52 }}>
                      <Icon aria-hidden size={22} strokeWidth={1.6} />
                    </span>
                    <span className="mt-1.5 text-center text-[0.75rem] font-medium leading-tight">{t(`shortcuts.${id}`)}</span>
                  </button>
                )
              })
            : ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button key={action.id} type="button" className="flex min-h-12 flex-col items-center px-1 text-[#1a1a1a]" onClick={() => open(action.id, action.to)}>
                    <span className="flex items-center justify-center rounded-full bg-[#F1F2F4]" style={{ width: 52, height: 52 }}>
                      <Icon aria-hidden size={22} strokeWidth={1.6} />
                    </span>
                    <span className="mt-1.5 text-center text-[0.75rem] font-medium leading-tight">{t(action.label)}</span>
                  </button>
                )
              })}
        </div>
        {last && (
          <button type="button" className="mt-2 min-h-11 w-full px-2 text-center text-[0.8rem] font-semibold leading-snug text-[#1C2834] underline" onClick={app.switchUser}>
            {t('gate.switchUser')}
          </button>
        )}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <button type="button" className="min-h-12 w-full rounded-full bg-[#1C2834] px-4 py-3 text-[0.95rem] font-semibold leading-snug text-white" onClick={() => navigate('/login')}>
            {t('gate.login')}
          </button>
        </div>
      </section>
      {more && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={() => setMore(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="welcome-more" className="max-h-[70%] overflow-y-auto rounded-t-3xl bg-white p-4 text-[#1a1a1a]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="welcome-more" className="text-lg font-semibold">{t('gate.more')}</h2>
              <button type="button" className="flex h-12 w-12 items-center justify-center" aria-label={t('close')} onClick={() => setMore(false)}>
                <X aria-hidden />
              </button>
            </div>
            <p className="mb-2 text-sm font-semibold">{t('gate.personas')}</p>
            <button type="button" className="mb-2 min-h-12 w-full rounded-2xl border border-[#E6E7EA] px-3 py-2 text-left" onClick={() => app.applyPersona('mei')}>
              <span className="block font-semibold">{t('settings.mei')}</span>
              <span className="text-sm leading-snug">{t('settings.meiBody')}</span>
            </button>
            <button type="button" className="min-h-12 w-full rounded-2xl border border-[#E6E7EA] px-3 py-2 text-left" onClick={() => app.applyPersona('arif')}>
              <span className="block font-semibold">{t('settings.arif')}</span>
              <span className="text-sm leading-snug">{t('settings.arifBody')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

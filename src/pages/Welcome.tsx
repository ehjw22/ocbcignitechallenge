import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Bell, Compass, LayoutGrid, LineChart, ScanLine, Send, Smartphone, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { DEFAULT_SHORTCUTS } from '@/lib/languages'
import { loadLastUser, saveAfterLogin } from '@/lib/storage'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'

const ACTIONS = [
  { id: 'token', icon: Smartphone, label: 'look.oneToken', to: '/login' },
  { id: 'scan', icon: ScanLine, label: 'gate.scanPay', to: '/flow/scan' },
  { id: 'paynow', icon: Send, label: 'gate.paynow', to: '/flow/paynow' },
  { id: 'wealth', icon: LineChart, label: 'gate.wealth', to: '/insights' },
  { id: 'fx', icon: ArrowLeftRight, label: 'gate.fx', to: '/flow/overseas' },
  { id: 'more', icon: LayoutGrid, label: 'gate.more', to: '' },
] as const

export function Welcome() {
  const app = useApp()
  const navigate = useNavigate()
  const [more, setMore] = useState(false)
  const last = loadLastUser()
  const t = (key: string) => translate(app.prefs.language, key)
  const labelSize = Math.max(11, Math.min(14, Math.round(app.prefs.textSize * 0.72)))
  const shortcutIds = last?.prefs.shortcuts?.length
    ? last.prefs.shortcuts.slice(0, 6)
    : DEFAULT_SHORTCUTS.slice(0, 6)
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
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--card)] text-[var(--text)]">
      <section className="relative h-64 shrink-0 overflow-hidden">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--card)]">
        <section className="px-2 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-x-1 gap-y-4">
            {last
              ? shortcutIds.map((id) => {
                  const Icon = SHORTCUT_ICONS[id] ?? ArrowLeftRight
                  return (
                    <button key={id} type="button" className="flex min-h-[88px] min-w-0 flex-col items-center justify-start px-1 text-[var(--text)]" onClick={() => askLogin(SHORTCUT_ROUTES[id] || '/pay')}>
                      <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--soft)]" style={{ width: 52, height: 52 }}>
                        <Icon aria-hidden size={22} strokeWidth={1.6} />
                      </span>
                      <span
                        className="mt-2 w-full px-0.5 text-center font-medium leading-snug [overflow-wrap:normal] [word-break:keep-all]"
                        style={{ fontSize: labelSize }}
                      >
                        {t(`shortcuts.${id}`)}
                      </span>
                    </button>
                  )
                })
              : ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <button key={action.id} type="button" className="flex min-h-[88px] min-w-0 flex-col items-center justify-start px-1 text-[var(--text)]" onClick={() => open(action.id, action.to)}>
                      <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--soft)]" style={{ width: 52, height: 52 }}>
                        <Icon aria-hidden size={22} strokeWidth={1.6} />
                      </span>
                      <span
                        className="mt-2 w-full px-0.5 text-center font-medium leading-snug [overflow-wrap:normal] [word-break:keep-all]"
                        style={{ fontSize: labelSize }}
                      >
                        {t(action.label)}
                      </span>
                    </button>
                  )
                })}
          </div>
          {last && (
            <button type="button" className="mt-3 min-h-11 w-full px-2 text-center text-[0.8rem] font-semibold leading-snug text-[var(--link)] underline" onClick={app.switchUser}>
              {t('gate.switchUser')}
            </button>
          )}
        </section>

        <section className="mx-4 mb-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
          <p className="text-sm font-semibold text-[var(--muted)]">{t('gate.promoBadge')}</p>
          <h2 className="mt-1 text-base font-bold leading-snug">{t('gate.promoTitle')}</h2>
          <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{t('gate.promoBody')}</p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-4 font-semibold text-[var(--text)]"
            onClick={() => askLogin('/tours')}
          >
            <Compass aria-hidden size={18} />
            {t('gate.tourCta')}
          </button>
        </section>
      </div>

      <div className="shrink-0 border-t border-[var(--line)] bg-[var(--card)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <button type="button" className="min-h-12 w-full rounded-full bg-[#1C2834] px-4 py-3 text-[0.95rem] font-semibold leading-snug text-white" onClick={() => navigate('/login')}>
          {t('gate.login')}
        </button>
      </div>
      {more && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={() => setMore(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="welcome-more" className="max-h-[70%] overflow-y-auto rounded-t-3xl bg-[var(--card)] p-4 text-[var(--text)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="welcome-more" className="text-lg font-semibold">{t('gate.more')}</h2>
              <button type="button" className="flex h-12 w-12 items-center justify-center" aria-label={t('close')} onClick={() => setMore(false)}>
                <X aria-hidden />
              </button>
            </div>
            <p className="mb-2 text-sm font-semibold">{t('gate.personas')}</p>
            <button type="button" className="mb-2 min-h-12 w-full rounded-2xl border border-[var(--line)] px-3 py-2 text-left" onClick={() => app.applyPersona('mei')}>
              <span className="block font-semibold">{t('settings.mei')}</span>
              <span className="text-sm leading-snug text-[var(--muted)]">{t('settings.meiBody')}</span>
            </button>
            <button type="button" className="min-h-12 w-full rounded-2xl border border-[var(--line)] px-3 py-2 text-left" onClick={() => app.applyPersona('arif')}>
              <span className="block font-semibold">{t('settings.arif')}</span>
              <span className="text-sm leading-snug text-[var(--muted)]">{t('settings.arifBody')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Bell, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { percentChange, rowsFor, sum } from '@/data/insights'
import { useApp } from '@/context/AppContext'
import { BottomNav, DemoBadge, HeaderHelp } from '@/components/Shell'
import { translate } from '@/i18n'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'
import { startAppTour } from '@/lib/appTour'
import { formatSGD } from '@/lib/format'
import { payeeName } from '@/data/bank'

export function Home() {
  const app = useApp()
  const [params] = useSearchParams()
  const [hidden, setHidden] = useState(false)
  const [offer, setOffer] = useState(() => {
    if (sessionStorage.getItem('ocbc-tour-offer') === '1' || params.get('offer') === '1') {
      sessionStorage.removeItem('ocbc-tour-offer')
      return true
    }
    return false
  })
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const hour = new Date().getHours()
  const hello = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')
  const balance = app.accounts.filter((account) => account.kind === 'deposit').reduce((sum, account) => sum + (app.balances[account.id] ?? account.balance), 0)
  const hero = app.prefs.backgroundImage
    ? `linear-gradient(rgba(0,0,0,${app.prefs.backgroundOverlay}), rgba(0,0,0,${app.prefs.backgroundOverlay})), url(${app.prefs.backgroundImage}) center/cover`
    : undefined

  useEffect(() => {
    app.setScreen('home')
    if (params.get('tour') !== '1') return
    const timer = window.setTimeout(() => startAppTour(false), 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <main id="main" className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)] ${app.prefs.textSize >= 22 ? 'pb-24' : 'pb-36'}`}>
        <header className="px-5 pb-2 pt-4" style={hero ? { background: hero, color: '#fff' } : undefined}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 whitespace-nowrap text-[22px] font-extrabold tracking-tight text-[var(--link)]" style={hero ? { color: '#fff' } : undefined} aria-label={t('appName')}>
                OCBC
              </span>
              <DemoBadge />
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[var(--text)]" style={hero ? { color: '#fff' } : undefined}>
              <HeaderHelp guide />
              <Link to="/notifications" className="flex min-h-11 min-w-11 items-center justify-center" aria-label={t('notifications.title')}>
                <Bell aria-hidden size={22} />
              </Link>
              <Link to="/profile" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--soft)] text-[0.8rem] font-semibold text-[var(--text)]" aria-label={t('profile.title')}>
                {app.profile.shortName.slice(0, 1)}
              </Link>
            </span>
          </div>
          <p className="mt-5 text-[0.85rem] text-[var(--muted)]" style={hero ? { color: '#fff' } : undefined}>{hello}</p>
          <h1 data-guide="home-greeting" className="text-[26px] font-semibold leading-8 tracking-tight">{app.profile.shortName}</h1>
        </header>
        {app.prefs.contrastWarning && <p role="status" className="mx-5 mt-3 rounded-card bg-[var(--soft)] p-3 text-[0.85rem] text-[var(--text)]">{t('contrastWarn')}</p>}
        <section className="px-5 pt-4" data-guide="home-balance">
          <article className="card px-4 py-4">
            <Link to="/accounts" className="flex items-center justify-between text-[0.9rem] font-medium">
              {t('totalBalance')}
              <ChevronRight aria-hidden size={18} className="text-[var(--muted)]" />
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[32px] font-bold leading-9 tracking-tight tabular-nums">{hidden ? 'S$ ••••••' : formatSGD(balance)}</p>
              <button type="button" className="flex h-11 w-11 items-center justify-center" aria-pressed={hidden} aria-label={hidden ? t('show') : t('hide')} onClick={() => setHidden((v) => !v)}>
                {hidden ? <Eye aria-hidden size={22} /> : <EyeOff aria-hidden size={22} />}
              </button>
            </div>
            <p className="text-[0.75rem] text-[var(--muted)]">{app.accounts.filter((account) => account.kind === 'deposit').map((account) => t(account.nameKey)).join(' · ') || t('totalBalanceHint')}</p>
          </article>
        </section>
        <section className="px-5 pt-6" data-guide="home-shortcuts" aria-labelledby="shortcuts-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="shortcuts-title" className="text-[16px] font-semibold">{t('quickActions')}</h2>
            <Link
              className="accent flex min-h-12 items-center text-[0.85rem] font-semibold"
              to="/settings#shortcuts"
              onContextMenu={(event) => {
                event.preventDefault()
                navigate('/settings#shortcuts')
              }}
              onPointerDown={() => {
                const timer = window.setTimeout(() => navigate('/settings#shortcuts'), 550)
                const clear = () => window.clearTimeout(timer)
                window.addEventListener('pointerup', clear, { once: true })
                window.addEventListener('pointercancel', clear, { once: true })
              }}
            >
              {t('edit')}
            </Link>
          </div>
          <div className={app.prefs.textSize >= 22 ? 'grid grid-cols-2 gap-x-3 gap-y-4' : 'grid grid-cols-4 gap-y-4'}>
            {app.prefs.shortcuts.map((id) => {
              const Icon = SHORTCUT_ICONS[id] ?? ArrowLeftRight
              return (
                <Link key={id} to={SHORTCUT_ROUTES[id] ?? '/pay'} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--link)]">
                    <Icon aria-hidden size={26} />
                  </span>
                  <span className="line-clamp-2 w-full px-1 text-center text-[0.75rem] font-medium leading-normal text-[var(--text)]">{t(`shortcuts.${id}`)}</span>
                </Link>
              )
            })}
          </div>
        </section>
        <section className="px-5 pt-6" data-guide="home-foryou">
          <h2 className="mb-3 text-[1rem] font-semibold">{t('forYou')}</h2>
          <Link to="/flow/overseas?practice=1&tour=1" className="block rounded-card p-4 leading-normal text-[var(--on-accent)]" style={{ background: 'var(--accent)' }}>
            <p className="text-[0.8rem] opacity-90">{t('forYouKicker')}</p>
            <p className="text-[1.05rem] font-semibold">{t('forYouBody')}</p>
          </Link>
        </section>
        <section className="px-5 pb-4 pt-6">
          <h2 className="mb-3 text-[16px] font-semibold">{t('recent')}</h2>
          <ul className="overflow-hidden rounded-card border border-[var(--line)] bg-[var(--card)]">
            {app.txns.slice(0, 4).map((txn) => (
              <li key={txn.id} className="border-b border-[var(--line)] last:border-0">
                <Link to={`/txn/${txn.id}`} className="flex items-center justify-between px-4 py-3">
                  <span>
                    <span className="block text-[0.95rem]">{payeeName(txn.title)}</span>
                    <span className="text-[0.75rem] text-[var(--muted)]">{txn.date}</span>
                  </span>
                  <span className="text-[0.95rem] font-semibold tabular-nums">{formatSGD(txn.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {app.goals.length > 0 && (
          <section className="px-5 pb-2">
            <h2 className="mb-2 text-[16px] font-semibold">{t('shortcuts.goals')}</h2>
            <ul className="overflow-hidden rounded-card border border-[var(--line)] bg-[var(--card)]">
              {app.goals.map((goal) => (
                <li key={goal.id} className="flex items-center justify-between px-4 py-3">
                  <span>{goal.name}</span>
                  <span className="tabular-nums">{formatSGD(goal.saved ?? 0)} / {formatSGD(goal.target)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {app.prefs.spendingInsights && (
          <section className="px-5 pb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">{t('insights')}</h2>
              <Link to="/insights" className="accent text-[0.85rem] font-semibold">{t('insights')}</Link>
            </div>
            <p className="rounded-card border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              {t('insight.vsLast', {
                amount: formatSGD(sum(rowsFor('all', '2026-10'))),
                pct: Math.abs(percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09')))),
                dir: percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09'))) >= 0 ? t('insight.more') : t('insight.less'),
              })}
            </p>
          </section>
        )}
      </main>
      <BottomNav />
      {offer && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="tour-offer" className="w-full rounded-3xl bg-[var(--card)] p-4 text-[var(--text)]">
            <h2 id="tour-offer" className="text-xl font-semibold">{t('gate.tourTitle')}</h2>
            <p className="mt-2">{t('gate.tourBody')}</p>
            <button type="button" className="mt-4 min-h-11 w-full rounded-2xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => { setOffer(false); navigate('/', { replace: true }); startAppTour(false) }}>
              {t('gate.tourStart')}
            </button>
            <button type="button" className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)]" onClick={() => { setOffer(false); navigate('/', { replace: true }) }}>
              {t('gate.tourLater')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

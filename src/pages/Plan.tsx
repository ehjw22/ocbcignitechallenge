import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, PieChart, Shield, Target } from 'lucide-react'
import { BottomNav } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'

const TILES = [
  { to: '/insights', key: 'look.track', icon: PieChart },
  { to: '/investments', key: 'look.invest', icon: Landmark },
  { to: '/flow/goal', key: 'look.goals', icon: Target },
  { to: '/insurance', key: 'look.insure', icon: Shield },
] as const

export function Plan() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('plan') }, [setScreen])
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <main id="main" className="nav-clearance min-h-0 flex-1 overflow-y-auto px-4 pt-6">
        <h1 className="text-[24px] font-bold">{t('look.planTitle')}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <Link key={tile.to} to={tile.to} className="flex min-h-[120px] flex-col justify-between rounded-xl bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
                <Icon aria-hidden size={22} strokeWidth={1.5} />
                <span className="text-[0.85rem] font-bold tracking-wide">{t(tile.key)}</span>
                <span className="text-[0.8rem] leading-snug text-[var(--muted)]">{t(`${tile.key}Hint`)}</span>
              </Link>
            )
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

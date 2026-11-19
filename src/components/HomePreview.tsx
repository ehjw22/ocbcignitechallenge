import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { formatMoney } from '@/lib/format'
import { SHORTCUT_ICONS } from '@/lib/shortcutItems'

/** Live mini Home card for setup quiz and Settings. */
export function HomePreview({ balance = 1230.55 }: { balance?: number }) {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const shortcuts = app.prefs.shortcuts.slice(0, 3)
  return (
    <article
      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm"
      aria-label={t('customise.livePreview')}
    >
      <p className="text-sm text-[var(--muted)]">{t('totalBalance')}</p>
      <p className="font-bold tabular-nums text-[var(--text)]" style={{ fontSize: app.prefs.textSize + 6 }}>
        {formatMoney(balance, app.prefs.language)}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {shortcuts.map((id) => {
          const Icon = SHORTCUT_ICONS[id]
          return (
            <ShortcutTile key={id} id={id} compact={app.prefs.textSize >= 22} label={t(`shortcuts.${id}`)} Icon={Icon} />
          )
        })}
      </div>
    </article>
  )
}

function ShortcutTile({ id, label, Icon, compact }: { id: string; label: string; Icon?: typeof SHORTCUT_ICONS[string]; compact: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1 text-center" data-preview-shortcut={id}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--link)]">
        {Icon ? <Icon aria-hidden size={22} strokeWidth={1.75} /> : null}
      </span>
      <span className={`line-clamp-2 max-w-full leading-tight [overflow-wrap:anywhere] ${compact ? 'text-[11px]' : 'text-xs'}`}>{label}</span>
    </span>
  )
}
import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { chartPalette } from '@/data/bank'
import {
  INSIGHT_CATEGORIES,
  INSIGHT_MONTHS,
  MONTH_LABELS,
  byCategory,
  dailyTotals,
  monthTotals,
  percentChange,
  previousMonth,
  rowsFor,
  sum,
  topMerchants,
} from '@/data/insights'
import { translate } from '@/i18n'
import { themeVars } from '@/lib/accent'
import { formatSGD } from '@/lib/format'

const BUDGET_KEY = 'ocbc-budgets'
const DEFAULT_BUDGETS: Record<string, number> = {
  food: 400,
  transport: 110,
  shopping: 300,
  bills: 600,
  subscriptions: 40,
  other: 100,
}

function loadBudgets() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}') as Record<string, number>
    return { ...DEFAULT_BUDGETS, ...saved }
  } catch {
    return { ...DEFAULT_BUDGETS }
  }
}

export function Insights() {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const colours = chartPalette(app.prefs.colourVision)
  const accent = themeVars(app.prefs)['--accent']
  const [accountId, setAccountId] = useState('all')
  const [month, setMonth] = useState('2026-10')
  const [budgets, setBudgets] = useState(loadBudgets)
  const [note, setNote] = useState('')
  useEffect(() => { app.setScreen('insights') }, [])

  if (!app.prefs.spendingInsights) {
    return (
      <Page title={t('insights')} back>
        <div className="space-y-3 p-4">
          <p>{t('insightsHint')}</p>
          <button type="button" className="tap w-full rounded-xl bg-[var(--accent)] text-[var(--on-accent)]" onClick={() => app.updatePrefs({ spendingInsights: true })}>
            {t('turnOnInsights')}
          </button>
        </div>
      </Page>
    )
  }

  const current = rowsFor(accountId, month)
  const prevId = previousMonth(month)
  const previous = prevId ? rowsFor(accountId, prevId) : []
  const spent = sum(current)
  const last = sum(previous)
  const pct = percentChange(spent, last)
  const slices = byCategory(current).filter((item) => item.amount > 0)
  const merchants = topMerchants(current)
  const daily = dailyTotals(current)
  const trend = monthTotals(accountId)
  const foodNow = byCategory(current).find((item) => item.key === 'food')?.amount || 0
  const foodPrev = byCategory(previous).find((item) => item.key === 'food')?.amount || 0
  const foodPct = percentChange(foodNow, foodPrev)
  const direction = (value: number) => (value > 0 ? t('insight.more') : value < 0 ? t('insight.less') : t('insight.same'))
  const goal = app.goals.find((item) => /laptop/i.test(item.name)) || app.goals[0]
  const goalName = goal?.name || 'Laptop'
  const accounts = app.accounts.filter((account) => account.kind === 'deposit')

  const saveBudget = (key: string, value: number) => {
    const next = { ...budgets, [key]: value }
    setBudgets(next)
    localStorage.setItem(BUDGET_KEY, JSON.stringify(next))
  }

  const addToGoal = () => {
    if (!goal) {
      app.setGoals([{ id: 'laptop', name: 'Laptop', target: 1500, monthly: 50, saved: 50 }])
    } else {
      app.setGoals(app.goals.map((item) => (item.id === goal.id ? { ...item, saved: (item.saved || 0) + 50 } : item)))
    }
    setNote(t('insight.goalDone', { name: goalName }))
  }

  return (
    <Page title={t('insights')} back>
      <div className="space-y-4 p-4">
        <p className="text-sm text-[var(--muted)]">{t('insight.sample')}</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0 text-sm font-semibold">
            {t('insight.account')}
            <select className="ocbc-field mt-1" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="all">{t('insight.allAccounts')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{t(account.nameKey)}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-semibold">
            {t('insight.month')}
            <select className="ocbc-field mt-1" value={month} onChange={(event) => setMonth(event.target.value)}>
              {INSIGHT_MONTHS.map((id) => (
                <option key={id} value={id}>{MONTH_LABELS[id]}</option>
              ))}
            </select>
          </label>
        </div>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.summary')}</h2>
          <p>
            {prevId
              ? t('insight.vsLast', { amount: formatSGD(spent), pct: Math.abs(pct), dir: direction(pct) })
              : t('insight.vsLastNone', { amount: formatSGD(spent) })}
          </p>
        </section>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.donut')}</h2>
          {slices.length === 0 ? <p>{t('insight.empty')}</p> : (
            <div>
              <div aria-hidden className="mx-auto h-[220px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={slices} dataKey="amount" nameKey="key" innerRadius={58} outerRadius={88}>
                      {slices.map((item, index) => <Cell key={item.key} fill={index === 0 ? accent : colours[index % colours.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {slices.map((item, index) => (
                  <li key={item.key} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: index === 0 ? accent : colours[index % colours.length] }} />{t(`categories.${item.key}`)}</span>
                    <span className="money shrink-0">{formatSGD(item.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <table className="sr-only">
            <caption className="sr-only">{t('insight.donut')}</caption>
            <tbody>
              {byCategory(current).map((item, index) => (
                <tr key={item.key} className="border-t border-[var(--line)]">
                  <th scope="row" className="py-2 font-medium">
                    <span className="mr-2 inline-block h-3 w-3 rounded-sm" style={{ background: index === 0 ? accent : colours[index % colours.length] }} aria-hidden />
                    {t(`categories.${item.key}`)}
                  </th>
                  <td className="py-2 text-right tabular-nums">{formatSGD(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.merchants')}</h2>
          {merchants.length === 0 ? <p>{t('insight.empty')}</p> : (
            <ol className="space-y-1">
              {merchants.map((item, index) => (
                <li key={item.name} className="flex justify-between">
                  <span>{index + 1}. {item.name}</span>
                  <span className="tabular-nums">{formatSGD(item.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.trend')}</h2>
          <div aria-hidden className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Bar dataKey="amount" fill={accent} radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{t('insight.trend')}</caption>
            <tbody>
              {trend.map((item) => (
                <tr key={item.month} className="border-t border-[var(--line)]">
                  <th scope="row" className="py-1 font-medium">{item.label}</th>
                  <td className="py-1 text-right tabular-nums">{formatSGD(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.daily')}</h2>
          <details>
            <summary className="cursor-pointer font-semibold">{t('insight.seeAll')}</summary>
          {daily.length === 0 ? <p>{t('insight.empty')}</p> : (
            <div aria-hidden className="mt-2 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis hide />
                  <Line dataKey="amount" stroke={accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="w-full text-left">
            <caption className="sr-only">{t('insight.daily')}</caption>
            <tbody>
              {daily.map((item) => (
                <tr key={item.day} className="border-t border-[var(--line)]">
                  <th scope="row" className="py-1 font-medium">{item.day}</th>
                  <td className="py-1 text-right tabular-nums">{formatSGD(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </details>
        </section>

        <section className="card space-y-2 p-3">
          <h2 className="text-base font-semibold">{t('insight.tips')}</h2>
          <ul className="list-disc space-y-2 pl-5">
            {foodPrev > 0 && <li>{t('insight.foodTip', { pct: Math.abs(foodPct), dir: direction(foodPct) })}</li>}
            {month === '2026-10' && <li>{t('insight.subsTip')}</li>}
            {month === '2026-10' && <li>{t('insight.giroTip')}</li>}
          </ul>
        </section>

        <section className="card space-y-3 p-3">
          <h2 className="text-base font-semibold">{t('insight.budgets')}</h2>
          {INSIGHT_CATEGORIES.map((key) => {
            const amount = byCategory(current).find((item) => item.key === key)?.amount || 0
            const budget = budgets[key] || 0
            const ratio = budget > 0 ? amount / budget : 0
            const colour = ratio >= 1 ? '#9f1239' : ratio >= 0.8 ? '#b45309' : accent
            return (
              <div key={key}>
                <label className="flex items-center justify-between gap-2 text-sm font-semibold" htmlFor={`budget-${key}`}>
                  <span>{t(`categories.${key}`)}</span>
                  <span className="font-medium tabular-nums">{formatSGD(amount)} / {formatSGD(budget)}</span>
                </label>
                <input
                  id={`budget-${key}`}
                  className="ocbc-field mt-1"
                  inputMode="decimal"
                  aria-label={t('insight.budgetFor', { name: t(`categories.${key}`) })}
                  value={budget ? String(budget) : ''}
                  onChange={(event) => saveBudget(key, Number(event.target.value.replace(/[^\d.]/g, '')) || 0)}
                />
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--soft)]" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: colour }} />
                </div>
              </div>
            )
          })}
        </section>

        <button type="button" className="h-12 w-full rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={addToGoal}>
          {t('insight.goalAction', { name: goalName })}
        </button>
        {note && <p role="status">{note}</p>}
      </div>
    </Page>
  )
}

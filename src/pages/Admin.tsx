import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '@/context/AppContext'
import { FUNNELS, SEED_ERRORS, SEED_QUESTIONS, SEED_REFUSED, seedUsers } from '@/data/seed'
import { chartPalette } from '@/data/bank'
import { translate } from '@/i18n'
import { guideById } from '@/lib/guide'
import { languageById } from '@/lib/languages'
import { requestText } from '@/lib/staffSummary'

const USERS = seedUsers()

const ERROR_KEYS: Record<string, string> = {
  account_digits: 'admin.err.account',
  swift: 'admin.err.swift',
  paynow_mobile: 'admin.err.paynow',
  insufficient: 'admin.err.funds',
  amount_format: 'admin.err.amount',
  amount_positive: 'admin.err.amount',
  nric: 'admin.err.nric',
  account_iban: 'admin.err.iban',
  account_my: 'admin.err.account',
}

function countBy<T extends string>(items: T[]) {
  const map = new Map<string, number>()
  items.forEach((item) => map.set(item, (map.get(item) || 0) + 1))
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function download(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function named(t: (key: string) => string, key: string, fallback: string) {
  const label = t(key)
  return label === key ? fallback : label
}

export function Admin() {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ocbc-admin') === '1')
  const [password, setPassword] = useState('')
  const [guide, setGuide] = useState('overseas')
  const [modelConfigured, setModelConfigured] = useState(true)
  useEffect(() => {
    let live = true
    fetch('/api/assistant')
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (live) setModelConfigured(Boolean(data.configured))
      })
      .catch(() => {
        if (live) setModelConfigured(false)
      })
    return () => {
      live = false
    }
  }, [])
  const palette = chartPalette('default')
  const languages = useMemo(() => {
    const rows = countBy([...USERS.map((user) => user.language), app.prefs.language])
    return rows.map((row) => {
      const option = languageById(row.name)
      const name = app.prefs.language === 'en' ? option.english : option.native
      return { ...row, name }
    })
  }, [app.prefs.language])
  const sizes = useMemo(() => countBy([...USERS.map((user) => String(user.textSize)), String(app.prefs.textSize)]), [app.prefs.textSize])
  const colours = useMemo(() => {
    const rows = countBy([...USERS.map((user) => user.colourVision), app.prefs.colourVision])
    return rows.map((row) => ({ ...row, name: named(t, `cvd.${row.name}`, row.name) }))
  }, [app.prefs.colourVision, app.prefs.language])
  const help = useMemo(() => {
    const rows = countBy([...USERS.map((user) => user.help), app.prefs.helpPreference])
    const keys: Record<string, string> = { ai: 'admin.helpAi', guide: 'admin.helpGuide', staff: 'admin.helpStaff' }
    return rows.map((row) => ({ ...row, name: named(t, keys[row.name] || row.name, row.name) }))
  }, [app.prefs.helpPreference, app.prefs.language])
  const funnel = FUNNELS[guide] || []
  const guideDef = guideById(guide)
  const guideTitle = guideDef ? named(t, guideDef.title, guide) : guide
  const deviceGuides = app.events.filter((event) => String(event.data.guideId || '') === guide)
  const missing = [
    { guideId: 'scan', element: 'scan-flash', stepId: 'amount', source: 'sample' },
    ...app.events.filter((event) => event.type === 'guide_step_missing').map((event) => ({
      guideId: String(event.data.guideId || ''),
      element: String(event.data.element || ''),
      stepId: String(event.data.stepId || ''),
      source: 'device',
    })),
  ]
  const questions = new Map<string, number>(SEED_QUESTIONS.map((item) => [item.q, item.count]))
  app.events.filter((event) => event.type === 'ai_question').forEach((event) => {
    const q = String(event.data.question || '')
    questions.set(q, (questions.get(q) || 0) + Number(event.data.count || 1))
  })
  const refused = [
    ...SEED_REFUSED,
    ...app.events.filter((event) => event.type === 'ai_refused').map((event) => ({ q: String(event.data.question), reason: String(event.data.reason || 'refused') })),
  ]
  const escalated = app.events.filter((event) => event.type === 'ai_escalated')
  const errors = new Map<string, number>(SEED_ERRORS.map((item) => [item.code, item.count]))
  app.events.filter((event) => event.type === 'error_shown').forEach((event) => {
    const code = String(event.data.code || '')
    errors.set(code, (errors.get(code) || 0) + Number(event.data.count || 1))
  })
  const withYou = USERS.length + 1
  const large = USERS.filter((user) => user.textSize >= 20).length + (app.prefs.textSize >= 20 ? 1 : 0)
  const aloud = USERS.filter((user) => user.readAloud).length + (app.prefs.readAloud ? 1 : 0)
  const contrast = USERS.filter((user) => user.highContrast).length + (app.prefs.highContrast ? 1 : 0)
  const cvd = USERS.filter((user) => user.colourVision !== 'default').length + (app.prefs.colourVision !== 'default' ? 1 : 0)
  const started = Object.values(FUNNELS).reduce((sum, steps) => sum + steps[0].reached, 0) + app.events.filter((event) => event.type === 'guide_started').length
  const completed = Object.values(FUNNELS).reduce((sum, steps) => sum + steps[steps.length - 1].reached, 0) + app.events.filter((event) => event.type === 'guide_completed').length
  const aiCount = SEED_QUESTIONS.reduce((sum, item) => sum + item.count, 0) + app.events.filter((event) => event.type === 'ai_question' && !event.data.count).length

  const exportCsv = () => {
    const rows: Record<string, string | number | boolean | null | undefined>[] = [
      ...app.events.map((event) => ({ kind: 'event', id: event.id, ts: event.ts, type: event.type, ...event.data })),
      ...app.requests.map((request) => ({ kind: 'staff', ref: request.ref, status: request.status, summary: request.summaryEn || request.summary, language: request.language, method: request.method })),
      ...USERS.map((user, index) => ({ kind: 'synthetic-user', id: index + 1, ...user })),
    ]
    download('ocbc-adaptive-analytics.csv', rows)
  }

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f7f9] p-6 text-zinc-900">
        <form
          className="w-full max-w-sm space-y-3 rounded-2xl border border-zinc-200 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault()
            sessionStorage.setItem('ocbc-admin', '1')
            setAuthed(true)
          }}
        >
          <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
          <p>{t('admin.demoLogin')}</p>
          <label className="block font-semibold" htmlFor="admin-pass">
            {t('admin.password')}
            <input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-zinc-300 px-3" />
          </label>
          <button type="submit" className="min-h-11 w-full rounded-lg bg-[#E30613] font-semibold text-white">{t('admin.signIn')}</button>
          <Link to="/" className="block text-center font-semibold underline">{t('admin.back')}</Link>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f6f7f9] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-[#9f1239]">OCBC Adaptive</p>
            <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-xl bg-[#E30613] px-4 font-semibold text-white" onClick={exportCsv}>{t('admin.export')}</button>
            <Link to="/" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 px-4 font-semibold">{t('admin.back')}</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">{t('admin.note')}</p>
        {!modelConfigured && <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">{t('ai.demoNote')}</p>}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t('admin.users'), withYou],
            [t('admin.guidesStarted'), started],
            [t('admin.guidesDone'), completed],
            [t('admin.aiQuestions'), aiCount],
            [t('admin.staffRequests'), app.requests.length],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-sm text-zinc-600">{label}</p>
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('admin.languages')} data={languages} palette={palette} item={t('admin.item')} count={t('admin.count')} />
          <ChartCard title={t('admin.textSizes')} data={sizes} palette={palette} item={t('admin.item')} count={t('admin.count')} />
          <ChartCard title={t('admin.colourModes')} data={colours} palette={palette} item={t('admin.item')} count={t('admin.count')} />
          <ChartCard title={t('admin.helpMethod')} data={help} palette={palette} item={t('admin.item')} count={t('admin.count')} />
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t('admin.dropoff')}</h2>
            <label htmlFor="guide" className="text-sm font-semibold">
              {t('admin.journey')}
              <select id="guide" value={guide} onChange={(e) => setGuide(e.target.value)} className="ml-2 min-h-11 max-w-full rounded-lg border border-zinc-300 px-2">
                {Object.keys(FUNNELS).map((id) => {
                  const titleKey = guideById(id)?.title
                  return <option key={id} value={id}>{titleKey ? named(t, titleKey, id) : id}</option>
                })}
              </select>
            </label>
          </div>
          <ChartCard
            title=""
            data={funnel.map((step) => {
              const match = guideDef?.steps.find((item) => item.id === step.step)
              const name = step.step === 'completed' ? t('admin.completed') : match ? named(t, match.title, step.step) : step.step
              return { name, value: step.reached }
            })}
            palette={palette}
            item={t('admin.item')}
            count={t('admin.count')}
          />
          <p className="mt-2 text-sm text-zinc-600">{t('admin.device', { guide: guideTitle, count: deviceGuides.length })}</p>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">{t('admin.errors')}</h2>
            <ul className="space-y-1">{[...errors.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => <li key={code} className="flex justify-between gap-3 border-b border-zinc-100 py-2"><span>{named(t, ERROR_KEYS[code] || `errors.${code}`, code)}</span><span className="tabular-nums">{count}</span></li>)}</ul>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">{t('admin.questions')}</h2>
            <ul className="space-y-1">{[...questions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q, count]) => <li key={q} className="flex justify-between gap-3 border-b border-zinc-100 py-2"><span>{q}</span><span className="tabular-nums">{count}</span></li>)}</ul>
          </article>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">{t('admin.refusedTitle')}</h2>
          <ul className="space-y-2">
            {refused.map((item) => <li key={item.q} className="rounded-xl bg-zinc-50 p-3"><strong>{t('admin.refused')}</strong> {item.q} <span className="text-zinc-600">({item.reason})</span></li>)}
            {escalated.map((event) => <li key={event.id} className="rounded-xl bg-amber-50 p-3"><strong>{t('admin.escalated')}</strong> {String(event.data.question)} <span className="text-zinc-600">({String(event.data.reason)})</span></li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">{t('admin.queue')}</h2>
          <ul className="space-y-3">
            {app.requests.map((request) => {
              const english = requestText('en', request)
              const local = requestText(request.language, request)
              return (
                <li key={request.ref} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{request.ref}</p>
                    <p>{request.status === 'received' ? t('admin.received') : request.status === 'in_progress' ? t('admin.inProgress') : t('admin.replied')}</p>
                  </div>
                  <p className="mt-1 text-sm leading-normal">{english}</p>
                  {local !== english && <p className="mt-1 text-sm leading-normal text-zinc-600">{languageById(request.language).native}: {local}</p>}
                  <p className="text-sm text-zinc-600">{named(t, `staff.${request.method}`, request.method)} · {named(t, `staff.${request.time}`, request.time)} · {languageById(request.language).english}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="min-h-11 rounded-lg border border-zinc-300 px-3" onClick={() => app.setRequestStatus(request.ref, 'in_progress')}>{t('admin.markProgress')}</button>
                    <button type="button" className="min-h-11 rounded-lg bg-[#E30613] px-3 font-semibold text-white" onClick={() => app.setRequestStatus(request.ref, 'replied')}>{t('admin.markReplied')}</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">{t('admin.broken')}</h2>
          <ul className="space-y-2">
            {missing.map((item, index) => {
              const def = guideById(item.guideId)
              const title = def ? named(t, def.title, item.guideId) : item.guideId
              const stepIndex = def?.steps.findIndex((step) => step.id === item.stepId) ?? -1
              const step = stepIndex >= 0 ? stepIndex + 1 : 1
              return (
                <li key={`${item.element}-${index}`} className="rounded-xl bg-rose-50 p-3">
                  {t('admin.brokenLine', { guide: title, step })}
                </li>
              )
            })}
          </ul>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">{t('admin.a11y')}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="rounded-xl bg-zinc-50 p-3">{t('admin.largeText', { n: Math.round((large / withYou) * 100) })}</li>
            <li className="rounded-xl bg-zinc-50 p-3">{t('admin.readAloud', { n: Math.round((aloud / withYou) * 100) })}</li>
            <li className="rounded-xl bg-zinc-50 p-3">{t('admin.highContrast', { n: Math.round((contrast / withYou) * 100) })}</li>
            <li className="rounded-xl bg-zinc-50 p-3">{t('admin.colourMode', { n: Math.round((cvd / withYou) * 100) })}</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

function ChartCard({ title, data, palette, item, count }: { title: string; data: { name: string; value: number }[]; palette: string[]; item: string; count: string }) {
  return (
    <article className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4">
      {title && <h2 className="mb-2 text-lg font-semibold">{title}</h2>}
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value">
            {data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="mt-2 w-full text-left text-sm">
        <caption className="sr-only">{title || item}</caption>
        <thead><tr><th>{item}</th><th>{count}</th></tr></thead>
        <tbody>
          {data.map((entry) => <tr key={entry.name}><td>{entry.name}</td><td className="tabular-nums">{entry.value}</td></tr>)}
        </tbody>
      </table>
    </article>
  )
}

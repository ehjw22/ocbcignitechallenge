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

type QueueRow = {
  id: string
  name: string
  language: string
  needs: string
  topic: string
  waitMin: number
  priority: 'High' | 'Normal'
  status: string
  sample: boolean
  summary: string
  transcript: string
  request?: { ref: string }
}

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
  const [section, setSection] = useState<'dashboard' | 'queue' | 'chats' | 'customers' | 'analytics' | 'settings'>('dashboard')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState('')
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({})
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

  const samples: QueueRow[] = [
    {
      id: 'sample-mei',
      name: 'Auntie Mei',
      language: 'Cantonese',
      needs: 'Large text, Read aloud, Cantonese',
      topic: 'Overseas transfer',
      waitMin: 6,
      priority: 'High',
      status: 'received',
      sample: true,
      summary: 'Sample. Auntie Mei tried to send money to her son in Australia and stopped on the review screen.',
      transcript: 'Customer: What is this?\nOllie: This is the overseas transfer review. The rate is sample data, and nothing is sent until you confirm.',
    },
    {
      id: 'sample-arif',
      name: 'Arif',
      language: 'English',
      needs: 'Spending insights, Dark mode',
      topic: 'Spending insights',
      waitMin: 2,
      priority: 'Normal',
      status: 'received',
      sample: true,
      summary: 'Sample. Arif opened spending insights and asked what the chart is showing.',
      transcript: 'Customer: What is this?\nOllie: This is your spending screen. The chart uses sample transactions.',
    },
  ]
  const liveRows: QueueRow[] = app.requests.filter((request) => request.customerName && Date.now() - new Date(request.createdAt).getTime() < 12 * 60 * 60 * 1000).map((request) => {
    const waited = Math.max(1, Math.round((Date.now() - new Date(request.createdAt).getTime()) / 60000))
    const cantonese = request.needs?.includes('Cantonese') || request.summary.includes('Cantonese')
    return {
      id: request.ref,
      name: request.customerName || '',
      language: cantonese ? 'Cantonese' : languageById(request.language).english,
      needs: request.needs || 'None recorded',
      topic: named(t, `staff.topic.${request.task}`, request.task),
      waitMin: waited,
      priority: request.urgent || /fraud|scam|lost/i.test(request.summary) ? 'High' : 'Normal',
      status: request.status,
      sample: false,
      summary: request.summary,
      transcript: request.transcript || request.summary,
      request,
    }
  })
  const queue = [...liveRows, ...samples.filter((row) => !liveRows.some((item) => item.name === row.name))]
    .map((row) => ({ ...row, status: localStatus[row.id] || row.status }))
    .filter((row) => {
      const haystack = `${row.name} ${row.topic} ${row.language} ${row.summary}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
  const waiting = queue.filter((row) => row.status === 'received')
  const resolved = queue.filter((row) => row.status === 'replied').length
  const recentWaits = queue.filter((row) => row.waitMin <= 180)
  const avgWait = recentWaits.length ? Math.round(recentWaits.reduce((sum, row) => sum + row.waitMin, 0) / recentWaits.length) : 0
  const selected = queue.find((row) => row.id === selectedId) || queue.find((row) => row.id === liveRows[0]?.id) || queue[0] || null
  const volume = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 9 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 11 },
    { name: 'Fri', value: 18 },
    { name: 'Live', value: liveRows.length },
  ]
  const issues = countBy(queue.map((row) => row.topic))

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

  const nav = [
    ['dashboard', 'Dashboard'],
    ['queue', 'Customer queue'],
    ['chats', 'Active chats'],
    ['customers', 'Customers'],
    ['analytics', 'Analytics'],
    ['settings', 'Settings'],
  ] as const
  const mark = (row: QueueRow, status: 'in_progress' | 'replied') => {
    if (row.request) app.setRequestStatus(row.request.ref, status)
    setLocalStatus((current) => ({ ...current, [row.id]: status }))
  }

  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-zinc-900">
      <div className="grid min-h-dvh lg:grid-cols-[232px_1fr]">
        <aside className="border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
          <div className="px-4 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#E30613]">OCBC</p>
            <p className="text-lg font-semibold">Branch support</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
            {nav.map(([id, label]) => (
              <button key={id} type="button" className={`min-h-11 shrink-0 rounded-lg px-3 text-left text-sm font-semibold hover:bg-zinc-100 ${section === id ? 'bg-red-50 text-[#9f1239]' : 'text-zinc-700'}`} onClick={() => setSection(id)}>
                {label}
                {id === 'queue' && waiting.length > 0 && <span className="ml-2 rounded-full bg-[#E30613] px-2 py-0.5 text-xs text-white">{waiting.length}</span>}
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
            <label className="min-w-[12rem] flex-1 text-sm font-semibold">
              <span className="sr-only">Search customers</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, language, or topic" className="h-11 w-full rounded-lg border border-zinc-300 px-3" />
            </label>
            <button type="button" className="relative min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-semibold" onClick={() => setSection('queue')}>
              Notifications
              {waiting.length > 0 && <span className="ml-2 rounded-full bg-[#E30613] px-2 text-xs text-white">{waiting.length}</span>}
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E30613] text-sm font-semibold text-white">BS</span>
              <span className="text-sm leading-tight"><strong className="block">Branch staff</strong><span className="text-zinc-500">Relationship desk</span></span>
            </div>
          </header>
          <main className="space-y-4 p-4">
            {(section === 'dashboard' || section === 'queue' || section === 'chats') && (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Kpi label="Customers waiting" value={String(waiting.length)} />
                  <Kpi label="Average wait" value={avgWait < 60 ? `${avgWait} min` : `${Math.round(avgWait / 60)} hr`} />
                  <Kpi label="Resolved today" value={String(resolved)} />
                  <Kpi label="Satisfaction" value="4.6" hint="Sample score" />
                </section>
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                  <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                      <h2 className="font-semibold">{section === 'chats' ? 'Active chats' : 'Customer queue'}</h2>
                      <p className="text-sm text-zinc-500">{queue.length ? `${queue.length} shown` : 'No matches'}</p>
                    </div>
                    {queue.length === 0 ? (
                      <p className="p-6 text-sm text-zinc-600">No customers match that search.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="bg-zinc-50 text-zinc-600">
                            <tr>
                              {['Name', 'Language', 'Access needs', 'Topic', 'Wait', 'Priority', 'Status'].map((heading) => <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {queue.filter((row) => section !== 'chats' || row.status === 'in_progress' || Boolean(row.transcript)).map((row) => (
                              <tr key={row.id} className={`cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 ${selected?.id === row.id ? 'bg-red-50' : ''}`} onClick={() => setSelectedId(row.id)}>
                                <td className="px-3 py-3 font-semibold">{row.name} {row.sample && <Badge tone="sample">Sample</Badge>}</td>
                                <td className="px-3 py-3">{row.language}</td>
                                <td className="px-3 py-3">{row.needs}</td>
                                <td className="px-3 py-3">{row.topic}</td>
                                <td className="px-3 py-3 tabular-nums">{row.waitMin < 60 ? `${row.waitMin} min` : row.waitMin < 1440 ? `${Math.round(row.waitMin / 60)} hr` : `${Math.round(row.waitMin / 1440)} d`}</td>
                                <td className="px-3 py-3"><Badge tone={row.priority === 'High' ? 'high' : 'normal'}>{row.priority}</Badge></td>
                                <td className="px-3 py-3"><Badge tone={row.status === 'replied' ? 'done' : row.status === 'in_progress' ? 'progress' : 'wait'}>{statusLabel(row.status, t)}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                  {selected ? (
                    <article className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold">{selected.name}</h2>
                          <p className="text-sm text-zinc-600">{selected.language} · {selected.needs}</p>
                        </div>
                        {selected.sample && <Badge tone="sample">Sample</Badge>}
                      </div>
                      <h3 className="mt-4 text-sm font-semibold">Handoff summary</h3>
                      <p className="mt-1 text-sm leading-relaxed">{selected.summary}</p>
                      <h3 className="mt-4 text-sm font-semibold">Ollie transcript</h3>
                      <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed">{selected.transcript || 'No Ollie messages were attached. The summary above is what the customer sent.'}</pre>
                      {notes[selected.id] && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm"><strong>Note. </strong>{notes[selected.id]}</p>}
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button type="button" className="min-h-11 rounded-lg bg-[#E30613] px-3 text-sm font-semibold text-white" onClick={() => mark(selected, 'in_progress')}>Join chat</button>
                        <button type="button" className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-semibold" onClick={() => setNotes((current) => ({ ...current, [selected.id]: 'Call back requested.' }))}>Call back</button>
                        <Link to="/flow/overseas" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Start a guided journey</Link>
                        <button type="button" className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-semibold" onClick={() => mark(selected, 'replied')}>{t('admin.markReplied')}</button>
                      </div>
                      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!noteDraft.trim()) return; setNotes((current) => ({ ...current, [selected.id]: noteDraft.trim() })); setNoteDraft('') }}>
                        <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add a note" className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm" />
                        <button type="submit" className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Save</button>
                      </form>
                    </article>
                  ) : <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">Select a customer to see the handoff.</p>}
                </section>
              </>
            )}
            {section === 'dashboard' && (
              <section className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Request volume (sample, plus live)" data={volume} palette={palette} item="Day" count="Requests" />
                <ChartCard title="Top issues" data={issues} palette={palette} item="Issue" count="Customers" />
              </section>
            )}
            {section === 'customers' && (
              <section className="grid gap-3 md:grid-cols-2">
                {queue.map((row) => (
                  <button key={row.id} type="button" className="rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-[#E30613]" onClick={() => { setSelectedId(row.id); setSection('queue') }}>
                    <p className="font-semibold">{row.name} {row.sample && <Badge tone="sample">Sample</Badge>}</p>
                    <p className="mt-1 text-sm text-zinc-600">{row.language} · {row.needs}</p>
                    <p className="mt-2 text-sm">{row.topic}</p>
                  </button>
                ))}
              </section>
            )}
            {section === 'analytics' && (
              <>
                <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">{t('admin.note')}</p>
                {!modelConfigured && <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">{t('ai.demoNote')}</p>}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[[t('admin.users'), withYou], [t('admin.guidesStarted'), started], [t('admin.guidesDone'), completed], [t('admin.aiQuestions'), aiCount]].map(([label, value]) => (
                    <Kpi key={String(label)} label={String(label)} value={String(value)} />
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
                  <ChartCard title="" data={funnel.map((step) => {
                    const match = guideDef?.steps.find((item) => item.id === step.step)
                    const name = step.step === 'completed' ? t('admin.completed') : match ? named(t, match.title, step.step) : step.step
                    return { name, value: step.reached }
                  })} palette={palette} item={t('admin.item')} count={t('admin.count')} />
                  <p className="mt-2 text-sm text-zinc-600">{t('admin.device', { guide: guideTitle, count: deviceGuides.length })}</p>
                </section>
                <section className="grid gap-4 lg:grid-cols-2">
                  <article className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <h2 className="mb-2 text-lg font-semibold">{t('admin.errors')}</h2>
                    <ul>{[...errors.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => <li key={code} className="flex justify-between gap-3 border-b border-zinc-100 py-2"><span>{named(t, ERROR_KEYS[code] || `errors.${code}`, code)}</span><span className="tabular-nums">{count}</span></li>)}</ul>
                  </article>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <h2 className="mb-2 text-lg font-semibold">{t('admin.questions')}</h2>
                    <ul>{[...questions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q, count]) => <li key={q} className="flex justify-between gap-3 border-b border-zinc-100 py-2"><span>{q}</span><span className="tabular-nums">{count}</span></li>)}</ul>
                  </article>
                </section>
                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <h2 className="mb-2 text-lg font-semibold">{t('admin.refusedTitle')}</h2>
                  <ul className="space-y-2">
                    {refused.map((item) => <li key={item.q} className="rounded-xl bg-zinc-50 p-3"><strong>{t('admin.refused')}</strong> {item.q} <span className="text-zinc-600">({item.reason})</span></li>)}
                    {escalated.map((event) => <li key={event.id} className="rounded-xl bg-amber-50 p-3"><strong>{t('admin.escalated')}</strong> {String(event.data.reason || 'staff')} <span className="text-zinc-600">({String(event.data.screen || '')})</span></li>)}
                    {app.events.filter((event) => event.type === 'scam_check').map((event) => <li key={event.id} className="rounded-xl bg-red-50 p-3"><strong>{t('admin.scam')}</strong> {String(event.data.trigger)} · {String(event.data.result)} · {String(event.data.screen || '')}</li>)}
                  </ul>
                </section>
                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <h2 className="mb-2 text-lg font-semibold">{t('admin.broken')}</h2>
                  <ul className="space-y-2">
                    {missing.map((item, index) => {
                      const def = guideById(item.guideId)
                      const title = def ? named(t, def.title, item.guideId) : item.guideId
                      const stepIndex = def?.steps.findIndex((step) => step.id === item.stepId) ?? -1
                      return <li key={`${item.element}-${index}`} className="rounded-xl bg-rose-50 p-3">{t('admin.brokenLine', { guide: title, step: stepIndex >= 0 ? stepIndex + 1 : 1 })}</li>
                    })}
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
                          <p className="font-semibold">{request.customerName || 'Customer'} · {request.ref}</p>
                          <p className="mt-1 text-sm">{english}</p>
                          {local !== english && <p className="mt-1 text-sm text-zinc-600">{local}</p>}
                          <div className="mt-2 flex gap-2">
                            <button type="button" className="min-h-11 rounded-lg border border-zinc-300 px-3" onClick={() => app.setRequestStatus(request.ref, 'in_progress')}>{t('admin.markProgress')}</button>
                            <button type="button" className="min-h-11 rounded-lg bg-[#E30613] px-3 font-semibold text-white" onClick={() => app.setRequestStatus(request.ref, 'replied')}>{t('admin.markReplied')}</button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </>
            )}
            {section === 'settings' && (
              <section className="max-w-xl space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <h2 className="text-lg font-semibold">Desk settings</h2>
                <p className="text-sm text-zinc-600">{t('admin.note')}</p>
                <ul className="space-y-2 text-sm">
                  <li className="rounded-xl bg-zinc-50 p-3">{t('admin.largeText', { n: Math.round((large / withYou) * 100) })}</li>
                  <li className="rounded-xl bg-zinc-50 p-3">{t('admin.readAloud', { n: Math.round((aloud / withYou) * 100) })}</li>
                  <li className="rounded-xl bg-zinc-50 p-3">{t('admin.highContrast', { n: Math.round((contrast / withYou) * 100) })}</li>
                  <li className="rounded-xl bg-zinc-50 p-3">{t('admin.colourMode', { n: Math.round((cvd / withYou) * 100) })}</li>
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 rounded-lg bg-[#E30613] px-4 font-semibold text-white" onClick={exportCsv}>{t('admin.export')}</button>
                  <Link to="/" className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 font-semibold">{t('admin.back')}</Link>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </article>
  )
}

function Badge({ children, tone }: { children: string; tone: 'high' | 'normal' | 'wait' | 'progress' | 'done' | 'sample' }) {
  const toneClass = {
    high: 'bg-red-50 text-[#9f1239]',
    normal: 'bg-zinc-100 text-zinc-700',
    wait: 'bg-amber-50 text-amber-800',
    progress: 'bg-sky-50 text-sky-800',
    done: 'bg-emerald-50 text-emerald-800',
    sample: 'bg-zinc-100 text-zinc-600',
  }[tone]
  return <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass}`}>{children}</span>
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'in_progress') return t('admin.inProgress')
  if (status === 'replied') return t('admin.replied')
  return t('admin.received')
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

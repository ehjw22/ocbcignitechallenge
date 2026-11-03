import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Activity, BarChart3, Bell, BookOpen, CheckCircle2, Clock, Headphones, LayoutDashboard, MessageSquare,
  Search, Settings, Users, Volume2, Eye, Type, Phone, Send, StickyNote, Circle,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { FUNNELS, SEED_ERRORS, SEED_QUESTIONS, SEED_REFUSED } from '@/data/seed'
import { chartPalette } from '@/data/bank'
import { translate } from '@/i18n'
import { guideById } from '@/lib/guide'
import { loadRiskConfig, saveRiskConfig } from '@/lib/transferRisk'
import { languageById } from '@/lib/languages'
import type { StaffRequest } from '@/lib/types'

type Section = 'overview' | 'queue' | 'chats' | 'customers' | 'journeys' | 'analytics' | 'settings'
type Priority = 'High' | 'Med' | 'Low'
type Tone = 'high' | 'med' | 'low' | 'wait' | 'progress' | 'done' | 'sample' | 'lang'
type Note = { id: string; at: string; text: string }

type QueueRow = {
  id: string
  ticket: string
  name: string
  age: number
  segment: string
  nric: string
  language: string
  chinese: boolean
  needs: string[]
  topic: string
  stepLabel: string
  stepIndex: number
  stepTotal: number
  journeyId: string
  source: 'Ollie handoff' | 'Guided journey' | 'Message staff'
  waitSec: number
  priority: Priority
  status: 'received' | 'in_progress' | 'replied'
  sample: boolean
  summary: string
  stuck: string
  nextStep: string
  transcript: string
  createdAt: string
  request?: StaffRequest
}

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'queue', label: 'Customer queue', icon: Users },
  { id: 'chats', label: 'Live chats', icon: MessageSquare },
  { id: 'customers', label: 'Customers', icon: Headphones },
  { id: 'journeys', label: 'Guided journeys', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const FILTERS = ['All', 'Waiting', 'In progress', 'High priority', 'Chinese speakers'] as const

function ago(iso: string) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  return `${Math.round(min / 60)} hr ago`
}

function formatWait(sec: number) {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return `${m}m ${String(r).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function statusText(status: QueueRow['status']) {
  if (status === 'in_progress') return 'In progress'
  if (status === 'replied') return 'Resolved'
  return 'Waiting'
}

function languageLabel(code: string, cantonese: boolean) {
  if (cantonese) return 'Cantonese'
  if (code === 'zh') return 'Mandarin'
  if (code === 'zh-TW') return 'Traditional Chinese'
  if (code === 'ms') return 'Malay'
  if (code === 'ta') return 'Tamil'
  return languageById(code).english || 'English'
}

function sample(partial: Omit<QueueRow, 'createdAt' | 'waitSec'> & { waitSec: number }): QueueRow {
  return { ...partial, createdAt: new Date(Date.now() - partial.waitSec * 1000).toISOString() }
}

const SAMPLES: QueueRow[] = [
  sample({
    id: 'sample-mei', ticket: 'OCBC-18421', name: 'Auntie Mei', age: 67, segment: 'Premier', nric: 'S****452G',
    language: 'Cantonese', chinese: true, needs: ['Large text', 'Read aloud'], topic: 'Overseas transfer',
    stepLabel: 'Account number', stepIndex: 4, stepTotal: 7, journeyId: 'overseas', source: 'Ollie handoff',
    waitSec: 372, priority: 'High', status: 'received', sample: true,
    summary: 'Auntie Mei is sending money to her son in Australia and stopped on the account number.',
    stuck: 'The account number field was highlighted, but she was unsure which digits to enter.',
    nextStep: 'Read the account number back and continue to the amount.',
    transcript: 'Customer: I want to send money to my son in Australia.\nOllie: This is the overseas transfer. Enter the account number from his bank letter. Nothing is sent until you confirm.\nCustomer: Can someone check the number with me?',
  }),
  sample({
    id: 'sample-arif', ticket: 'OCBC-18408', name: 'Arif', age: 22, segment: 'FRANK', nric: 'T****118J',
    language: 'English', chinese: false, needs: ['Spending insights'], topic: 'Spending insights',
    stepLabel: 'Monthly chart', stepIndex: 2, stepTotal: 4, journeyId: 'goal', source: 'Guided journey',
    waitSec: 125, priority: 'Low', status: 'received', sample: true,
    summary: 'Arif opened spending insights and asked what the monthly chart is comparing.',
    stuck: 'He paused on the chart after the second step of the guided tour.',
    nextStep: 'Explain that the chart uses sample transactions, then offer to continue the tour.',
    transcript: 'Customer: What is this chart showing?\nOllie: This is your spending screen. The amounts are sample transactions from this demo.',
  }),
  sample({
    id: 'sample-tan', ticket: 'OCBC-18390', name: 'Tan Wei Ming', age: 54, segment: 'Personal', nric: 'S****903D',
    language: 'English', chinese: false, needs: [], topic: 'PayNow',
    stepLabel: 'Amount', stepIndex: 2, stepTotal: 4, journeyId: 'paynow', source: 'Ollie handoff',
    waitSec: 200, priority: 'Med', status: 'in_progress', sample: true,
    summary: 'Tan Wei Ming is paying a mobile number and wants the name check confirmed.',
    stuck: 'Name check returned TAN W** M***. He wants a person to confirm it is the right Tan.',
    nextStep: 'Confirm the masked name and stay on the line while he reviews the amount.',
    transcript: 'Customer: Is this the right Tan Wei Ming?\nOllie: The demo name check shows TAN W** M***. Please review it before you continue.',
  }),
  sample({
    id: 'sample-siti', ticket: 'OCBC-18377', name: 'Siti Rahman', age: 41, segment: 'Personal', nric: 'S****226H',
    language: 'Malay', chinese: false, needs: ['Read aloud'], topic: 'Bill payment',
    stepLabel: 'Bill reference', stepIndex: 2, stepTotal: 4, journeyId: 'bill', source: 'Guided journey',
    waitSec: 520, priority: 'Med', status: 'received', sample: true,
    summary: 'Siti is paying SP Group and stopped while reading the bill reference aloud.',
    stuck: 'The reference has 10 digits and she asked for them to be read slowly.',
    nextStep: 'Read 1002 0030 04 and wait for her to repeat it.',
    transcript: 'Customer: Boleh baca nombor bil ini?\nOllie: The sample reference is 1002003004. I can read it one group at a time.',
  }),
  sample({
    id: 'sample-lim', ticket: 'OCBC-18361', name: 'Lim Hui Ying', age: 73, segment: 'Premier', nric: 'S****014C',
    language: 'Mandarin', chinese: true, needs: ['Large text', 'Read aloud'], topic: 'Card lock',
    stepLabel: 'Lock card', stepIndex: 2, stepTotal: 3, journeyId: 'card-lock', source: 'Ollie handoff',
    waitSec: 665, priority: 'High', status: 'received', sample: true,
    summary: 'Lim Hui Ying wants her credit card locked after a charge she does not recognise.',
    stuck: 'She reached the lock switch and asked for a person before turning it on.',
    nextStep: 'Lock the 365 Credit Card with her, then give the fraud hotline.',
    transcript: 'Customer: 这张卡不是我用的。\nOllie: I can show you how to lock the card in this demo. No real card is changed. A person can stay with you.',
  }),
  sample({
    id: 'sample-david', ticket: 'OCBC-18340', name: 'David Koh', age: 29, segment: 'FRANK', nric: 'S****775B',
    language: 'English', chinese: false, needs: [], topic: 'GIRO setup',
    stepLabel: 'Review', stepIndex: 4, stepTotal: 4, journeyId: 'giro', source: 'Guided journey',
    waitSec: 75, priority: 'Low', status: 'replied', sample: true,
    summary: 'David finished the GIRO practice and asked for the debit day to be repeated.',
    stuck: 'He had already reached the review step when he asked for a callback.',
    nextStep: 'No further action. The practice GIRO was not set up on a real account.',
    transcript: 'Customer: Just confirm the debit is on the 15th.\nOllie: In this practice, the debit day is the 15th. Nothing is sent to a billing organisation.',
  }),
  sample({
    id: 'sample-nurul', ticket: 'OCBC-18322', name: 'Nurul Aisyah', age: 36, segment: 'Personal', nric: 'S****558K',
    language: 'English', chinese: false, needs: ['Colour vision'], topic: 'Local transfer',
    stepLabel: 'Account number', stepIndex: 3, stepTotal: 4, journeyId: 'transfer', source: 'Ollie handoff',
    waitSec: 290, priority: 'Med', status: 'in_progress', sample: true,
    summary: 'Nurul is transferring to DBS and asked for the account field to be described without relying on colour.',
    stuck: 'She uses a colour-vision setting and could not tell the error state from the red outline alone.',
    nextStep: 'Read the error text and stay while she corrects the 10-digit account number.',
    transcript: 'Customer: I cannot tell which field is wrong from the colour.\nOllie: The account number needs 10 digits. The message under the field says how many are there now.',
  }),
]

function liveRow(request: StaffRequest, topic: string): QueueRow {
  const waitSec = Math.max(1, Math.round((Date.now() - new Date(request.createdAt).getTime()) / 1000))
  const cantonese = Boolean(request.needs?.includes('Cantonese') || request.summary.includes('Cantonese'))
  const needs = (request.needs || '').split(',').map((item) => item.trim()).filter((item) => item && item !== 'None recorded')
  const guide = guideById(request.task)
  const stepIndex = guide ? Math.max(1, (guide.steps.findIndex((step) => step.id === request.step) + 1) || 1) : 1
  const stepTotal = guide?.steps.length || 1
  return {
    id: request.ref,
    ticket: request.ref,
    name: request.customerName || 'Named customer',
    age: 0,
    segment: 'Personal',
    nric: 'Not on file',
    language: languageLabel(request.language, cantonese),
    chinese: cantonese || request.language === 'zh' || request.language === 'zh-TW',
    needs,
    topic,
    stepLabel: request.step || 'Handoff',
    stepIndex,
    stepTotal,
    journeyId: guide ? request.task : 'overseas',
    source: request.urgent ? 'Ollie handoff' : 'Message staff',
    waitSec,
    priority: request.urgent || /fraud|scam|lost/i.test(request.summary) ? 'High' : waitSec < 180 ? 'Low' : 'Med',
    status: request.status,
    sample: false,
    summary: request.summary,
    stuck: request.step ? `Paused at ${request.step}.` : 'Asked for a person from the current screen.',
    nextStep: 'Open the transcript, then join the chat or call back in their language.',
    transcript: request.transcript || request.summary,
    createdAt: request.createdAt,
    request,
  }
}

export function Admin() {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ocbc-admin') === '1')
  const [password, setPassword] = useState('')
  const [section, setSection] = useState<Section>('overview')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [sort, setSort] = useState<{ key: 'wait' | 'name' | 'priority'; dir: 'asc' | 'desc' }>({ key: 'wait', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'Overview' | 'Ollie conversation' | 'Journey progress' | 'Activity' | 'Notes'>('Overview')
  const [notes, setNotes] = useState<Record<string, Note[]>>({})
  const [noteDraft, setNoteDraft] = useState('')
  const [localStatus, setLocalStatus] = useState<Record<string, QueueRow['status']>>({})
  const [assignee, setAssignee] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [serviceError, setServiceError] = useState('')
  const [guide, setGuide] = useState('overseas')
  const [from, setFrom] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [navOpen, setNavOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const [headerH, setHeaderH] = useState(72)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const sync = () => setHeaderH(el.offsetHeight)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [authed])

  const checkService = () => {
    setServiceError('')
    fetch('/api/assistant')
      .then((res) => {
        if (!res.ok) throw new Error('status')
        return res.json()
      })
      .then((data: { configured?: boolean }) => {
        if (!data.configured) setServiceError('Ollie is not configured on this desk. Queue and customer records are still available.')
      })
      .catch(() => setServiceError('The assistant service did not respond. Queue and customer records are still available.'))
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450)
    checkService()
    return () => window.clearTimeout(timer)
  }, [])

  const palette = chartPalette('default')

  const rows = useMemo(() => {
    const labelFor = (key: string, fallback: string) => {
      const label = translate(app.prefs.language, key)
      return label === key ? fallback : label
    }
    const live = app.requests
      .filter((request) => request.customerName && Date.now() - new Date(request.createdAt).getTime() < 12 * 60 * 60 * 1000)
      .map((request) => liveRow(request, labelFor(`staff.topic.${request.task}`, request.task)))
    const samples = SAMPLES.filter((row) => !live.some((item) => item.name === row.name))
    return [...live, ...samples].map((row) => ({ ...row, status: localStatus[row.id] || row.status }))
  }, [app.requests, app.prefs.language, localStatus])

  const inRange = (iso: string) => iso.slice(0, 10) >= from && iso.slice(0, 10) <= to
  const ranged = rows.filter((row) => inRange(row.createdAt))
  const searched = ranged.filter((row) => `${row.name} ${row.nric} ${row.ticket} ${row.topic}`.toLowerCase().includes(query.trim().toLowerCase()))
  const filtered = searched.filter((row) => {
    if (section === 'chats') return row.status === 'in_progress'
    if (filter === 'Waiting') return row.status === 'received'
    if (filter === 'In progress') return row.status === 'in_progress'
    if (filter === 'High priority') return row.priority === 'High'
    if (filter === 'Chinese speakers') return row.chinese
    return true
  })
  const priorityRank = { High: 0, Med: 1, Low: 2 }
  const statusRank = { received: 0, in_progress: 1, replied: 2 }
  const sorted = [...filtered].sort((a, b) => {
    if (a.sample !== b.sample) return a.sample ? 1 : -1
    const dir = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'name') return a.name.localeCompare(b.name) * dir
    if (sort.key === 'priority') return (priorityRank[a.priority] - priorityRank[b.priority]) * dir
    const status = statusRank[a.status] - statusRank[b.status]
    if (status) return status
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const pageSize = 5
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const selected = rows.find((row) => row.id === selectedId) || null
  const waiting = ranged.filter((row) => row.status === 'received')
  const resolved = ranged.filter((row) => row.status === 'replied').length
  const pageFrom = sorted.length ? page * pageSize + 1 : 0
  const pageTo = Math.min(sorted.length, page * pageSize + visible.length)
  const avgSec = ranged.length ? Math.round(ranged.reduce((sum, row) => sum + row.waitSec, 0) / ranged.length) : 0
  const started = Object.values(FUNNELS).reduce((sum, steps) => sum + steps[0].reached, 0) + app.events.filter((event) => event.type === 'guide_started').length
  const completed = Object.values(FUNNELS).reduce((sum, steps) => sum + steps[steps.length - 1].reached, 0) + app.events.filter((event) => event.type === 'guide_completed').length
  const selfServe = started ? Math.round((completed / started) * 100) : 64

  const hourly = Array.from({ length: 12 }, (_, index) => {
    const hour = (new Date().getHours() - 11 + index + 24) % 24
    const base = [3, 4, 6, 5, 8, 11, 9, 7, 6, 8, 5, 4][index]
    const live = rows.filter((row) => !row.sample && new Date(row.createdAt).getHours() === hour).length
    return { name: `${String(hour).padStart(2, '0')}:00`, value: base + live }
  })
  const topicBase: Record<string, number> = {
    PayNow: 27,
    'Overseas transfer': 18,
    'Local transfer': 16,
    'Bill payment': 14,
    'GIRO setup': 11,
    'Card lock': 9,
    'Spending insights': 6,
  }
  const topics = Object.entries(topicBase)
    .map(([name, base]) => ({ name, value: base + ranged.filter((row) => row.topic === name && !row.sample).length }))
    .sort((a, b) => b.value - a.value)
  const languages = Object.entries(ranged.reduce<Record<string, number>>((map, row) => {
    map[row.language] = (map[row.language] || 0) + 1
    return map
  }, {})).map(([name, value]) => ({ name, value }))
  const feed = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)

  const mark = (row: QueueRow, status: QueueRow['status']) => {
    if (row.request) app.setRequestStatus(row.request.ref, status)
    setLocalStatus((current) => ({ ...current, [row.id]: status }))
  }
  const addNote = (row: QueueRow, text: string) => {
    const note = { id: `${Date.now()}`, at: new Date().toISOString(), text }
    setNotes((current) => ({ ...current, [row.id]: [...(current[row.id] || []), note] }))
  }
  const openRow = (row: QueueRow) => {
    setSelectedId(row.id)
    setTab('Overview')
  }
  const toggleSort = (key: typeof sort.key) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' })
  }

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef1f4] p-6 text-zinc-900" style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
        <form className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); sessionStorage.setItem('ocbc-admin', '1'); setAuthed(true) }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E30613]">OCBC</p>
          <h1 className="text-2xl font-semibold">Staff console</h1>
          <p className="text-sm text-zinc-600">{t('admin.demoLogin')}</p>
          <label className="block text-sm font-medium" htmlFor="admin-pass">
            {t('admin.password')}
            <input id="admin-pass" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3" />
          </label>
          <button type="submit" className="h-11 w-full rounded-lg bg-[#E30613] text-sm font-semibold text-white">{t('admin.signIn')}</button>
          <Link to="/" className="block text-center text-sm font-semibold text-[#0b4f9e] underline">{t('admin.back')}</Link>
        </form>
      </div>
    )
  }

  const title = NAV.find((item) => item.id === section)?.label || 'Overview'
  const showTable = section === 'overview' || section === 'queue' || section === 'chats'

  return (
    <div className="min-h-dvh bg-[#eef1f4] text-zinc-900" style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div className="flex min-h-dvh">
        <aside className={`${navOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'} w-60 shrink-0 flex-col bg-[#1b2430] text-zinc-100 lg:sticky lg:top-0 lg:flex lg:h-dvh`}>
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-lg font-bold tracking-wide text-white">OCBC</p>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">Staff Console</p>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = section === item.id
              return (
                <button key={item.id} type="button" className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm ${active ? 'bg-[#E30613] text-white' : 'text-zinc-300 hover:bg-white/5'}`} onClick={() => { setSection(item.id); setPage(0); setNavOpen(false) }}>
                  <Icon size={16} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'queue' && waiting.length > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{waiting.length}</span>}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E30613] text-xs font-semibold">PT</span>
              <span className="min-w-0 text-sm leading-tight">
                <strong className="block truncate">Priya Tan</strong>
                <span className="text-xs text-zinc-400">Customer Service Officer</span>
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400"><Circle size={8} className="fill-emerald-400 text-emerald-400" aria-hidden /> Online · Tampines branch</p>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header ref={headerRef} className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
            <button type="button" className="h-10 rounded-lg border border-zinc-300 px-3 text-sm lg:hidden" onClick={() => setNavOpen(true)}>Menu</button>
            <div className="min-w-[10rem]">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Staff console / {title}</p>
              <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            </div>
            <label className="relative min-w-[16rem] flex-1">
              <span className="sr-only">Search customer name, NRIC, ticket ID</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search customer name, NRIC, ticket ID" className="h-10 w-full rounded-lg border border-zinc-300 pl-9 pr-3 text-sm" />
            </label>
            <label className="text-xs text-zinc-500">
              From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-1 h-10 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-500">
              To
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-1 h-10 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-900" />
            </label>
            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-lg border border-zinc-300" aria-label={`${waiting.length} waiting`} onClick={() => setSection('queue')}>
              <Bell size={16} aria-hidden />
              {waiting.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#E30613] px-1 text-[10px] font-semibold text-white">{waiting.length}</span>}
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><Circle size={8} className="fill-emerald-500 text-emerald-500" aria-hidden /> Live</span>
          </header>
          {navOpen && <button type="button" className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
          <main className="space-y-4 p-4">
            {serviceError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
                <span>{serviceError}</span>
                <button type="button" className="h-9 rounded-lg border border-red-300 px-3 font-semibold" onClick={checkService}>Retry</button>
              </div>
            )}
            {section === 'overview' && (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Kpi label="Customers waiting" value={String(waiting.length)} trend={waiting.length ? '+2' : '0'} up={false} />
                <Kpi label="Avg wait time" value={formatWait(avgSec)} trend="8%" up={false} good />
                <Kpi label="Resolved today" value={String(resolved)} trend="+1" up />
                <Kpi label="Ollie self-service rate" value={`${selfServe}%`} trend="+3%" up />
                <Kpi label="Satisfaction score" value="4.6" trend="+0.2" up />
              </section>
            )}
            {showTable && (
              <section className={`grid gap-4 ${section === 'overview' ? 'xl:grid-cols-[minmax(0,1fr)_18rem]' : ''}`}>
                <article className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
                    <h2 className="font-semibold">{section === 'chats' ? 'Live chats' : 'Live assistance queue'}</h2>
                    <p className="text-xs text-zinc-500">{sorted.length ? `Showing ${pageFrom}–${pageTo} of ${sorted.length}` : 'No rows'} · {waiting.length} waiting</p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto px-4 py-2">
                    {FILTERS.map((item) => (
                      <button key={item} type="button" className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${filter === item ? 'bg-[#E30613] text-white' : 'bg-zinc-100 text-zinc-700'}`} onClick={() => { setFilter(item); setPage(0) }}>{item}</button>
                    ))}
                  </div>
                  {loading ? <Skeleton /> : sorted.length === 0 ? (
                    <p className="p-8 text-sm text-zinc-600">No customers match this search or filter.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          <tr>
                            {([
                              ['Ticket', null],
                              ['Customer', 'name'],
                              ['Language', null],
                              ['Needs', null],
                              ['Topic', null],
                              ['Source', null],
                              ['Wait', 'wait'],
                              ['Priority', 'priority'],
                              ['Status', null],
                              ['Actions', null],
                            ] as const).map(([label, key]) => (
                              <th key={label} className={`px-3 py-2 ${label === 'Needs' ? 'hidden min-[1400px]:table-cell' : ''} ${label === 'Source' ? 'hidden min-[1366px]:table-cell' : ''}`}>
                                {key ? <button type="button" className="uppercase tracking-wide" onClick={() => toggleSort(key)}>{label}</button> : label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((row) => (
                            <tr key={row.id} className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50" onClick={() => openRow(row)}>
                              <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">{row.ticket}</td>
                              <td className="px-3 py-3">
                                <span className="flex items-center gap-2">
                                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-200 text-xs font-semibold">{initials(row.name)}</span>
                                  <span>
                                    <span className="block font-semibold">{row.name}</span>
                                    {row.sample && <Badge tone="sample">Sample data</Badge>}
                                  </span>
                                </span>
                              </td>
                              <td className="px-3 py-3"><Badge tone="lang">{row.language}</Badge></td>
                              <td className="hidden px-3 py-3 min-[1400px]:table-cell"><NeedChips needs={row.needs} /></td>
                              <td className="max-w-[220px] px-3 py-3"><span className="line-clamp-2">{row.sample ? row.topic : (row.summary || row.topic).slice(0, 60)}</span><span className="block text-xs text-zinc-500">step {row.stepIndex} of {row.stepTotal}</span></td>
                              <td className="hidden px-3 py-3 min-[1366px]:table-cell">{row.source}</td>
                              <td className="px-3 py-3 tabular-nums">{formatWait(row.waitSec)}</td>
                              <td className="px-3 py-3"><Badge tone={row.priority === 'High' ? 'high' : row.priority === 'Med' ? 'med' : 'low'}>{row.priority}</Badge></td>
                              <td className="px-3 py-3"><Badge tone={row.status === 'replied' ? 'done' : row.status === 'in_progress' ? 'progress' : 'wait'}>{statusText(row.status)}</Badge></td>
                              <td className="px-3 py-3">
                                <span className="flex gap-1">
                                  <button type="button" className="h-8 rounded-md border border-zinc-300 px-2 text-xs font-semibold" onClick={(event) => { event.stopPropagation(); setAssignee((current) => ({ ...current, [row.id]: 'Priya Tan' })); mark(row, 'in_progress'); openRow(row) }}>Assign to me</button>
                                  <button type="button" className="h-8 rounded-md bg-[#E30613] px-2 text-xs font-semibold text-white" onClick={(event) => { event.stopPropagation(); openRow(row) }}>Open</button>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm">
                    <span className="text-zinc-500">Page {page + 1} of {pages}</span>
                    <span className="flex gap-2">
                      <button type="button" className="h-8 rounded-md border border-zinc-300 px-3 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
                      <button type="button" className="h-8 rounded-md border border-zinc-300 px-3 disabled:opacity-40" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
                    </span>
                  </div>
                </article>
                {section === 'overview' && (
                  <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <h2 className="flex items-center gap-2 font-semibold"><Activity size={16} aria-hidden /> Activity</h2>
                    <ul className="mt-3 space-y-3">
                      {feed.map((row) => (
                        <li key={row.id} className="text-sm leading-snug">
                          <button type="button" className="text-left hover:underline" onClick={() => openRow(row)}>
                            <strong>{row.name}</strong> requested help with {row.topic}
                          </button>
                          <span className="mt-0.5 block text-xs text-zinc-500">{ago(row.createdAt)}{row.sample ? ' · Sample data' : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
              </section>
            )}
            {section === 'overview' && (
              <section className="grid items-start gap-4 lg:grid-cols-3">
                <ChartCard title="Requests per hour">
                  <ChartFrame>
                    {(width, height) => (
                      <LineChart width={width} height={height} data={hourly}>
                        <CartesianGrid stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                        <Tooltip />
                        <Line dataKey="value" stroke="#E30613" strokeWidth={2} dot={false} />
                      </LineChart>
                    )}
                  </ChartFrame>
                </ChartCard>
                <ChartCard title="Top issue topics">
                  <ChartFrame>
                    {(width, height) => (
                      <BarChart width={width} height={height} data={topics} layout="vertical" margin={{ left: 8, right: 12 }}>
                        <CartesianGrid stroke="#eee" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1b2430" radius={4} barSize={14} />
                      </BarChart>
                    )}
                  </ChartFrame>
                </ChartCard>
                <ChartCard title="Language split">
                  <ChartFrame height={180}>
                    {(width, height) => (
                      <PieChart width={width} height={height}>
                        <Pie data={languages} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} cx="50%" cy="50%">
                          {languages.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    )}
                  </ChartFrame>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600">{languages.map((item) => <li key={item.name} className="flex justify-between"><span>{item.name}</span><span className="tabular-nums">{item.value}</span></li>)}</ul>
                </ChartCard>
              </section>
            )}
            {section === 'customers' && (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sorted.length === 0 && <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm">No customers match this search.</p>}
                {sorted.map((row) => (
                  <button key={row.id} type="button" className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-[#E30613]" onClick={() => openRow(row)}>
                    <span className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-200 text-sm font-semibold">{initials(row.name)}</span>
                      <span>
                        <strong className="block">{row.name}</strong>
                        <span className="text-xs text-zinc-500">{row.segment}{row.age ? ` · ${row.age}` : ''} · {row.language}</span>
                      </span>
                    </span>
                    <p className="mt-3 text-sm">{row.topic}</p>
                    {row.sample && <span className="mt-2 inline-flex"><Badge tone="sample">Sample data</Badge></span>}
                  </button>
                ))}
              </section>
            )}
            {section === 'journeys' && <JourneyPanel guide={guide} setGuide={setGuide} palette={palette} events={app.events} />}
            {section === 'analytics' && <AnalyticsPanel palette={palette} events={app.events} />}
            {section === 'settings' && <SettingsPanel onExport={() => exportCsv(app.events, app.requests)} />}
          </main>
        </div>
      </div>
      {selected && (
        <div className="fixed bottom-0 right-0 z-40 flex justify-end bg-black/40 lg:left-60" style={{ top: headerH }} onClick={() => setSelectedId(null)}>
        <CustomerDrawer
          row={selected}
          tab={tab}
          setTab={setTab}
          notes={notes[selected.id] || []}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          assignee={assignee[selected.id]}
          onClose={() => setSelectedId(null)}
          onAssign={() => { setAssignee((current) => ({ ...current, [selected.id]: 'Priya Tan' })); mark(selected, 'in_progress') }}
          onResolve={() => mark(selected, 'replied')}
          onNote={(text) => addNote(selected, text)}
        />
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, trend, up, good = up }: { label: string; value: string; trend: string; up: boolean; good?: boolean }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${good ? 'text-emerald-700' : 'text-amber-700'}`}>{up ? '▲' : '▼'} {trend} vs yesterday</p>
    </article>
  )
}

function Badge({ children, tone }: { children: string; tone: Tone }) {
  const toneClass = {
    high: 'bg-red-50 text-[#9f1239]',
    med: 'bg-amber-50 text-amber-800',
    low: 'bg-zinc-100 text-zinc-700',
    wait: 'bg-amber-50 text-amber-800',
    progress: 'bg-sky-50 text-sky-800',
    done: 'bg-emerald-50 text-emerald-800',
    sample: 'bg-zinc-100 text-zinc-600',
    lang: 'bg-slate-100 text-slate-800',
  }[tone]
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{children}</span>
}

function NeedChips({ needs }: { needs: string[] }) {
  if (!needs.length) return <span className="text-xs text-zinc-500">Standard</span>
  const icon = (need: string) => {
    if (need.toLowerCase().includes('aloud')) return Volume2
    if (need.toLowerCase().includes('text')) return Type
    if (need.toLowerCase().includes('colour') || need.toLowerCase().includes('color')) return Eye
    return CheckCircle2
  }
  return (
    <span className="flex flex-wrap gap-1">
      {needs.map((need) => {
        const Icon = icon(need)
        return <span key={need} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700"><Icon size={12} aria-hidden />{need}</span>
      })}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading queue">
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-zinc-100" />)}
    </div>
  )
}

function ChartFrame({ children, height = 240 }: { children: (width: number, height: number) => ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sync = () => setWidth(Math.max(0, Math.floor(el.clientWidth)))
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 ? children(width, height) : null}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
      <p className="mt-1 text-[11px] text-zinc-400">Includes sample volume</p>
    </article>
  )
}

function CustomerDrawer({
  row, tab, setTab, notes, noteDraft, setNoteDraft, assignee, onClose, onAssign, onResolve, onNote,
}: {
  row: QueueRow
  tab: 'Overview' | 'Ollie conversation' | 'Journey progress' | 'Activity' | 'Notes'
  setTab: (tab: 'Overview' | 'Ollie conversation' | 'Journey progress' | 'Activity' | 'Notes') => void
  notes: Note[]
  noteDraft: string
  setNoteDraft: (value: string) => void
  assignee?: string
  onClose: () => void
  onAssign: () => void
  onResolve: () => void
  onNote: (text: string) => void
}) {
  const guide = guideById(row.journeyId)
  const steps = guide?.steps || []
  return (
    <article className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl" role="dialog" aria-labelledby="customer-title" onClick={(event) => event.stopPropagation()}>
        <header className="border-b border-zinc-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{row.ticket}{assignee ? ` · ${assignee}` : ''}</p>
              <h2 id="customer-title" className="text-xl font-semibold">{row.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">{[row.age ? `${row.age}` : '', row.segment, row.language].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="done">Verified</Badge>
              <button type="button" className="h-9 rounded-lg border border-zinc-300 px-3 text-sm" onClick={onClose}>Close</button>
            </div>
          </div>
          <div className="mt-3"><NeedChips needs={row.needs} /></div>
          {row.sample && <p className="mt-2 text-xs text-zinc-500">Sample data</p>}
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3">
          {(['Overview', 'Ollie conversation', 'Journey progress', 'Activity', 'Notes'] as const).map((item) => (
            <button key={item} type="button" className={`h-10 shrink-0 border-b-2 px-2 text-sm font-medium ${tab === item ? 'border-[#E30613] text-[#9f1239]' : 'border-transparent text-zinc-600'}`} onClick={() => setTab(item)}>{item}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {tab === 'Overview' && (
            <>
              <section className="rounded-xl border border-zinc-200 p-3">
                <h3 className="text-sm font-semibold">Ollie handoff</h3>
                <p className="mt-2 text-sm"><strong>Asked. </strong>{row.summary}</p>
                <p className="mt-2 text-sm"><strong>Stuck. </strong>{row.stuck}</p>
                <p className="mt-2 text-sm"><strong>Suggested next step. </strong>{row.nextStep}</p>
              </section>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-zinc-50 p-2"><dt className="text-xs text-zinc-500">NRIC</dt><dd>{row.nric}</dd></div>
                <div className="rounded-lg bg-zinc-50 p-2"><dt className="text-xs text-zinc-500">Source</dt><dd>{row.source}</dd></div>
                <div className="rounded-lg bg-zinc-50 p-2"><dt className="text-xs text-zinc-500">Wait</dt><dd>{formatWait(row.waitSec)}</dd></div>
                <div className="rounded-lg bg-zinc-50 p-2"><dt className="text-xs text-zinc-500">Status</dt><dd>{statusText(row.status)}</dd></div>
              </dl>
            </>
          )}
          {tab === 'Ollie conversation' && (
            <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed">{row.transcript}</pre>
          )}
          {tab === 'Journey progress' && (
            <ol className="space-y-2">
              {(steps.length ? steps : Array.from({ length: row.stepTotal }, (_, index) => ({ id: String(index), title: `Step ${index + 1}` }))).map((step, index) => {
                const current = index + 1 === row.stepIndex
                const done = index + 1 < row.stepIndex
                return (
                  <li key={step.id} className={`rounded-lg border px-3 py-2 text-sm ${current ? 'border-[#E30613] bg-red-50' : 'border-zinc-200'}`}>
                    <span className="font-semibold">{done ? 'Done' : current ? 'Stopped here' : 'Not started'}</span>
                    <span className="mt-0.5 block">{step.title.includes('.') ? translate('en', step.title) : step.title}</span>
                    {current && <span className="text-xs text-zinc-600">{row.stepLabel}</span>}
                  </li>
                )
              })}
            </ol>
          )}
          {tab === 'Activity' && (
            <ul className="space-y-2 text-sm">
              <li className="rounded-lg bg-zinc-50 p-3">{row.name} requested help with {row.topic}. {ago(row.createdAt)}</li>
              {assignee && <li className="rounded-lg bg-zinc-50 p-3">Assigned to {assignee}.</li>}
              {notes.map((note) => <li key={note.id} className="rounded-lg bg-amber-50 p-3">{note.text}<span className="mt-1 block text-xs text-zinc-500">{ago(note.at)}</span></li>)}
            </ul>
          )}
          {tab === 'Notes' && (
            <div className="space-y-3">
              {notes.length === 0 && <p className="text-sm text-zinc-600">No internal notes yet.</p>}
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                    <p>{note.text}</p>
                    <p className="mt-1 text-xs text-zinc-500">{new Date(note.at).toLocaleString()} · Priya Tan</p>
                  </li>
                ))}
              </ul>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!noteDraft.trim()) return; onNote(noteDraft.trim()); setNoteDraft('') }}>
                <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add an internal note" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm" />
                <button type="submit" className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Save</button>
              </form>
            </div>
          )}
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t border-zinc-200 p-3">
          <button type="button" className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#E30613] text-sm font-semibold text-white" onClick={onAssign}><Headphones size={14} aria-hidden /> Join live chat</button>
          <button type="button" className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-zinc-300 text-sm font-semibold" onClick={() => onNote(`Call back in ${row.language}.`)}><Phone size={14} aria-hidden /> Call back</button>
          <Link to={`/flow/${row.journeyId}`} className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-zinc-300 text-sm font-semibold"><Send size={14} aria-hidden /> Send guided journey</Link>
          <button type="button" className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-zinc-300 text-sm font-semibold" onClick={() => setTab('Notes')}><StickyNote size={14} aria-hidden /> Add internal note</button>
          <button type="button" className="col-span-2 h-10 rounded-lg border border-zinc-300 text-sm font-semibold" onClick={onResolve}><CheckCircle2 size={14} className="mr-1 inline" aria-hidden /> Mark resolved</button>
        </footer>
      </article>
  )
}

function JourneyPanel({ guide, setGuide, palette, events }: { guide: string; setGuide: (id: string) => void; palette: string[]; events: { type: string; data: Record<string, string | number | boolean | null> }[] }) {
  const funnel = FUNNELS[guide] || []
  const def = guideById(guide)
  const data = funnel.map((step) => ({ name: step.step, value: step.reached }))
  const device = events.filter((event) => String(event.data.guideId || '') === guide).length
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Guided journey drop-off</h2>
        <label className="text-sm font-medium" htmlFor="guide">
          Journey
          <select id="guide" value={guide} onChange={(event) => setGuide(event.target.value)} className="ml-2 h-10 rounded-lg border border-zinc-300 px-2">
            {Object.keys(FUNNELS).map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </div>
      <ChartFrame height={260}>
        {(width, height) => (
          <BarChart width={width} height={height} data={data}>
            <CartesianGrid stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} width={32} />
            <Tooltip />
            <Bar dataKey="value">{data.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}</Bar>
          </BarChart>
        )}
      </ChartFrame>
      <p className="text-sm text-zinc-600">{def ? def.steps.length : 0} steps in this guide. {device} events recorded on this device.</p>
    </section>
  )
}

function AnalyticsPanel({ palette, events }: { palette: string[]; events: { id?: string; type: string; data: Record<string, string | number | boolean | null> }[] }) {
  const questions = new Map<string, number>(SEED_QUESTIONS.map((item) => [item.q, item.count]))
  events.filter((event) => event.type === 'ai_question').forEach((event) => {
    const q = String(event.data.question || '')
    if (q) questions.set(q, (questions.get(q) || 0) + Number(event.data.count || 1))
  })
  const errors = new Map<string, number>(SEED_ERRORS.map((item) => [item.code, item.count]))
  events.filter((event) => event.type === 'error_shown').forEach((event) => {
    const code = String(event.data.code || '')
    if (code) errors.set(code, (errors.get(code) || 0) + 1)
  })
  const bars = [...questions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.slice(0, 28), value }))
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Questions asked</h2>
        <ChartFrame>
          {(width, height) => (
            <BarChart width={width} height={height} data={bars} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={palette[0]} barSize={16} />
            </BarChart>
          )}
        </ChartFrame>
      </article>
      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Field errors</h2>
        <ul>
          {[...errors.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => (
            <li key={code} className="flex justify-between border-b border-zinc-100 py-2 text-sm"><span>{code.replaceAll('_', ' ')}</span><span className="tabular-nums">{count}</span></li>
          ))}
        </ul>
      </article>
      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="mb-2 font-semibold">Refused or escalated</h2>
        <ul className="space-y-2 text-sm">
          {SEED_REFUSED.map((item) => <li key={item.q} className="rounded-lg bg-zinc-50 p-3">{item.q} <span className="text-zinc-500">({item.reason})</span></li>)}
          {(['none', 'check', 'high'] as const).map((level) => {
            const rows = events.filter((event) => event.type === 'scam_check' && String(event.data.level || 'check') === level)
            return <li key={level} className="rounded-lg bg-zinc-50 p-3">Safety checks · {level}: {rows.length}</li>
          })}
          {events.filter((event) => event.type === 'scam_check').map((event, index) => (
            <li key={event.id || index} className="rounded-lg bg-red-50 p-3">Scam check · {String(event.data.level || 'check')} · {String(event.data.reasons || event.data.trigger)} · {String(event.data.answers || 'no answers')} · {String(event.data.result)}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

function SettingsPanel({ onExport }: { onExport: () => void }) {
  const [risk, setRisk] = useState(loadRiskConfig())
  const save = (key: keyof typeof risk, value: string) => {
    const next = saveRiskConfig({ [key]: Number(value) || 0 })
    setRisk(next)
  }
  return (
    <section className="max-w-xl space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Desk settings</h2>
      <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm">
        <p className="font-semibold">Transfer safety thresholds (SGD)</p>
        {([
          ['largeAmount', 'Any payee'],
          ['newPayeeAmount', 'New payee'],
          ['newPayee24hTotal', 'Same new payee in 24 hours'],
          ['tinyAmount', 'Ignore amounts below'],
          ['unusualMultiplier', 'Times the usual transfer'],
          ['coolingHighSeconds', 'High-risk wait (seconds)'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3">
            {label}
            <input className="h-9 w-24 rounded border border-zinc-300 px-2" inputMode="decimal" value={risk[key]} onChange={(event) => save(key, event.target.value)} />
          </label>
        ))}
      </div>
      <p className="text-sm text-zinc-600">This console uses the same handoff records as Talk to staff. Sample rows are labelled and are not live customers.</p>
      <ul className="space-y-2 text-sm">
        <li className="rounded-lg bg-zinc-50 p-3">Branch: Tampines · Desk OC-04</li>
        <li className="rounded-lg bg-zinc-50 p-3">Officer: Priya Tan, Customer Service Officer</li>
        <li className="rounded-lg bg-zinc-50 p-3">Queue window: requests from the last 12 hours, plus labelled samples</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-10 rounded-lg bg-[#E30613] px-4 text-sm font-semibold text-white" onClick={onExport}>Export CSV</button>
        <Link to="/" className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold">Back to app</Link>
      </div>
    </section>
  )
}

function exportCsv(events: { id: string; ts: string; type: string; data: Record<string, string | number | boolean | null> }[], requests: StaffRequest[]) {
  const rows = [
    ...events.map((event) => ({ kind: 'event', id: event.id, ts: event.ts, type: event.type, ...event.data })),
    ...requests.map((request) => ({ kind: 'staff', ref: request.ref, status: request.status, summary: request.summary, language: request.language, name: request.customerName || '' })),
  ]
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String((row as Record<string, unknown>)[header] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ocbc-staff-console.csv'
  link.click()
  URL.revokeObjectURL(url)
}

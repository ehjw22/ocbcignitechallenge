import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { ComparePane } from '@/components/ComparePane'
import { comparePhoneScale } from '@/components/ComparePhoneShell'
import {
  COMPARE_PERSONA_AGES,
  compareDemoUser,
  personaCustomSummary,
} from '@/lib/comparePersona'
import { COMPARE_STEPS, calloutsForStep } from '@/lib/compareSteps'
import { languageById } from '@/lib/languages'
import { setPresent } from '@/lib/present'

const MEI: 'auntiemei' = 'auntiemei'
const ARIF: 'arif' = 'arif'

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

function CalloutList({ items, accent }: { items: { text: string }[]; accent: string }) {
  return (
    <ul className="flex w-[min(200px,18vw)] flex-col justify-center gap-2 text-[0.8rem] leading-snug text-zinc-100">
      {items.map((item) => (
        <li
          key={item.text}
          className="rounded-lg border-l-4 bg-[#1a1f24]/90 px-3 py-2 shadow-md"
          style={{ borderColor: accent }}
        >
          {item.text}
        </li>
      ))}
    </ul>
  )
}

export function Compare() {
  const [index, setIndex] = useState(0)
  const viewport = useViewport()
  const step = COMPARE_STEPS[index]
  const scale = useMemo(() => comparePhoneScale(viewport.w, viewport.h), [viewport.w, viewport.h])
  const meiUser = compareDemoUser(MEI)
  const arifUser = compareDemoUser(ARIF)
  const meiSummary = personaCustomSummary(meiUser.prefs, languageById(meiUser.prefs.language).english)
  const arifSummary = personaCustomSummary(arifUser.prefs, languageById(arifUser.prefs.language).english)
  const meiCallouts = calloutsForStep(step.id, MEI)
  const arifCallouts = calloutsForStep(step.id, ARIF)
  const last = index >= COMPARE_STEPS.length - 1
  const first = index <= 0

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('present') === '1') setPresent(true)
    document.documentElement.style.fontSize = '16px'
    document.documentElement.lang = 'en'
    document.documentElement.dataset.mode = 'light'
    return () => {
      document.documentElement.style.fontSize = ''
    }
  }, [])

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(COMPARE_STEPS.length - 1, next)))
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        if (!last) go(index + 1)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (!first) go(index - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [first, go, index, last])

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0f1316] text-white">
      <header className="shrink-0 px-4 pb-2 pt-3 text-center">
        <p className="text-lg font-semibold tracking-tight text-zinc-100">Same app, set up two different ways</p>
      </header>

      <div className="flex shrink-0 items-center justify-center gap-3 px-4 pb-3">
        <button
          type="button"
          disabled={first}
          className="flex min-h-12 min-w-[7rem] items-center justify-center gap-1 rounded-xl border border-zinc-600 bg-[#1a1f24] px-4 text-sm font-semibold disabled:opacity-40"
          onClick={() => go(index - 1)}
        >
          <ChevronLeft size={20} aria-hidden />
          Back
        </button>
        <div className="min-w-[12rem] text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Step {index + 1} of {COMPARE_STEPS.length}</p>
          <p className="text-base font-semibold">{step.title}</p>
        </div>
        <button
          type="button"
          disabled={last}
          className="flex min-h-12 min-w-[7rem] items-center justify-center gap-1 rounded-xl border border-zinc-600 bg-[#E30613] px-4 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => go(index + 1)}
        >
          Next
          <ChevronRight size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="flex min-h-12 items-center gap-1 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300"
          onClick={() => go(0)}
        >
          <RotateCcw size={16} aria-hidden />
          Restart
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center gap-3 overflow-hidden px-3 pb-3">
        <section className="flex min-h-0 flex-col items-end gap-2">
          <div className="w-full max-w-[390px] text-center">
            <p className="text-base font-bold text-[#fca5a5]">{meiUser.profile.name}, {COMPARE_PERSONA_AGES.auntiemei}</p>
            <p className="text-[0.7rem] leading-tight text-zinc-400">{meiSummary}</p>
          </div>
          <div className="flex items-start gap-2">
            <CalloutList items={meiCallouts} accent="#E30613" />
            <ComparePane demoId={MEI} step={step} scale={scale} />
          </div>
        </section>

        <section className="flex min-h-0 flex-col items-start gap-2">
          <div className="w-full max-w-[390px] text-center">
            <p className="text-base font-bold text-[#93c5fd]">{arifUser.profile.name}, {COMPARE_PERSONA_AGES.arif}</p>
            <p className="text-[0.7rem] leading-tight text-zinc-400">{arifSummary}</p>
          </div>
          <div className="flex items-start gap-2">
            <ComparePane demoId={ARIF} step={step} scale={scale} />
            <CalloutList items={arifCallouts} accent="#0B4F9E" />
          </div>
        </section>
      </div>
    </div>
  )
}
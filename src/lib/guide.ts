import guides from '@/guides/guides.json'
import { stopSpeaking } from '@/lib/speech'

export interface GuideStep {
  id: string
  element: string
  title: string
  body: string
}

export interface GuideDef {
  id: string
  title: string
  steps: GuideStep[]
}

export const GUIDES = guides as GuideDef[]

export function guideById(id: string) {
  return GUIDES.find((guide) => guide.id === id)
}

export interface FlowTourState {
  guideId: string
  steps: GuideStep[]
  index: number
  speak: (text: string) => void | Promise<unknown>
}

let snapshot: FlowTourState | null = null
let finished = false
let hooks: {
  onDrop: (guideId: string, stepId: string) => void
  onDone: (guideId: string) => void
  onStep: (stepId: string) => void
} | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function getFlowTour() {
  return snapshot
}

export function subscribeFlowTour(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function stopGuide() {
  moveFlowTour(-1)
}

export function moveFlowTour(index: number) {
  const current = snapshot
  if (!current) return
  if (index < 0) {
    const stepId = current.steps[current.index]?.id || ''
    const guideId = current.guideId
    snapshot = null
    emit()
    stopSpeaking()
    window.dispatchEvent(new Event('ocbc-guide-step'))
    if (!finished) hooks?.onDrop(guideId, stepId)
    hooks = null
    finished = false
    return
  }
  if (index >= current.steps.length) {
    finished = true
    const guideId = current.guideId
    snapshot = null
    emit()
    stopSpeaking()
    window.dispatchEvent(new Event('ocbc-guide-step'))
    hooks?.onDone(guideId)
    hooks = null
    finished = false
    return
  }
  snapshot = { ...current, index }
  emit()
  hooks?.onStep(current.steps[index].id)
  window.dispatchEvent(new Event('ocbc-guide-step'))
}

export function startGuide(options: {
  guideId: string
  text: (key: string) => string
  readAloud: boolean
  waitForTap?: boolean
  rate?: () => number
  setRate?: (rate: number) => void
  formatRate?: (rate: number) => string
  nextRate?: (rate: number) => number
  speak: (text: string, onRange?: (start: number, end: number) => void) => void | Promise<unknown>
  onMissing: (element: string, stepId: string) => void
  onStart: (guideId: string) => void
  onStep: (stepId: string) => void
  onDrop: (guideId: string, stepId: string) => void
  onDone: (guideId: string) => void
}) {
  stopGuide()
  const guide = guideById(options.guideId)
  if (!guide) return { started: false, missing: [] as string[] }
  const missing: string[] = []
  const steps = guide.steps.filter((step) => Boolean(step.element))
  if (!steps.length) return { started: false, missing }
  finished = false
  hooks = { onDrop: options.onDrop, onDone: options.onDone, onStep: options.onStep }
  snapshot = {
    guideId: guide.id,
    steps,
    index: 0,
    speak: (text) => options.speak(text),
  }
  options.onStart(guide.id)
  options.onStep(steps[0].id)
  emit()
  window.dispatchEvent(new Event('ocbc-guide-step'))
  return { started: true, missing }
}

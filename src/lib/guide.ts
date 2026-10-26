import { driver, type Driver, type PopoverDOM } from 'driver.js'
import 'driver.js/dist/driver.css'
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

let active: Driver | null = null

export function stopGuide() {
  active?.destroy()
  active = null
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
  speak: (text: string, onRange?: (start: number, end: number) => void) => void
  onMissing: (element: string, stepId: string) => void
  onStart: (guideId: string) => void
  onStep: (stepId: string) => void
  onDrop: (guideId: string, stepId: string) => void
  onDone: (guideId: string) => void
}) {
  stopGuide()
  const guide = guideById(options.guideId)
  if (!guide) return { started: false, missing: [] as string[] }
  const missing: { element: string; stepId: string }[] = []
  const steps = guide.steps.filter((step) => {
    const found = document.querySelector(`[data-guide="${step.element}"]`)
    if (!found) {
      missing.push({ element: step.element, stepId: step.id })
      options.onMissing(step.element, step.id)
    }
    return Boolean(found)
  })
  if (!steps.length) return { started: false, missing: missing.map((m) => m.element) }

  let finished = false
  let current = steps[0].id
  options.onStart(guide.id)

  active = driver({
    showProgress: true,
    overlayOpacity: 0.55,
    allowClose: true,
    disableActiveInteraction: false,
    popoverClass: 'ocbc-pop ocbc-tour',
    progressText: options.text('guides.progress').replace('{current}', '{{current}}').replace('{total}', '{{total}}'),
    nextBtnText: options.text('next'),
    prevBtnText: options.text('previous'),
    doneBtnText: options.text('done'),
    steps: steps.map((step) => ({
      element: `[data-guide="${step.element}"]`,
      popover: {
        title: options.text(step.title),
        description: options.text(step.body),
        side: 'bottom' as const,
        align: 'center' as const,
      },
    })),
    onHighlighted: (element, _step, { driver: drv, state }) => {
      const step = steps[state.activeIndex ?? 0]
      if (!step) return
      current = step.id
      options.onStep(step.id)
      const body = options.text(step.body)
      const title = options.text(step.title)
      if (options.readAloud) options.speak(`${title}. ${body}`)
      if (options.waitForTap && element) {
        element.addEventListener('click', () => {
          const last = (state.activeIndex ?? 0) >= steps.length - 1
          if (last) {
            finished = true
            options.onDone(guide.id)
            drv.destroy()
          } else drv.moveNext()
        }, { once: true })
      }
    },
    onPopoverRender: (popover: PopoverDOM, { state }) => {
      const step = steps[state.activeIndex ?? 0]
      if (!step) return
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', options.text('speech.readAloud'))
      button.style.width = '40px'
      button.style.height = '40px'
      button.style.marginRight = '8px'
      button.style.borderRadius = '999px'
      button.style.border = '1px solid #ddd'
      button.style.background = '#fff'
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
      button.onclick = () => {
        const body = options.text(step.body)
        options.speak(`${options.text(step.title)}. ${body}`)
      }
      popover.footer.prepend(button)
    },
    onNextClick: (_el, _step, { driver: drv, state }) => {
      const last = (state.activeIndex ?? 0) >= steps.length - 1
      if (last) {
        finished = true
        options.onDone(guide.id)
        drv.destroy()
      } else drv.moveNext()
    },
    onDestroyed: () => {
      stopSpeaking()
      if (!finished) options.onDrop(guide.id, current)
      active = null
    },
  })
  active.drive()
  return { started: true, missing: missing.map((m) => m.element) }
}

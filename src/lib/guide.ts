import { driver, type Driver, type PopoverDOM } from 'driver.js'
import 'driver.js/dist/driver.css'
import guides from '@/guides/guides.json'

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

  const paint = (description: HTMLElement, body: string, start: number, end: number) => {
    description.replaceChildren()
    if (start < 0) {
      description.textContent = body
      return
    }
    let cursor = 0
    body.split(/(\s+)/).forEach((part) => {
      const from = cursor
      cursor += part.length
      const span = document.createElement('span')
      span.textContent = part
      if (part.trim() && from < end && cursor > start) span.className = 'word-on'
      description.appendChild(span)
    })
  }

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
      button.textContent = options.text('listen')
      button.setAttribute('aria-label', options.text('listen'))
      button.style.minHeight = '44px'
      button.style.marginLeft = '8px'
      button.style.padding = '0 12px'
      button.style.borderRadius = '999px'
      button.style.border = '1px solid #111'
      button.style.background = '#fff'
      button.style.color = '#111'
      button.onclick = () => {
        const body = options.text(step.body)
        options.speak(`${options.text(step.title)}. ${body}`, (start, end) => paint(popover.description, body, start, end))
      }
      popover.footer.appendChild(button)
      if (options.rate && options.setRate && options.formatRate && options.nextRate) {
        const format = options.formatRate
        const speed = document.createElement('button')
        speed.type = 'button'
        const paintRate = () => {
          speed.textContent = format(options.rate?.() ?? 1)
        }
        paintRate()
        speed.setAttribute('aria-label', options.text('speakingSpeed'))
        speed.style.minHeight = '44px'
        speed.style.minWidth = '44px'
        speed.style.marginLeft = '8px'
        speed.style.padding = '0 12px'
        speed.style.borderRadius = '999px'
        speed.style.border = '1px solid #111'
        speed.style.background = '#fff'
        speed.style.color = '#111'
        speed.onclick = (event) => {
          event.preventDefault()
          event.stopPropagation()
          const next = options.nextRate?.(options.rate?.() ?? 1) ?? 1
          options.setRate?.(next)
          paintRate()
        }
        popover.footer.appendChild(speed)
      }
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
      if (!finished) options.onDrop(guide.id, current)
      active = null
    },
  })
  active.drive()
  return { started: true, missing: missing.map((m) => m.element) }
}

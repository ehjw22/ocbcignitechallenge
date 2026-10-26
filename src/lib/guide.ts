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

const SPEAKER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
const STOP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'

function placeTourPopover(wrapper: HTMLElement, element?: Element, nudge = true) {
  const frame = document.querySelector('.phone-frame') || document.getElementById('customer-root')
  if (!frame) return
  const frameRect = frame.getBoundingClientRect()
  const scale = frameRect.width / ((frame as HTMLElement).clientWidth || frameRect.width) || 1
  const pad = 12
  const nav = 72 * scale
  const maxWidth = Math.max(160, frameRect.width - pad * 2)
  wrapper.style.setProperty('position', 'fixed', 'important')
  wrapper.style.setProperty('transform', 'none', 'important')
  wrapper.style.setProperty('width', `${maxWidth}px`, 'important')
  wrapper.style.setProperty('max-width', `${maxWidth}px`, 'important')
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.margin = '0'
  const popH = wrapper.offsetHeight
  const target = element?.getBoundingClientRect()
  const spaceBelow = target ? frameRect.bottom - nav - target.bottom : 0
  const spaceAbove = target ? target.top - frameRect.top : 0
  const fitsBelow = Boolean(target && target.width && spaceBelow >= popH + pad)
  const fitsAbove = Boolean(target && target.width && spaceAbove >= popH + pad)
  if (!fitsBelow && !fitsAbove && nudge && element) {
    element.scrollIntoView({ block: 'start', behavior: 'auto' })
    requestAnimationFrame(() => placeTourPopover(wrapper, element, false))
    return
  }
  let top = frameRect.bottom - nav - popH - pad
  if (fitsBelow && target) top = target.bottom + pad
  else if (fitsAbove && target) top = target.top - popH - pad
  const minTop = frameRect.top + 36
  const maxTop = Math.max(minTop, frameRect.bottom - nav - popH - pad)
  top = Math.min(Math.max(top, minTop), maxTop)
  let left = frameRect.left + pad
  if (target && target.width) left = target.left + target.width / 2 - maxWidth / 2
  const minLeft = frameRect.left + pad
  const maxLeft = Math.max(minLeft, frameRect.right - pad - maxWidth)
  left = Math.min(Math.max(left, minLeft), maxLeft)
  wrapper.style.left = `${left}px`
  wrapper.style.top = `${top}px`
  wrapper.style.right = 'auto'
  wrapper.style.bottom = 'auto'
  const arrow = wrapper.querySelector('.driver-popover-arrow') as HTMLElement | null
  if (arrow) arrow.style.display = 'none'
}

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
    stagePadding: 8,
    popoverOffset: 12,
    smoothScroll: true,
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
    onHighlightStarted: (element) => {
      element?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    },
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
      button.className = 'speak-btn'
      button.setAttribute('aria-label', options.text('speech.readAloud'))
      button.innerHTML = SPEAKER_SVG
      const idle = () => {
        button.classList.remove('is-on')
        button.innerHTML = SPEAKER_SVG
        button.setAttribute('aria-label', options.text('speech.readAloud'))
        button.setAttribute('aria-pressed', 'false')
      }
      const play = () => {
        button.classList.add('is-on')
        button.innerHTML = STOP_SVG
        button.setAttribute('aria-label', options.text('stop'))
        button.setAttribute('aria-pressed', 'true')
      }
      button.onclick = () => {
        if (button.classList.contains('is-on')) {
          stopSpeaking()
          idle()
          return
        }
        play()
        Promise.resolve(options.speak(`${options.text(step.title)}. ${options.text(step.body)}`)).finally(idle)
      }
      popover.footer.prepend(button)
      const element = document.querySelector(`[data-guide="${step.element}"]`) || undefined
      requestAnimationFrame(() => placeTourPopover(popover.wrapper, element))
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

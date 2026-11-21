import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Record every speech start/stop instead of playing audio.
const log: string[] = []
vi.mock('@/lib/speech', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/speech')>()
  return {
    ...real,
    stopSpeaking: vi.fn(() => { log.push('stop') }),
    speak: vi.fn(async (text: string) => { log.push(`speak:${text}`); return 'device' as const }),
    prefetchSpeech: vi.fn(),
  }
})

import { AppProvider } from '@/context/AppContext'
import { PhoneFrame } from '@/components/Shell'
import { getFlowTour, startGuide, stopGuide } from '@/lib/guide'
import { speak } from '@/lib/speech'

let go: NavigateFunction = () => {}
function NavHandle() {
  go = useNavigate()
  return null
}

// A screen that reads itself aloud when it opens (like Page does with read-aloud on).
function TalkingScreen({ text }: { text: string }) {
  useEffect(() => {
    void speak(text, { language: 'en', rate: 1, dialect: 'standard' })
  }, [text])
  return <p>{text}</p>
}

function renderApp(start = '/a') {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <AppProvider>
        <PhoneFrame>
          <NavHandle />
          <Routes>
            <Route path="/a" element={<p>Screen A</p>} />
            <Route path="/b" element={<TalkingScreen text="Screen B" />} />
            <Route path="/c" element={<p>Screen C</p>} />
          </Routes>
        </PhoneFrame>
      </AppProvider>
    </MemoryRouter>,
  )
}

function beginTour() {
  const noop = () => {}
  return startGuide({
    guideId: 'paynow',
    text: (key) => key,
    readAloud: true,
    speak: noop,
    onMissing: noop,
    onStart: noop,
    onStep: noop,
    onDrop: noop,
    onDone: noop,
  })
}

describe('read aloud stops when you leave a screen', () => {
  beforeEach(() => {
    log.length = 0
  })
  afterEach(() => {
    act(() => stopGuide())
  })

  it('stops speech on every screen change', () => {
    renderApp('/a')
    log.length = 0
    act(() => go('/c'))
    expect(log).toContain('stop')
  })

  it('still lets the next screen read itself aloud (stop happens before the new screen starts talking)', () => {
    renderApp('/a')
    log.length = 0
    act(() => go('/b'))
    const lastStop = log.lastIndexOf('stop')
    const talk = log.indexOf('speak:Screen B')
    expect(lastStop).toBeGreaterThanOrEqual(0)
    expect(talk).toBeGreaterThan(lastStop)
  })

  it('ends a guided tour (and its narration) when you leave the screen it started on', () => {
    renderApp('/a')
    act(() => { beginTour() })
    expect(getFlowTour()?.guideId).toBe('paynow')
    log.length = 0
    act(() => go('/c'))
    expect(getFlowTour()).toBeNull()
    expect(log).toContain('stop')
  })

  it('keeps a guided tour running when only the ?query changes on the same screen', () => {
    renderApp('/a')
    act(() => { beginTour() })
    act(() => go('/a?panel=language'))
    expect(getFlowTour()?.guideId).toBe('paynow')
  })

  it('a tour started on the new screen is not ended straight away', () => {
    renderApp('/a')
    act(() => { beginTour() })
    act(() => go('/c'))
    expect(getFlowTour()).toBeNull()
    act(() => { beginTour() })
    expect(getFlowTour()?.guideId).toBe('paynow')
    act(() => go('/c?x=1'))
    expect(getFlowTour()?.guideId).toBe('paynow')
  })
})

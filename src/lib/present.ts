import { useEffect, useState, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ocbc-present'
const TAPS_KEY = 'ocbc-present-taps'

let scaleSnapshot = 1

export function phoneScale() {
  return scaleSnapshot
}

export function setPhoneScale(scale: number) {
  scaleSnapshot = scale
}

function readPresent() {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('present') === '0') {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    if (params.get('present') === '1') {
      localStorage.setItem(STORAGE_KEY, '1')
      return true
    }
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function isPresent() {
  return readPresent()
}

export function setPresent(on: boolean) {
  if (on) localStorage.setItem(STORAGE_KEY, '1')
  else localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function subscribePresent(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readTapsVisualizer() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('taps') === '1') return true
  try {
    return sessionStorage.getItem(TAPS_KEY) === '1'
  } catch {
    return false
  }
}

export function toggleTapsVisualizer() {
  const next = !readTapsVisualizer()
  try {
    if (next) sessionStorage.setItem(TAPS_KEY, '1')
    else sessionStorage.removeItem(TAPS_KEY)
  } catch { /* ignore */ }
  notify()
  return next
}

export function getPhoneScale() {
  const full = typeof window !== 'undefined' && window.innerWidth <= 480
  const present = readPresent()
  const margin = present ? 16 : 72
  const fit = Math.min(
    (window.innerHeight - margin) / 844,
    (window.innerWidth - margin) / 390,
  )
  const scale = full ? 1 : present ? fit : Math.min(1, fit)
  return { scale, full, present }
}

export function usePresentMode() {
  const present = useSyncExternalStore(subscribePresent, isPresent, () => false)
  const toggle = () => setPresent(!present)
  const exit = () => setPresent(false)
  return { present, toggle, exit }
}

export function usePhoneScale() {
  const present = useSyncExternalStore(subscribePresent, isPresent, () => false)
  const [state, setState] = useState(() => getPhoneScale())

  useEffect(() => {
    const update = () => {
      const next = getPhoneScale()
      setPhoneScale(next.scale)
      setState(next)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [present])

  useEffect(() => {
    setPhoneScale(state.scale)
  }, [state.scale])

  return state
}
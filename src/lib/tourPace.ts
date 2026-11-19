export type TourPace = 'normal' | 'slow'

const KEY = 'ocbc-tour-pace'

export function loadTourPace(): TourPace {
  try {
    return sessionStorage.getItem(KEY) === 'slow' ? 'slow' : 'normal'
  } catch {
    return 'normal'
  }
}

export function saveTourPace(pace: TourPace) {
  sessionStorage.setItem(KEY, pace)
}

export function tourHighlightPad(pace: TourPace) {
  return pace === 'slow' ? 12 : 6
}

export function tourSpeakDelayMs(pace: TourPace) {
  return pace === 'slow' ? 1500 : 0
}

export function tourSpeechRate(base: number, pace: TourPace) {
  return pace === 'slow' ? Math.min(1.5, Math.max(0.6, base * 0.85)) : base
}
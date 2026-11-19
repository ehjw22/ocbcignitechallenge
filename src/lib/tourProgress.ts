const prefix = 'ocbc-tour-progress-'

export interface TourProgressEntry {
  started?: boolean
  opened?: boolean
  completedReal?: boolean
  completedPractice?: boolean
  lastStep?: number
  totalSteps?: number
}

export type TourProgressMap = Record<string, TourProgressEntry>

export function loadTourProgress(userId: string): TourProgressMap {
  try {
    const raw = localStorage.getItem(prefix + userId)
    return raw ? (JSON.parse(raw) as TourProgressMap) : {}
  } catch {
    return {}
  }
}

export function saveTourProgress(userId: string, map: TourProgressMap) {
  localStorage.setItem(prefix + userId, JSON.stringify(map))
}

export function patchTourProgress(userId: string, tourId: string, patch: Partial<TourProgressEntry>) {
  const map = loadTourProgress(userId)
  map[tourId] = { ...map[tourId], ...patch }
  saveTourProgress(userId, map)
  return map[tourId]
}

export function clearAllTourProgress() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
}
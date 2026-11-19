import { patchTourProgress, type TourProgressMap } from './tourProgress'

const GUIDE_TO_LIST: Record<string, string> = {
  'app-tour': 'home',
}

export function tourListId(guideId: string) {
  return GUIDE_TO_LIST[guideId] || guideId
}

export function practisedJourneyCount(map: TourProgressMap) {
  return Object.values(map).filter((entry) => entry.completedPractice).length
}

export function markTourOpened(userId: string, guideId: string, totalSteps: number) {
  patchTourProgress(userId, tourListId(guideId), { started: true, opened: true, totalSteps })
}

export function markTourStep(userId: string, guideId: string, stepIndex: number, totalSteps: number) {
  patchTourProgress(userId, tourListId(guideId), { started: true, opened: true, lastStep: stepIndex, totalSteps })
}

export function markTourDropped(userId: string, guideId: string, stepIndex: number, totalSteps: number) {
  patchTourProgress(userId, tourListId(guideId), { started: true, lastStep: stepIndex, totalSteps })
}

export function markTourFinished(userId: string, guideId: string, practice: boolean) {
  const id = tourListId(guideId)
  patchTourProgress(userId, id, practice ? { completedPractice: true } : { completedReal: true })
  try {
    const raw = localStorage.getItem('ocbc-tours-done')
    const done = raw ? (JSON.parse(raw) as string[]) : []
    if (!done.includes(id)) {
      done.push(id)
      localStorage.setItem('ocbc-tours-done', JSON.stringify(done))
    }
  } catch {
    /* ignore */
  }
}
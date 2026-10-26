export interface TourStep {
  id: string
  section: string
  route: string
  element: string
  title: string
  body: string
}

export const APP_TOUR: TourStep[] = [
  { id: 'balance', section: 'tour.home', route: '/', element: 'home-balance', title: 'guides.home.balanceTitle', body: 'guides.home.balanceBody' },
  { id: 'shortcuts', section: 'tour.home', route: '/', element: 'home-shortcuts', title: 'guides.home.shortcutsTitle', body: 'guides.home.shortcutsBody' },
  { id: 'foryou', section: 'tour.home', route: '/', element: 'home-foryou', title: 'tour.forYouTitle', body: 'tour.forYouBody' },
  { id: 'accounts', section: 'tour.accounts', route: '/accounts', element: 'accounts-list', title: 'tour.accountsTitle', body: 'tour.accountsBody' },
  { id: 'txns', section: 'tour.accounts', route: '/accounts', element: 'txn-search', title: 'tour.txnsTitle', body: 'tour.txnsBody' },
  { id: 'paynow', section: 'tour.pay', route: '/pay', element: 'pay-paynow', title: 'tour.paynowTitle', body: 'tour.paynowBody' },
  { id: 'transfer', section: 'tour.pay', route: '/pay', element: 'pay-transfer', title: 'tour.transferTitle', body: 'tour.transferBody' },
  { id: 'bills', section: 'tour.pay', route: '/pay', element: 'pay-bill', title: 'tour.billsTitle', body: 'tour.billsBody' },
  { id: 'cards', section: 'tour.cards', route: '/cards', element: 'cards-lock', title: 'tour.cardsTitle', body: 'tour.cardsBody' },
  { id: 'assistant', section: 'tour.help', route: '/help', element: 'help-assistant', title: 'tour.assistantTitle', body: 'tour.assistantBody' },
  { id: 'staff', section: 'tour.help', route: '/help', element: 'help-staff', title: 'tour.staffTitle', body: 'tour.staffBody' },
  { id: 'language', section: 'tour.settings', route: '/settings', element: 'settings-language', title: 'guides.settings.languageTitle', body: 'guides.settings.languageBody' },
  { id: 'text', section: 'tour.settings', route: '/settings', element: 'settings-text', title: 'guides.settings.textTitle', body: 'guides.settings.textBody' },
  { id: 'aloud', section: 'tour.settings', route: '/settings', element: 'settings-read', title: 'tour.aloudTitle', body: 'tour.aloudBody' },
]

const KEY = 'ocbc-app-tour'

export function tourState(): { active: boolean; index: number } {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return { active: false, index: 0 }
    const parsed = JSON.parse(raw) as { active?: boolean; index?: number }
    return { active: Boolean(parsed.active), index: Math.min(APP_TOUR.length - 1, Math.max(0, Number(parsed.index) || 0)) }
  } catch {
    return { active: false, index: 0 }
  }
}

export function writeTour(next: { active: boolean; index: number }) {
  sessionStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('ocbc-tour'))
}

export function startAppTour(resume = false) {
  const current = tourState()
  writeTour({ active: true, index: resume ? current.index : 0 })
}

export function tourSections() {
  const names: string[] = []
  for (const step of APP_TOUR) {
    if (!names.includes(step.section)) names.push(step.section)
  }
  return names
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ACCOUNTS, SEED_CARDS, SEED_TXNS } from '@/data/bank'
import { clearBooks, demoBook, isDemoAccount, loadBook, saveBook, type BankBook, type SavedPayee } from '@/data/demoAccounts'
import { PERSONAS } from '@/data/personas'
import { SEED_REQUESTS } from '@/data/seed'
import { translate } from '@/i18n'
import type { AnalyticsEvent, CardItem, ChatMessage, DemoUser, Preferences, Profile, RequestStatus, StaffRequest, Txn } from '@/lib/types'
import {
  clearTourSeen,
  defaultPrefs,
  defaultProfile,
  loadBalances,
  loadCards,
  loadEvents,
  loadExtraTxns,
  loadGuest,
  loadLastUser,
  loadSessionId,
  loadLimit,
  loadProfile,
  loadRequests,
  loadUsers,
  resetAll,
  saveBalances,
  saveCards,
  saveEvents,
  saveExtraTxns,
  peekAfterLogin,
  saveGuest,
  saveLastUserId,
  saveLimit,
  savePrefs,
  saveProfile,
  saveRequests,
  saveSessionId,
  saveUsers,
  takeAfterLogin,
  setTourSeen,
} from '@/lib/storage'

export type HelpView = 'menu' | 'guides' | 'ai' | 'staff'

export interface Goal {
  id: string
  name: string
  target: number
  monthly: number
  saved?: number
}

type RequestInput = Omit<StaffRequest, 'ref' | 'createdAt' | 'status'>

interface AppApi {
  prefs: Preferences
  updatePrefs: (patch: Partial<Preferences>) => void
  profile: Profile
  setProfile: (profile: Profile) => void
  screen: string
  setScreen: (screen: string, stepName?: string) => void
  step: string
  setStep: (step: string) => void
  guideStep: string
  setGuideStep: (guideId: string, stepId?: string) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  helpView: HelpView
  setHelpView: (view: HelpView) => void
  openHelp: (view: HelpView) => void
  notice: string
  setNotice: (notice: string) => void
  announce: string
  setAnnounce: (text: string) => void
  messages: ChatMessage[]
  setMessages: (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  lastQuestion: string
  setLastQuestion: (q: string) => void
  aiSeed: string
  setAiSeed: (q: string) => void
  staffSeed: string
  setStaffSeed: (q: string) => void
  log: (type: string, data?: AnalyticsEvent['data']) => void
  events: AnalyticsEvent[]
  requests: StaffRequest[]
  addRequest: (input: RequestInput) => StaffRequest
  setRequestStatus: (ref: string, status: RequestStatus) => void
  cards: CardItem[]
  setCards: (cards: CardItem[]) => void
  setCardLocked: (id: string, locked: boolean) => void
  txns: Txn[]
  addTxn: (txn: Txn) => void
  balances: Record<string, number>
  setBalance: (id: string, amount: number) => void
  limit: number
  setLimit: (amount: number) => void
  goals: Goal[]
  setGoals: (goals: Goal[]) => void
  accounts: import('@/lib/types').Account[]
  payees: SavedPayee[]
  guidePrompt: { journeyId: string; practice: boolean } | null
  setGuidePrompt: (prompt: { journeyId: string; practice: boolean } | null) => void
  applyPersona: (id: 'mei' | 'arif') => void
  resetDemo: () => void
  resetQuiz: () => void
  deleteUser: () => void
  switchUser: () => void
  markTourSeen: () => void
  sessionId: string | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AppContext = createContext<AppApi | null>(null)
const GOALS_KEY = 'ocbc-adaptive-goals'

function readGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    return raw ? (JSON.parse(raw) as Goal[]) : []
  } catch {
    return []
  }
}

const seedBalances = Object.fromEntries(ACCOUNTS.map((account) => [account.id, account.balance]))

function signedOutPrefs(): Preferences {
  return { ...defaultPrefs(), ...loadGuest(), onboarded: false }
}

function bootView(): { sessionId: string | null; prefs: Preferences; profile: Profile } {
  const sessionId = loadSessionId()
  const user = sessionId ? loadUsers().find((item) => item.id === sessionId) : null
  if (user) return { sessionId: user.id, prefs: user.prefs, profile: user.profile }
  const last = loadLastUser()
  if (last) return { sessionId: null, prefs: last.prefs, profile: last.profile }
  return { sessionId: null, prefs: signedOutPrefs(), profile: defaultProfile() }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [boot] = useState(bootView)
  const [sessionId, setSessionId] = useState<string | null>(boot.sessionId)
  const sessionRef = useRef<string | null>(null)
  sessionRef.current = sessionId
  const [prefs, setPrefs] = useState<Preferences>(boot.prefs)
  const [profile, setProfileState] = useState<Profile>(boot.profile)
  const [events, setEvents] = useState<AnalyticsEvent[]>(loadEvents)
  const [requests, setRequests] = useState<StaffRequest[]>(() => {
    const saved = loadRequests()
    return saved.length ? saved : SEED_REQUESTS
  })
  const [cards, setCardsState] = useState<CardItem[]>(() => loadCards(SEED_CARDS))
  const [extraTxns, setExtraTxns] = useState<Txn[]>(() => (boot.sessionId && isDemoAccount(boot.sessionId) ? [] : loadExtraTxns()))
  const [baseTxns, setBaseTxns] = useState<Txn[]>(() => {
    if (boot.sessionId && isDemoAccount(boot.sessionId)) {
      return (loadBook(boot.sessionId) ?? demoBook(boot.sessionId))?.txns ?? SEED_TXNS
    }
    return SEED_TXNS
  })
  const [accounts, setAccounts] = useState(() => {
    if (boot.sessionId && isDemoAccount(boot.sessionId)) {
      return (loadBook(boot.sessionId) ?? demoBook(boot.sessionId))?.accounts ?? ACCOUNTS
    }
    return ACCOUNTS
  })
  const [payees, setPayees] = useState<SavedPayee[]>(() => {
    if (boot.sessionId && isDemoAccount(boot.sessionId)) {
      return (loadBook(boot.sessionId) ?? demoBook(boot.sessionId))?.payees ?? []
    }
    return []
  })
  const [guidePrompt, setGuidePrompt] = useState<{ journeyId: string; practice: boolean } | null>(null)
  const [balances, setBalances] = useState<Record<string, number>>(() => {
    if (boot.sessionId && isDemoAccount(boot.sessionId)) {
      return (loadBook(boot.sessionId) ?? demoBook(boot.sessionId))?.balances ?? loadBalances(seedBalances)
    }
    return loadBalances(seedBalances)
  })
  const [limit, setLimitState] = useState(() => loadLimit(5000))
  const [goals, setGoalsState] = useState<Goal[]>(() => {
    if (boot.sessionId && isDemoAccount(boot.sessionId)) {
      return (loadBook(boot.sessionId) ?? demoBook(boot.sessionId))?.goals ?? readGoals()
    }
    return readGoals()
  })
  const [screen, setScreenState] = useState('home')
  const [step, setStep] = useState('')
  const [guideStep, setGuideStepState] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpView, setHelpView] = useState<HelpView>('menu')
  const [notice, setNotice] = useState('')
  const [announce, setAnnounce] = useState('')
  const [messages, setMessagesState] = useState<ChatMessage[]>([])
  const [lastQuestion, setLastQuestion] = useState('')
  const [aiSeed, setAiSeed] = useState('')
  const [staffSeed, setStaffSeed] = useState('')

  useEffect(() => {
    const pending = peekAfterLogin()
    if (pending && location.pathname === pending.split('?')[0]) takeAfterLogin()
  }, [location.pathname])

  useEffect(() => {
    const root = document.documentElement
    const admin = location.pathname.startsWith('/admin') || location.pathname === '/staff'
    root.style.fontSize = admin ? '16px' : `${prefs.textSize}px`
    const htmlLang = prefs.language === 'zh' ? 'zh-Hans' : prefs.language === 'zh-TW' ? 'zh-Hant' : prefs.language
    root.lang = htmlLang
    root.dataset.mode = admin ? 'light' : prefs.scheme
  }, [prefs.textSize, prefs.language, prefs.scheme, location.pathname])

  const persistUser = (id: string, nextPrefs: Preferences, nextProfile: Profile) => {
    const users = loadUsers()
    const next = users.some((user) => user.id === id)
      ? users.map((user) => (user.id === id ? { ...user, prefs: nextPrefs, profile: nextProfile } : user))
      : users
    saveUsers(next)
    savePrefs(nextPrefs)
    saveProfile(nextProfile)
  }

  const updatePrefs = (patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      if (next.language !== 'zh' && next.language !== 'zh-TW') next.dialect = 'standard'
      const id = sessionRef.current
      if (id) persistUser(id, next, profile)
      else saveGuest(next)
      savePrefs(next)
      return next
    })
  }

  const setProfile = (next: Profile) => {
    setProfileState(next)
    const id = sessionRef.current
    if (id) persistUser(id, prefs, next)
    else saveProfile(next)
  }

  const log = (type: string, data: AnalyticsEvent['data'] = {}) => {
    setEvents((current) => {
      const next = [...current, { id: `evt-${Date.now()}-${current.length}`, ts: new Date().toISOString(), type, data }].slice(-400)
      saveEvents(next)
      return next
    })
  }

  const setMessages = (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesState((current) => (typeof next === 'function' ? next(current) : next))
  }

  const setCards = (next: CardItem[]) => {
    setCardsState(next)
    saveCards(next)
  }

  const addTxn = (txn: Txn) => {
    setExtraTxns((current) => {
      const next = [txn, ...current].slice(0, 30)
      const userId = sessionRef.current
      if (userId && isDemoAccount(userId)) {
        const book = loadBook(userId)
        if (book) saveBook(userId, { ...book, txns: [txn, ...book.txns].slice(0, 30) })
      } else saveExtraTxns(next)
      return next
    })
  }

  const setBalance = (id: string, amount: number) => {
    setBalances((current) => {
      const next = { ...current, [id]: amount }
      const userId = sessionRef.current
      if (userId && isDemoAccount(userId)) {
        const book = loadBook(userId)
        if (book) saveBook(userId, { ...book, balances: next })
      } else saveBalances(next)
      return next
    })
  }

  const setLimit = (amount: number) => {
    setLimitState(amount)
    saveLimit(amount)
  }

  const setGoals = (next: Goal[]) => {
    setGoalsState(next)
    const userId = sessionRef.current
    if (userId && isDemoAccount(userId)) {
      const book = loadBook(userId)
      if (book) saveBook(userId, { ...book, goals: next })
    } else localStorage.setItem(GOALS_KEY, JSON.stringify(next))
  }

  const showBook = (book: BankBook) => {
    setAccounts(book.accounts)
    setBalances(book.balances)
    setBaseTxns(book.txns)
    setExtraTxns([])
    setGoalsState(book.goals)
    setPayees(book.payees)
  }

  const showSharedBook = () => {
    setAccounts(ACCOUNTS)
    setBalances(loadBalances(seedBalances))
    setBaseTxns(SEED_TXNS)
    setExtraTxns(loadExtraTxns())
    setGoalsState(readGoals())
    setPayees([])
  }

  const addRequest = (input: RequestInput) => {
    const request: StaffRequest = {
      ...input,
      ref: `OCBC-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-3)}`,
      createdAt: new Date().toISOString(),
      status: 'received',
    }
    setRequests((current) => {
      const next = [request, ...current]
      saveRequests(next)
      return next
    })
    return request
  }

  const setRequestStatus = (ref: string, status: RequestStatus) => {
    setRequests((current) => {
      const next = current.map((item) => (item.ref === ref ? { ...item, status } : item))
      saveRequests(next)
      return next
    })
  }

  const setScreen = (next: string, stepName = '') => {
    setScreenState(next)
    setStep(stepName)
  }
  const setGuideStep = (guideId: string, stepId?: string) => {
    setGuideStepState(stepId ? `${guideId}:${stepId}` : guideId)
  }
  const openHelp = (view: HelpView) => {
    setHelpView(view)
    setHelpOpen(true)
  }
  const setCardLocked = (id: string, locked: boolean) => {
    setCardsState((current) => {
      const next = current.map((card) => (card.id === id ? { ...card, locked } : card))
      saveCards(next)
      return next
    })
  }

  const activate = (user: DemoUser) => {
    saveUsers(loadUsers().some((item) => item.id === user.id)
      ? loadUsers().map((item) => (item.id === user.id ? user : item))
      : [...loadUsers(), user])
    saveSessionId(user.id)
    sessionRef.current = user.id
    setSessionId(user.id)
    setPrefs(user.prefs)
    setProfileState(user.profile)
    savePrefs(user.prefs)
    saveProfile(user.profile)
    if (isDemoAccount(user.id)) {
      const book = loadBook(user.id) ?? demoBook(user.id)
      if (book) {
        saveBook(user.id, book)
        showBook(book)
      }
    } else showSharedBook()
  }

  const destination = () => peekAfterLogin() || '/'

  const login = (username: string, password: string) => {
    const name = username.trim()
    if (!name) return false
    const users = loadUsers()
    const found = users.find((user) => user.username.toLowerCase() === name.toLowerCase())
      || users.find((user) => [user.profile.name, user.profile.shortName].some((value) => value.toLowerCase() === name.toLowerCase()))
    if (found?.password && found.password !== password) return false
    if (found?.prefs.quizCompleted) {
      activate(found)
      saveLastUserId(found.id)
      navigate(destination())
      return true
    }
    const id = found?.id || `user-${Date.now()}`
    const nextProfile: Profile = found?.profile || { id, name, shortName: name.split(/\s+/)[0] || name, usualTransfer: 500 }
    const nextPrefs = {
      ...(found?.prefs || { ...defaultPrefs(), ...loadGuest() }),
      quizCompleted: false,
      onboarded: false,
    }
    activate({ id, username: found?.username || name, prefs: nextPrefs, profile: nextProfile })
    saveLastUserId(id)
    navigate('/join')
    return true
  }

  const logout = () => {
    if (sessionRef.current) saveLastUserId(sessionRef.current)
    saveGuest(prefs)
    saveSessionId(null)
    sessionRef.current = null
    setSessionId(null)
    setHelpOpen(false)
    setMessagesState([])
    navigate('/welcome')
  }

  const switchUser = () => {
    saveLastUserId(null)
    saveSessionId(null)
    sessionRef.current = null
    setSessionId(null)
    setPrefs(signedOutPrefs())
    setProfileState(defaultProfile())
    setHelpOpen(false)
    navigate('/login')
  }

  const deleteUser = () => {
    const id = sessionRef.current
    if (!id) return
    saveUsers(loadUsers().filter((user) => user.id !== id))
    if (loadLastUser()?.id === id) saveLastUserId(null)
    saveSessionId(null)
    sessionRef.current = null
    setSessionId(null)
    setPrefs(signedOutPrefs())
    setProfileState(defaultProfile())
    setHelpOpen(false)
    setMessagesState([])
    navigate('/welcome')
  }

  const applyPersona = (id: 'mei' | 'arif') => {
    const persona = PERSONAS.find((item) => item.id === id)
    if (!persona) return
    const storedId = `persona-${id}`
    const existing = loadUsers().find((user) => user.id === storedId)
    activate({
      id: storedId,
      username: existing?.username || `persona-${persona.profile.shortName}`,
      prefs: { ...persona.prefs, quizCompleted: true, onboarded: true },
      profile: { ...persona.profile, id: storedId },
    })
    setTourSeen()
    saveLastUserId(storedId)
    if (id === 'mei') {
      setStaffSeed('')
      navigate('/flow/overseas?practice=1&demo=mei')
      return
    }
    setAiSeed(translate('en', 'ai.chipGiro'))
    navigate('/flow/giro?practice=1')
    openHelp('ai')
  }

  const resetQuiz = () => {
    updatePrefs({
      ...defaultPrefs(),
      language: prefs.language,
      textSize: prefs.textSize,
      boldText: prefs.boldText,
      highContrast: prefs.highContrast,
      scheme: prefs.scheme,
      colourVision: prefs.colourVision,
      quizCompleted: false,
      onboarded: false,
    })
    navigate('/join')
  }

  const resetDemo = () => {
    resetAll()
    clearBooks()
    localStorage.removeItem(GOALS_KEY)
    clearTourSeen()
    sessionRef.current = null
    setSessionId(null)
    setPrefs(signedOutPrefs())
    setProfileState(defaultProfile())
    setEvents([])
    setRequests([])
    setCardsState(SEED_CARDS)
    setExtraTxns([])
    setBaseTxns(SEED_TXNS)
    setAccounts(ACCOUNTS)
    setPayees([])
    setGuidePrompt(null)
    setBalances(seedBalances)
    setLimitState(5000)
    setGoalsState([])
    setMessagesState([])
    setNotice('')
    setAnnounce('')
    setHelpOpen(false)
    navigate('/welcome')
  }

  const rememberGuidePrompt = (prompt: { journeyId: string; practice: boolean } | null) => {
    if (prompt && sessionStorage.getItem('ocbc-guide-prompt') === prompt.journeyId) return
    setGuidePrompt(prompt)
  }

  const value: AppApi = {
    prefs,
    updatePrefs,
    profile,
    setProfile,
    screen,
    setScreen,
    step,
    setStep,
    guideStep,
    setGuideStep,
    helpOpen,
    setHelpOpen,
    helpView,
    setHelpView,
    openHelp,
    notice,
    setNotice,
    announce,
    setAnnounce,
    messages,
    setMessages,
    lastQuestion,
    setLastQuestion,
    aiSeed,
    setAiSeed,
    staffSeed,
    setStaffSeed,
    log,
    events,
    requests,
    addRequest,
    setRequestStatus,
    cards,
    setCards,
    setCardLocked,
    txns: [...extraTxns, ...baseTxns],
    accounts,
    payees,
    guidePrompt,
    setGuidePrompt: rememberGuidePrompt,
    addTxn,
    balances,
    setBalance,
    limit,
    setLimit,
    goals,
    setGoals,
    applyPersona,
    resetDemo,
    resetQuiz,
    deleteUser,
    switchUser,
    markTourSeen: setTourSeen,
    sessionId,
    login,
    logout,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

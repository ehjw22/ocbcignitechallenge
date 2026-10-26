import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PhoneFrame } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { Accounts } from '@/pages/Accounts'
import { Admin } from '@/pages/Admin'
import { Cards, HelpPage, InfoPage, More, PayHub } from '@/pages/SimplePages'
import { Insights } from '@/pages/Insights'
import { FlowPage } from '@/pages/FlowPage'
import { Home } from '@/pages/Home'
import { Join } from '@/pages/Join'
import { Login } from '@/pages/Login'
import { PreInfo } from '@/pages/PreInfo'
import { Settings } from '@/pages/Settings'
import { Welcome } from '@/pages/Welcome'
import { AccountDetail, NotFound, Notifications, Profile, TxnDetail } from '@/pages/DetailPages'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Gate({ children }: { children: ReactNode }) {
  const { sessionId, prefs } = useApp()
  const path = useLocation().pathname
  const welcome = path === '/welcome' || path === '/login' || path.startsWith('/pre')
  const known = path === '/' || welcome || path === '/join' || path === '/onboarding'
    || ['/accounts', '/txn/', '/notifications', '/profile', '/pay', '/flow/', '/help', '/more', '/settings', '/cards', '/info/', '/insights'].some((item) => path === item || path.startsWith(item))
  const quizDone = prefs.quizCompleted
  if (!known) return children
  if (!sessionId && path === '/join') return <Navigate to="/login" replace />
  if (!sessionId && !welcome) return <Navigate to="/welcome" replace />
  if (sessionId && !quizDone && path !== '/join') return <Navigate to="/join" replace />
  if (sessionId && quizDone && (path === '/welcome' || path === '/login' || path === '/join')) {
    return <Navigate to={sessionStorage.getItem('ocbc-after-login') || '/'} replace />
  }
  return children
}

function Customer() {
  return (
    <PhoneFrame>
      <Gate>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/pre/:topic" element={<PreInfo />} />
        <Route path="/onboarding" element={<Navigate to="/join" replace />} />
        <Route path="/" element={<Home />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:accountId" element={<AccountDetail />} />
        <Route path="/txn/:txnId" element={<TxnDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pay" element={<PayHub />} />
        <Route path="/flow/:flowId" element={<FlowPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/info/:topic" element={<InfoPage />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Gate>
    </PhoneFrame>
  )
}

export default function App() {
  const location = useLocation()
  if (location.pathname.startsWith('/admin') || location.pathname === '/staff') {
    return (
      <ErrorBoundary>
        <Admin />
      </ErrorBoundary>
    )
  }
  return <Customer />
}

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { DEMO_LOGINS } from '@/data/demoAccounts'
import { setPresent } from '@/lib/present'

export function JudgeBootstrap() {
  const app = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (new URLSearchParams(location.search).get('demo') !== 'judge') return
    if (sessionStorage.getItem('ocbc-judge-boot') === '1') return
    sessionStorage.setItem('ocbc-judge-boot', '1')
    const mei = DEMO_LOGINS.find((user) => user.id === 'auntiemei')
    if (mei) {
      app.login('auntiemei', 'demo1234')
      app.updatePrefs({
        language: 'zh',
        textSize: 22,
        boldText: true,
        highContrast: true,
        readAloud: true,
        easierTapping: true,
        quizCompleted: true,
        onboarded: true,
      })
    }
    setPresent(true)
    navigate('/', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])
  return null
}
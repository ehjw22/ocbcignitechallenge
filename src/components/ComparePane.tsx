import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ComparePhoneShell } from '@/components/ComparePhoneShell'
import { AppProvider, useApp, type IsolatedDemoId } from '@/context/AppContext'
import { Accounts } from '@/pages/Accounts'
import { FlowPage } from '@/pages/FlowPage'
import { Home } from '@/pages/Home'
import { Settings } from '@/pages/Settings'
import { AccountDetail, NotFound } from '@/pages/DetailPages'
import { HelpPage, PayHub } from '@/pages/SimplePages'
import type { CompareStep } from '@/lib/compareSteps'

function CompareStepEffects({ step }: { step: CompareStep }) {
  const app = useApp()
  useEffect(() => {
    app.setHelpOpen(false)
    app.setNotice('')
    if (!step.openHelp) return
    const timer = window.setTimeout(() => {
      app.setHelpView(step.openHelp!)
      app.setHelpOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset help when the presenter step changes
  }, [step.id, step.openHelp])
  return null
}

export function ComparePane({
  demoId,
  step,
  scale,
}: {
  demoId: IsolatedDemoId
  step: CompareStep
  scale: number
}) {
  const rootId = `compare-root-${demoId}`
  return (
    <MemoryRouter key={`${demoId}-${step.id}`} initialEntries={[step.route]}>
      <AppProvider isolatedDemoId={demoId}>
        <ErrorBoundary>
          <CompareStepEffects step={step} />
          <ComparePhoneShell scale={scale} rootId={rootId}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:accountId" element={<AccountDetail />} />
              <Route path="/pay" element={<PayHub />} />
              <Route path="/flow/:flowId" element={<FlowPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:panel" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ComparePhoneShell>
        </ErrorBoundary>
      </AppProvider>
    </MemoryRouter>
  )
}
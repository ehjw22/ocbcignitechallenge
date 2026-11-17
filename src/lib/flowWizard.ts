export function wizardReview(flowId: string) {
  if (flowId === 'overseas') return 3
  if (flowId === 'paynow' || flowId === 'transfer') return 2
  return -1
}

export function wizardFields(flowId: string, step: number) {
  if (wizardReview(flowId) < 0) return null
  if (flowId === 'paynow') return step === 0 ? ['proxy', 'to'] : step === 1 ? ['amount', 'from', 'reference', 'savePayee', 'when', 'laterDate'] : []
  if (flowId === 'transfer') return step === 0 ? ['name', 'bank', 'account'] : step === 1 ? ['amount', 'from', 'savePayee', 'when', 'laterDate'] : []
  return step === 0 ? ['country'] : step === 1 ? ['name', 'swift', 'account'] : step === 2 ? ['amount', 'from', 'purpose', 'savePayee', 'when', 'laterDate'] : []
}
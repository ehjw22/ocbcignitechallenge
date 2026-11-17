import { overseasSample, type FlowDef, type FlowField } from '../data/flows.ts'

export type DemoUser = {
  accounts?: { id: string; kind?: string }[]
  country?: string
}

const WSTEP: Record<string, Record<string, number>> = {
  paynow: { who: 0, tabs: 0, recipient: 0, name: 0, amount: 1, reference: 1, from: 1, next: 1, review: 2, slider: 2 },
  transfer: { name: 0, account: 0, amount: 1, review: 2 },
  overseas: { name: 0, country: 0, swift: 1, account: 1, amount: 2, purpose: 2, review: 3 },
}

const FILL: Record<string, Record<string, string[]>> = {
  paynow: {
    who: ['proxy'],
    tabs: ['proxy'],
    recipient: ['proxy', 'to'],
    name: ['proxy', 'to'],
    amount: ['proxy', 'to', 'from', 'amount'],
    reference: ['proxy', 'to', 'from', 'amount', 'reference'],
    from: ['proxy', 'to', 'from', 'amount'],
    next: ['proxy', 'to', 'from', 'amount'],
    review: ['proxy', 'to', 'from', 'amount', 'reference'],
    slider: ['proxy', 'to', 'from', 'amount', 'reference'],
  },
  transfer: {
    name: ['name', 'bank'],
    account: ['name', 'bank', 'account'],
    amount: ['name', 'bank', 'account', 'from', 'amount'],
    review: ['name', 'bank', 'account', 'from', 'amount'],
  },
  overseas: {
    name: ['name'],
    country: ['name', 'country'],
    swift: ['name', 'country', 'swift'],
    account: ['name', 'country', 'swift', 'account'],
    amount: ['name', 'country', 'swift', 'account', 'from', 'amount'],
    purpose: ['name', 'country', 'swift', 'account', 'from', 'amount', 'purpose'],
    review: ['name', 'country', 'swift', 'account', 'from', 'amount', 'purpose'],
  },
  bill: {
    biller: ['biller'],
    ref: ['biller', 'ref'],
    amount: ['biller', 'ref', 'from', 'amount'],
    review: ['biller', 'ref', 'from', 'amount'],
  },
  giro: {
    org: ['org'],
    account: ['org', 'from'],
    limit: ['org', 'from', 'limit'],
    review: ['org', 'from', 'limit', 'day'],
  },
  scan: {
    frame: ['merchant'],
    amount: ['merchant', 'from', 'amount'],
    review: ['merchant', 'from', 'amount'],
  },
  goal: {
    name: ['name'],
    target: ['name', 'target'],
    monthly: ['name', 'target', 'monthly', 'from'],
    review: ['name', 'target', 'monthly', 'from'],
  },
  limit: {
    current: [],
    next: ['amount'],
    review: ['amount'],
  },
}

export function resolveDemoValue(field: FlowField, user: DemoUser = {}) {
  if (field.type === 'account') {
    const deposits = (user.accounts || []).filter((account) => !account.kind || account.kind === 'deposit')
    if (deposits.some((account) => account.id === field.sample)) return field.sample
    if (deposits[0]) return deposits[0].id
  }
  if (field.guide.startsWith('overseas-') && (field.id === 'account' || field.id === 'swift')) {
    const sample = overseasSample(user.country || 'Australia')
    if (field.id === 'account') return sample.account
    if (field.id === 'swift' && sample.swift) return sample.swift
  }
  return field.sample
}

export function guideStepFill(flow: FlowDef, stepId: string, user: DemoUser = {}) {
  const ids = FILL[flow.id]?.[stepId] || flow.fields.map((field) => field.id)
  const country = user.country || flow.fields.find((field) => field.id === 'country')?.sample || 'Australia'
  const values: Record<string, string> = {}
  for (const field of flow.fields) {
    if (!ids.includes(field.id)) continue
    values[field.id] = resolveDemoValue(field, { ...user, country: values.country || country })
  }
  if (flow.id === 'overseas' && values.amount && Number(values.amount) >= 50) values.amount = '20.00'
  const reviewStep = stepId === 'review' || stepId === 'slider'
  const wstep = WSTEP[flow.id]?.[stepId] ?? 0
  const stage: 'form' | 'review' = flow.id === 'paynow' && reviewStep ? 'review' : 'form'
  return { values, wstep, stage }
}

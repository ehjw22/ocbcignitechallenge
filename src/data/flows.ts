export interface FlowField {
  id: string
  guide: string
  label: string
  type: 'text' | 'amount' | 'select' | 'account' | 'toggle'
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  options?: { value: string; label: string }[]
  sample: string
}

export interface FlowDef {
  id: string
  title: string
  guideId: string
  kind: 'payment' | 'setup' | 'card' | 'limit'
  payeeField?: string
  amountField?: string
  fields: FlowField[]
}

const depositAccounts = [
  { value: '360', label: 'accounts.a360' },
  { value: 'savings', label: 'accounts.savings' },
]

export const FLOWS: FlowDef[] = [
  {
    id: 'paynow',
    title: 'flows.paynow',
    guideId: 'paynow',
    kind: 'payment',
    payeeField: 'to',
    amountField: 'amount',
    fields: [
      { id: 'proxy', guide: 'paynow-proxy', label: 'flows.proxyType', type: 'select', sample: 'mobile', options: [
        { value: 'mobile', label: 'flows.mobile' },
        { value: 'nric', label: 'flows.nric' },
        { value: 'uen', label: 'flows.uen' },
      ] },
      { id: 'to', guide: 'paynow-to', label: 'flows.paynowTo', type: 'text', inputMode: 'numeric', placeholder: 'flows.paynowPh', sample: '91234567' },
      { id: 'from', guide: 'paynow-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'paynow-amount', label: 'amount', type: 'amount', inputMode: 'decimal', placeholder: '0.00', sample: '20.00' },
      { id: 'reference', guide: 'paynow-reference', label: 'flows.reference', type: 'text', placeholder: 'optional', sample: 'Lunch' },
      { id: 'savePayee', guide: 'paynow-save', label: 'flows.savePayee', type: 'toggle', sample: 'no' },
      { id: 'when', guide: 'paynow-when', label: 'flows.when', type: 'select', sample: 'now', options: [
        { value: 'now', label: 'flows.now' },
        { value: 'later', label: 'flows.later' },
      ] },
      { id: 'laterDate', guide: 'paynow-date', label: 'flows.laterDate', type: 'text', placeholder: 'flows.datePh', sample: '2026-11-01' },
    ],
  },
  {
    id: 'transfer',
    title: 'flows.transfer',
    guideId: 'transfer',
    kind: 'payment',
    payeeField: 'name',
    amountField: 'amount',
    fields: [
      { id: 'name', guide: 'transfer-name', label: 'flows.recipient', type: 'text', sample: 'Tan Wei Ming' },
      { id: 'bank', guide: 'transfer-bank', label: 'flows.bank', type: 'select', sample: 'OCBC', options: [
        { value: 'OCBC', label: 'flows.bankOcbc' },
        { value: 'DBS', label: 'flows.bankDbs' },
        { value: 'UOB', label: 'flows.bankUob' },
      ] },
      { id: 'account', guide: 'transfer-account', label: 'flows.account10', type: 'text', inputMode: 'numeric', sample: '1234567890' },
      { id: 'from', guide: 'transfer-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'transfer-amount', label: 'amount', type: 'amount', inputMode: 'decimal', sample: '50.00' },
      { id: 'savePayee', guide: 'transfer-save', label: 'flows.savePayee', type: 'toggle', sample: 'no' },
      { id: 'when', guide: 'transfer-when', label: 'flows.when', type: 'select', sample: 'now', options: [
        { value: 'now', label: 'flows.now' },
        { value: 'later', label: 'flows.later' },
      ] },
      { id: 'laterDate', guide: 'transfer-date', label: 'flows.laterDate', type: 'text', placeholder: 'flows.datePh', sample: '2026-11-01' },
    ],
  },
  {
    id: 'overseas',
    title: 'flows.overseas',
    guideId: 'overseas',
    kind: 'payment',
    payeeField: 'name',
    amountField: 'amount',
    fields: [
      { id: 'name', guide: 'overseas-name', label: 'flows.recipient', type: 'text', sample: 'Tan Wei Ming' },
      { id: 'country', guide: 'overseas-country', label: 'flows.country', type: 'select', sample: 'Australia', options: [
        { value: 'Australia', label: 'flows.australia' },
        { value: 'Malaysia', label: 'flows.malaysia' },
        { value: 'United Kingdom', label: 'flows.uk' },
        { value: 'Germany', label: 'flows.germany' },
      ] },
      { id: 'swift', guide: 'overseas-swift', label: 'flows.swift', type: 'text', sample: 'CTBAAU2S' },
      { id: 'account', guide: 'overseas-account', label: 'flows.accountNumber', type: 'text', sample: '1234567890' },
      { id: 'from', guide: 'overseas-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'overseas-amount', label: 'amount', type: 'amount', inputMode: 'decimal', sample: '200.00' },
      { id: 'purpose', guide: 'overseas-purpose', label: 'flows.purpose', type: 'select', sample: 'family', options: [
        { value: 'family', label: 'flows.purposeFamily' },
        { value: 'education', label: 'flows.purposeEducation' },
        { value: 'bills', label: 'flows.purposeBills' },
        { value: 'other', label: 'flows.purposeOther' },
      ] },
      { id: 'savePayee', guide: 'overseas-save', label: 'flows.savePayee', type: 'toggle', sample: 'no' },
      { id: 'when', guide: 'overseas-when', label: 'flows.when', type: 'select', sample: 'now', options: [
        { value: 'now', label: 'flows.now' },
        { value: 'later', label: 'flows.later' },
      ] },
      { id: 'laterDate', guide: 'overseas-date', label: 'flows.laterDate', type: 'text', placeholder: 'flows.datePh', sample: '2026-11-01' },
    ],
  },
  {
    id: 'bill',
    title: 'flows.bill',
    guideId: 'bill',
    kind: 'payment',
    payeeField: 'biller',
    amountField: 'amount',
    fields: [
      { id: 'biller', guide: 'bill-biller', label: 'flows.biller', type: 'select', sample: 'SP Group', options: [
        { value: 'SP Group', label: 'flows.sp' },
        { value: 'Singtel', label: 'flows.singtel' },
        { value: 'PUB', label: 'flows.pub' },
      ] },
      { id: 'ref', guide: 'bill-ref', label: 'flows.billRef', type: 'text', sample: '1002003004' },
      { id: 'from', guide: 'bill-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'bill-amount', label: 'amount', type: 'amount', inputMode: 'decimal', sample: '96.40' },
      { id: 'savePayee', guide: 'bill-save', label: 'flows.savePayee', type: 'toggle', sample: 'no' },
      { id: 'when', guide: 'bill-when', label: 'flows.when', type: 'select', sample: 'now', options: [
        { value: 'now', label: 'flows.now' },
        { value: 'later', label: 'flows.later' },
      ] },
      { id: 'laterDate', guide: 'bill-date', label: 'flows.laterDate', type: 'text', placeholder: 'flows.datePh', sample: '2026-11-01' },
    ],
  },
  {
    id: 'giro',
    title: 'flows.giro',
    guideId: 'giro',
    kind: 'setup',
    fields: [
      { id: 'org', guide: 'giro-org', label: 'flows.billingOrg', type: 'text', sample: 'SP Group' },
      { id: 'from', guide: 'giro-account', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'limit', guide: 'giro-limit', label: 'flows.giroLimit', type: 'amount', inputMode: 'decimal', sample: '200.00' },
      { id: 'day', guide: 'giro-day', label: 'flows.debitDay', type: 'select', sample: '15', options: [
        { value: '5', label: 'flows.day5' },
        { value: '15', label: 'flows.day15' },
        { value: '25', label: 'flows.day25' },
      ] },
    ],
  },
  {
    id: 'scan',
    title: 'flows.scan',
    guideId: 'scan',
    kind: 'payment',
    payeeField: 'merchant',
    amountField: 'amount',
    fields: [
      { id: 'merchant', guide: 'scan-frame', label: 'flows.merchant', type: 'text', sample: 'Hawker Stall 12' },
      { id: 'from', guide: 'scan-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'scan-amount', label: 'amount', type: 'amount', inputMode: 'decimal', sample: '6.50' },
    ],
  },
  {
    id: 'goal',
    title: 'flows.goal',
    guideId: 'goal',
    kind: 'setup',
    fields: [
      { id: 'name', guide: 'goal-name', label: 'flows.goalName', type: 'text', sample: 'Trip fund' },
      { id: 'target', guide: 'goal-target', label: 'flows.target', type: 'amount', inputMode: 'decimal', sample: '2000.00' },
      { id: 'monthly', guide: 'goal-monthly', label: 'flows.monthly', type: 'amount', inputMode: 'decimal', sample: '200.00' },
      { id: 'from', guide: 'goal-from', label: 'flows.from', type: 'account', sample: 'savings', options: depositAccounts },
    ],
  },
  {
    id: 'card-lock',
    title: 'flows.cardLock',
    guideId: 'card-lock',
    kind: 'card',
    fields: [
      { id: 'card', guide: 'card-select', label: 'flows.whichCard', type: 'select', sample: 'credit', options: [
        { value: 'debit', label: 'cards.debit' },
        { value: 'credit', label: 'cards.credit' },
      ] },
      { id: 'lock', guide: 'card-toggle', label: 'flows.lockCard', type: 'toggle', sample: 'yes' },
    ],
  },
  {
    id: 'card-lost',
    title: 'flows.cardLost',
    guideId: 'card-lost',
    kind: 'card',
    fields: [
      { id: 'card', guide: 'lost-card', label: 'flows.whichCard', type: 'select', sample: 'credit', options: [
        { value: 'debit', label: 'cards.debit' },
        { value: 'credit', label: 'cards.credit' },
      ] },
    ],
  },
  {
    id: 'limit',
    title: 'flows.limit',
    guideId: 'limit',
    kind: 'limit',
    fields: [
      { id: 'amount', guide: 'limit-new', label: 'flows.newLimit', type: 'amount', inputMode: 'decimal', sample: '1000.00' },
    ],
  },
  {
    id: 'topup',
    title: 'flows.topup',
    guideId: 'paynow',
    kind: 'payment',
    payeeField: 'to',
    amountField: 'amount',
    fields: [
      { id: 'to', guide: 'paynow-to', label: 'flows.mobileNumber', type: 'text', inputMode: 'numeric', sample: '81234567' },
      { id: 'from', guide: 'topup-from', label: 'flows.from', type: 'account', sample: '360', options: depositAccounts },
      { id: 'amount', guide: 'paynow-amount', label: 'amount', type: 'amount', inputMode: 'decimal', sample: '10.00' },
    ],
  },
]

export function flowById(id: string) {
  return FLOWS.find((flow) => flow.id === id)
}

export const JOURNEY_IDS = ['paynow', 'transfer', 'overseas', 'bill', 'giro', 'scan', 'goal', 'card-lock', 'card-lost', 'limit']

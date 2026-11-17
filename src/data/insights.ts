export const INSIGHT_CATEGORIES = ['food', 'transport', 'shopping', 'bills', 'subscriptions', 'other'] as const
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number]

export interface SpendRow {
  id?: string
  month: string
  day: number
  category: InsightCategory
  merchant: string
  amount: number
  accountId: string
}

const oct = (day: number, category: InsightCategory, merchant: string, amount: number, accountId = '360'): SpendRow =>
  ({ month: '2026-10', day, category, merchant, amount, accountId })

export const SPEND_ROWS: SpendRow[] = [
  oct(2, 'food', 'NTUC FairPrice', 122.3),
  oct(3, 'transport', 'Grab', 18.5),
  oct(4, 'food', 'Hawker stall', 8.4, 'frank'),
  oct(5, 'shopping', 'Uniqlo', 64),
  oct(6, 'bills', 'SP Group', 96.4),
  oct(7, 'subscriptions', 'Netflix', 15.98),
  oct(8, 'food', 'Cold Storage', 36.2),
  oct(9, 'transport', 'Bus and MRT', 22, 'frank'),
  oct(10, 'other', 'Guardian', 14.5),
  oct(11, 'food', 'NTUC FairPrice', 101.1),
  oct(12, 'subscriptions', 'Spotify', 9.98),
  oct(13, 'shopping', 'Shopee', 88),
  oct(14, 'transport', 'Grab', 24.6),
  oct(15, 'bills', 'Singtel', 68),
  oct(16, 'food', 'Kopitiam', 11.2, 'frank'),
  oct(18, 'food', 'NTUC FairPrice', 105.9),
  oct(19, 'transport', 'Grab', 16.8),
  oct(20, 'shopping', 'Decathlon', 108),
  oct(21, 'bills', 'Town Council', 186),
  oct(22, 'food', 'Hawker stall', 6.5, 'frank'),
  oct(23, 'other', 'Popular', 22.5),
  oct(24, 'subscriptions', 'YouTube Premium', 7.01),
  oct(25, 'food', 'Cold Storage', 28.4),
  oct(26, 'transport', 'Grab', 12.4, 'frank'),
  oct(26, 'bills', 'PUB', 189.6),
  { month: '2026-09', day: 4, category: 'food', merchant: 'NTUC FairPrice', amount: 48, accountId: '360' },
  { month: '2026-09', day: 8, category: 'food', merchant: 'Hawker stall', amount: 62, accountId: '360' },
  { month: '2026-09', day: 12, category: 'food', merchant: 'Cold Storage', amount: 90, accountId: 'frank' },
  { month: '2026-09', day: 18, category: 'food', merchant: 'Kopitiam', amount: 156, accountId: '360' },
  { month: '2026-09', day: 6, category: 'transport', merchant: 'Grab', amount: 70, accountId: '360' },
  { month: '2026-09', day: 20, category: 'transport', merchant: 'Bus and MRT', amount: 86, accountId: 'frank' },
  { month: '2026-09', day: 9, category: 'shopping', merchant: 'Shopee', amount: 140, accountId: '360' },
  { month: '2026-09', day: 22, category: 'shopping', merchant: 'Uniqlo', amount: 70, accountId: '360' },
  { month: '2026-09', day: 15, category: 'bills', merchant: 'SP Group', amount: 410, accountId: '360' },
  { month: '2026-09', day: 7, category: 'subscriptions', merchant: 'Netflix', amount: 15.98, accountId: '360' },
  { month: '2026-09', day: 7, category: 'subscriptions', merchant: 'Spotify', amount: 9.98, accountId: 'frank' },
  { month: '2026-09', day: 28, category: 'other', merchant: 'Guardian', amount: 104, accountId: '360' },
  { month: '2026-08', day: 10, category: 'food', merchant: 'NTUC FairPrice', amount: 300, accountId: '360' },
  { month: '2026-08', day: 11, category: 'transport', merchant: 'Grab', amount: 160, accountId: '360' },
  { month: '2026-08', day: 12, category: 'shopping', merchant: 'Shopee', amount: 220, accountId: '360' },
  { month: '2026-08', day: 13, category: 'bills', merchant: 'SP Group', amount: 380, accountId: '360' },
  { month: '2026-08', day: 14, category: 'subscriptions', merchant: 'Netflix', amount: 33, accountId: 'frank' },
  { month: '2026-08', day: 15, category: 'other', merchant: 'Popular', amount: 95, accountId: '360' },
  { month: '2026-07', day: 8, category: 'food', merchant: 'NTUC FairPrice', amount: 280, accountId: '360' },
  { month: '2026-07', day: 9, category: 'transport', merchant: 'Grab', amount: 140, accountId: '360' },
  { month: '2026-07', day: 10, category: 'shopping', merchant: 'Uniqlo', amount: 180, accountId: '360' },
  { month: '2026-07', day: 11, category: 'bills', merchant: 'Singtel', amount: 320, accountId: '360' },
  { month: '2026-07', day: 12, category: 'subscriptions', merchant: 'Spotify', amount: 30, accountId: 'frank' },
  { month: '2026-07', day: 13, category: 'other', merchant: 'Guardian', amount: 60, accountId: '360' },
  { month: '2026-06', day: 5, category: 'food', merchant: 'Cold Storage', amount: 310, accountId: '360' },
  { month: '2026-06', day: 6, category: 'transport', merchant: 'Grab', amount: 150, accountId: '360' },
  { month: '2026-06', day: 7, category: 'shopping', merchant: 'Shopee', amount: 200, accountId: '360' },
  { month: '2026-06', day: 8, category: 'bills', merchant: 'SP Group', amount: 340, accountId: '360' },
  { month: '2026-06', day: 9, category: 'subscriptions', merchant: 'Netflix', amount: 32, accountId: 'frank' },
  { month: '2026-06', day: 10, category: 'other', merchant: 'Popular', amount: 72, accountId: '360' },
  { month: '2026-05', day: 4, category: 'food', merchant: 'NTUC FairPrice', amount: 260, accountId: '360' },
  { month: '2026-05', day: 5, category: 'transport', merchant: 'Bus and MRT', amount: 130, accountId: '360' },
  { month: '2026-05', day: 6, category: 'shopping', merchant: 'Decathlon', amount: 170, accountId: '360' },
  { month: '2026-05', day: 7, category: 'bills', merchant: 'PUB', amount: 330, accountId: '360' },
  { month: '2026-05', day: 8, category: 'subscriptions', merchant: 'Spotify', amount: 30, accountId: 'frank' },
  { month: '2026-05', day: 9, category: 'other', merchant: 'Guardian', amount: 60, accountId: '360' },
]

export const INSIGHT_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']

export const MONTH_LABELS: Record<string, string> = {
  '2026-05': 'May',
  '2026-06': 'Jun',
  '2026-07': 'Jul',
  '2026-08': 'Aug',
  '2026-09': 'Sep',
  '2026-10': 'Oct',
}

export function rowsFor(accountId: string, month: string, excluded?: Set<string>) {
  const monthPrefix = `${month}-`
  const rows = SPEND_ROWS.filter((row) => row.month === month && (accountId === 'all' || row.accountId === accountId))
  if (!excluded?.size) return rows
  return rows.filter((row) => !excluded.has(`${monthPrefix}${String(row.day).padStart(2, '0')}|${row.merchant.toLowerCase()}|${row.amount.toFixed(2)}`))
}

export function sum(rows: SpendRow[]) {
  return rows.reduce((total, row) => total + row.amount, 0)
}

export function sumFiltered(accountId: string, month: string, excluded?: Set<string>) {
  return sum(rowsFor(accountId, month, excluded))
}

export function byCategory(rows: SpendRow[]) {
  return INSIGHT_CATEGORIES.map((key) => ({
    key,
    amount: rows.filter((row) => row.category === key).reduce((total, row) => total + row.amount, 0),
  }))
}

export function topMerchants(rows: SpendRow[]) {
  const totals = new Map<string, number>()
  rows.forEach((row) => totals.set(row.merchant, (totals.get(row.merchant) || 0) + row.amount))
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, amount]) => ({ name, amount }))
}

export function dailyTotals(rows: SpendRow[]) {
  const days = new Map<number, number>()
  rows.forEach((row) => days.set(row.day, (days.get(row.day) || 0) + row.amount))
  return [...days.entries()].sort((a, b) => a[0] - b[0]).map(([day, amount]) => ({ day: String(day), amount: Math.round(amount * 100) / 100 }))
}

export function monthTotals(accountId: string) {
  return INSIGHT_MONTHS.map((month) => ({
    month,
    label: MONTH_LABELS[month],
    amount: Math.round(sum(rowsFor(accountId, month)) * 100) / 100,
  }))
}

export function previousMonth(month: string) {
  const index = INSIGHT_MONTHS.indexOf(month)
  return index > 0 ? INSIGHT_MONTHS[index - 1] : null
}

export function percentChange(current: number, previous: number) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

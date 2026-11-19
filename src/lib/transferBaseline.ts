import type { TransferRecord } from './transferHistory.ts'

const DAY = 24 * 60 * 60 * 1000
const WINDOW = 180 * DAY

export interface TransferBaseline {
  median: number
  p95: number
  perPayee: Record<string, number>
  overseasCount: number
  recentCount10m: number
  typicalHour: number | null
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index]
}

export function buildBaseline(history: TransferRecord[], now = Date.now()): TransferBaseline {
  const rows = history.filter((row) => now - row.at < WINDOW && row.amount > 0)
  const amounts = rows.map((row) => row.amount)
  const perPayee: Record<string, number[]> = {}
  let overseasCount = 0
  const hourBuckets = new Array(24).fill(0)

  for (const row of rows) {
    const key = row.payeeKey.toLowerCase()
    if (!perPayee[key]) perPayee[key] = []
    perPayee[key].push(row.amount)
    if (key.startsWith('overseas')) overseasCount += 1
    const hour = new Date(row.at).getHours()
    hourBuckets[hour] += 1
  }

  const perPayeeMedian: Record<string, number> = {}
  for (const [key, list] of Object.entries(perPayee)) {
    perPayeeMedian[key] = median(list)
  }

  const recentCount10m = rows.filter((row) => now - row.at < 10 * 60 * 1000).length
  let typicalHour: number | null = null
  let best = 0
  hourBuckets.forEach((count, hour) => {
    if (count > best) {
      best = count
      typicalHour = hour
    }
  })

  return {
    median: median(amounts),
    p95: percentile(amounts, 95),
    perPayee: perPayeeMedian,
    overseasCount,
    recentCount10m,
    typicalHour,
  }
}
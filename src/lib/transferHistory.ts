const KEY = 'ocbc-adaptive-transfer-history'
const VERSION_KEY = 'ocbc-adaptive-transfer-history-v'
const DAY = 24 * 60 * 60 * 1000
const RETENTION = 180 * DAY
export const HISTORY_SEED_VERSION = 3

export interface TransferRecord {
  userId: string
  payeeKey: string
  amount: number
  at: number
}

function read(): TransferRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TransferRecord[]) : []
  } catch {
    return []
  }
}

function write(rows: TransferRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export function loadTransferHistory(userId: string, now = Date.now()) {
  return read().filter((row) => row.userId === userId && now - row.at < RETENTION)
}

export function recordTransfer(entry: TransferRecord) {
  const now = entry.at
  const next = read().filter((row) => now - row.at < RETENTION)
  next.push(entry)
  write(next)
}

export function clearTransferHistory() {
  localStorage.removeItem(KEY)
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(VERSION_KEY)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
}

function seedRows(userId: string, payeeKey: string, amounts: number[], daysAgo: number[]) {
  const now = Date.now()
  return amounts.map((amount, index) => ({
    userId,
    payeeKey,
    amount,
    at: now - (daysAgo[index] ?? index + 1) * DAY,
  }))
}

export function ensureSeededTransferHistory(userId: string) {
  const version = Number(localStorage.getItem(VERSION_KEY + userId) || 0)
  if (version >= HISTORY_SEED_VERSION) return
  const existing = read().filter((row) => row.userId === userId)
  const rows: TransferRecord[] = [...existing]
  if (userId === 'auntiemei' || userId === 'persona-mei') {
    rows.push(
      ...seedRows(userId, 'local:john tan:ocbc', [30, 45, 50, 35, 40, 28, 55], [3, 10, 18, 28, 40, 55, 70]),
      ...seedRows(userId, 'paynow:91234567', [20, 25, 18], [5, 12, 22]),
      ...seedRows(userId, 'overseas-name:tan wei ming:australia', [80, 120], [15, 45]),
    )
  } else if (userId === 'arif' || userId === 'persona-arif') {
    rows.push(
      ...seedRows(userId, 'paynow:81234567', [15, 20, 12], [2, 8, 20]),
      ...seedRows(userId, 'local:john tan:ocbc', [25, 30], [6, 30]),
    )
  }
  const deduped = rows.filter((row, index, all) => index === all.findIndex((item) => item.userId === row.userId && item.payeeKey === row.payeeKey && item.at === row.at))
  write([...read().filter((row) => row.userId !== userId), ...deduped])
  localStorage.setItem(VERSION_KEY + userId, String(HISTORY_SEED_VERSION))
}
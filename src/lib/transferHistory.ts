const KEY = 'ocbc-adaptive-transfer-history'
const DAY = 24 * 60 * 60 * 1000

export interface TransferRecord {
  userId: string
  payeeKey: string
  amount: number
  at: number
}

function read(): TransferRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as TransferRecord[] : []
  } catch {
    return []
  }
}

function write(rows: TransferRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export function loadTransferHistory(userId: string, now = Date.now()) {
  return read().filter((row) => row.userId === userId && now - row.at < DAY)
}

export function recordTransfer(entry: TransferRecord) {
  const now = entry.at
  const next = read().filter((row) => now - row.at < DAY)
  next.push(entry)
  write(next)
}

export function clearTransferHistory() {
  localStorage.removeItem(KEY)
}

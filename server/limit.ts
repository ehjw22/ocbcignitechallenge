const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimited(key: string, max: number) {
  const now = Date.now()
  if (buckets.size > 5000) buckets.clear()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > max
}

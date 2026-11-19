import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

async function main() {
  let chromium
  try {
    const pkg = await import('playwright')
    chromium = pkg.chromium
  } catch {
    console.log('present-check: playwright not installed, skipping')
    return
  }

  const base = process.env.PRESENT_URL || 'http://127.0.0.1:5173/?present=1'
  const browser = await chromium.launch()
  for (const size of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    const page = await browser.newPage({ viewport: size })
    await page.goto(base, { waitUntil: 'networkidle' })
    const box = await page.locator('.phone-frame').boundingBox()
    if (!box) throw new Error(`phone frame missing at ${size.width}x${size.height}`)
    const ratio = box.height / size.height
  if (ratio < 0.85) {
      throw new Error(`phone height ratio ${ratio.toFixed(2)} < 0.85 at ${size.width}x${size.height}`)
    }
    const path = `docs/present-${size.width}x${size.height}.png`
    await page.screenshot({ path, fullPage: true })
    console.log(`present-check OK ${size.width}x${size.height} ratio=${ratio.toFixed(2)} -> ${path}`)
    await page.close()
  }
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
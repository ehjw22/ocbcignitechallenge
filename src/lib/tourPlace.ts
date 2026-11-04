const opened = new Set<HTMLButtonElement>()

export function expandFor(el: Element | null) {
  if (!el) return
  const sections = new Set<Element>()
  let node: Element | null = el
  while (node) {
    const section: Element | null = node.closest('section')
    if (section && !sections.has(section)) {
      sections.add(section)
      const toggle = section.querySelector('button[aria-expanded="false"]')
      if (toggle instanceof HTMLButtonElement && section.contains(el)) {
        toggle.click()
        opened.add(toggle)
      }
    }
    node = node.parentElement
  }
}

export function collapseOpened() {
  opened.forEach((button) => {
    if (button.isConnected && button.getAttribute('aria-expanded') === 'true') button.click()
  })
  opened.clear()
}

function frames(count: number) {
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    let left = count
    const step = () => {
      left -= 1
      if (left <= 0) finish()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    setTimeout(finish, 50 * count)
  })
}

export function scrollTarget(el: HTMLElement) {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    const scrollX = style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'overlay'
    if (scrollX && node.scrollWidth > node.clientWidth + 1) {
      const box = el.getBoundingClientRect()
      const frame = node.getBoundingClientRect()
      node.scrollLeft += box.left - frame.left - (frame.width - box.width) / 2
    }
    node = node.parentElement
  }
  el.scrollIntoView({ block: 'center', inline: 'center' })
  const root = document.getElementById('customer-root')
  const main = el.closest('main') as HTMLElement | null
  if (!root || !main) return
  const headerBottom = root.querySelector('header')?.getBoundingClientRect().bottom ?? root.getBoundingClientRect().top + 56
  const navTop = root.querySelector('nav')?.getBoundingClientRect().top ?? root.getBoundingClientRect().bottom
  const box = el.getBoundingClientRect()
  if (box.top < headerBottom + 8 || box.bottom > navTop - 8) {
    main.scrollTop += box.top - headerBottom - 12
  }
}

export function targetVisible(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return false
  const root = document.getElementById('customer-root')?.getBoundingClientRect()
  if (!root) return false
  const headerBottom = document.querySelector('#customer-root header')?.getBoundingClientRect().bottom ?? root.top
  const navTop = document.querySelector('#customer-root nav')?.getBoundingClientRect().top ?? root.bottom
  const wide = rect.width > root.width - 4
  const visibleWidth = Math.min(rect.right, root.right) - Math.max(rect.left, root.left)
  const insideX = wide ? visibleWidth > 40 : rect.left >= root.left - 2 && rect.right <= root.right + 2
  const band = navTop - headerBottom
  if (rect.height > band * 0.65) return insideX && rect.top <= headerBottom + 24 && rect.top >= headerBottom - 48
  const insideY = rect.top >= headerBottom - 4 && rect.bottom <= navTop - 4
  return insideX && insideY
}

export async function prepareTarget(element: string) {
  const sel = `[data-guide="${CSS.escape(element)}"]`
  const start = performance.now()
  while (performance.now() - start < 1500) {
    const el = document.querySelector(sel)
    if (el instanceof HTMLElement) {
      expandFor(el)
      await frames(2)
      scrollTarget(el)
      await frames(2)
      if (targetVisible(el)) return el
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 40))
  }
  return null
}

export function readableText(main: HTMLElement | null, title = '') {
  const parts: string[] = []
  if (title.trim()) parts.push(title.trim())
  if (!main) return parts.join('. ')
  const nodes = main.querySelectorAll('h1, h2, h3, p, label, button, a, li')
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.closest('[aria-hidden="true"], nav, [data-tour-card], [data-ollie]')) return
    if (node.offsetParent === null && getComputedStyle(node).position !== 'fixed') return
    const text = node.innerText.replace(/\s+/g, ' ').trim()
    if (!text || text.length > 220) return
    if (node.closest('[data-skip-speech]')) return
    if (/^[A-Z]{2,4}$/.test(text) || text === '360') return
    if (text.includes('••••') || /^[•.\s]+$/.test(text)) return
    if (parts[parts.length - 1] === text) return
    parts.push(text)
  })
  return parts.join('. ').slice(0, 900)
}

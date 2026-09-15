/**
 * Automated UI audit.
 *
 * This script does not change the product. It only measures it, so that UI
 * fixes can be driven by facts instead of guesses. It logs in with the demo
 * seed credentials, visits every private route in four viewports and both
 * color schemes, and writes machine-readable reports under `audit/`.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:4173'
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? 'audit'
const SHOTS_DIR = `${OUT_DIR}/screenshots`

// Mirrors src/routes/privateRoutes.ts (root redirects to /dashboard).
const ROUTES = [
  '/dashboard',
  '/organization',
  '/meetings',
  '/resolutions',
  '/tasks',
  '/reports',
  '/requests',
  '/notifications',
  '/files',
  '/audit',
  '/calendar',
  '/performance',
  '/settings',
  '/search',
]

const VIEWPORTS = [
  { name: 'wide', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 402, height: 844 },
]

const SCHEMES = ['light', 'dark']

// Demo-seed identity from src/features/auth/demoAuthSeed.ts (frontend-only mock).
const USERNAME = process.env.AUDIT_USERNAME ?? 'ceo@kiagostar.ir'
const PASSWORD = process.env.AUDIT_PASSWORD ?? 'KiaGostar@1403'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function ensureLoggedIn(page) {
  const username = page.locator('#username')
  if ((await username.count()) === 0) return false
  await username.fill(USERNAME)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('form.login-form button[type=submit]').click()
  await page.waitForSelector('#username', { state: 'detached', timeout: 15000 }).catch(() => {})
  await sleep(600)
  return true
}

/** Runs inside the page. Returns only measurable facts, never opinions. */
function collect() {
  const round = (value) => Math.round(value * 100) / 100
  const px = (value) => round(Number.parseFloat(value) || 0)
  const visible = (el) => {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    const style = getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
  }
  const label = (el) => {
    const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`
  }

  const docWidth = document.documentElement.scrollWidth
  const viewWidth = window.innerWidth
  const overflowElements = []
  const clippedText = []
  const smallTapTargets = []
  const missingNames = []
  const focusHidden = []
  const rawIdentifiers = []
  const latinLeaks = []

  const all = Array.from(document.querySelectorAll('body *')).filter(visible)

  for (const el of all) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && (rect.right > viewWidth + 1 || rect.left < -1) && el.children.length === 0) {
      overflowElements.push({ el: label(el), left: round(rect.left), right: round(rect.right) })
    }
    const style = getComputedStyle(el)
    if (
      el.scrollWidth > el.clientWidth + 1 &&
      (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis') &&
      el.textContent &&
      el.textContent.trim().length > 0 &&
      el.children.length === 0
    ) {
      clippedText.push({ el: label(el), text: el.textContent.trim().slice(0, 40), clientWidth: round(el.clientWidth), scrollWidth: round(el.scrollWidth) })
    }
  }

  const controlSelector = 'button, [role="button"], a.btn, input, select, textarea'
  const controls = Array.from(document.querySelectorAll(controlSelector)).filter(visible)
  const controlMetrics = []
  for (const el of controls) {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const tag = el.tagName.toLowerCase()
    const variant = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''
    const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
    controlMetrics.push({
      el: label(el),
      kind: tag,
      variant,
      height: round(rect.height),
      minHeight: px(style.minHeight),
      paddingBlock: `${px(style.paddingTop)}/${px(style.paddingBottom)}`,
      paddingInline: `${px(style.paddingInlineStart || style.paddingRight)}/${px(style.paddingInlineEnd || style.paddingLeft)}`,
      radius: px(style.borderTopLeftRadius),
      fontSize: px(style.fontSize),
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
      gap: px(style.columnGap),
      alignItems: style.alignItems,
    })

    if (tag === 'button' || el.getAttribute('role') === 'button') {
      if (!text && !el.getAttribute('title')) missingNames.push({ el: label(el), reason: 'no accessible name' })
      if (rect.height > 0 && rect.height < 32) smallTapTargets.push({ el: label(el), text: text.slice(0, 24), height: round(rect.height), width: round(rect.width) })
      if (style.outlineStyle === 'none' && style.boxShadow === 'none') focusHidden.push(label(el))
    }
    if ((tag === 'input' || tag === 'select' || tag === 'textarea') && el.type !== 'hidden') {
      const id = el.getAttribute('id')
      const labelled = Boolean(
        el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          (id && document.querySelector(`label[for="${id}"]`)) ||
          el.closest('label'),
      )
      if (!labelled) missingNames.push({ el: label(el), reason: 'form control without label' })
    }
  }

  // Icon alignment inside controls: an icon whose vertical center drifts from
  // the control's center is the classic "icon sits high/low" symptom.
  const iconDrift = []
  for (const el of controls) {
    const icon = el.querySelector('svg, i, .icon, [class*="icon"]')
    if (!icon) continue
    const host = el.getBoundingClientRect()
    const box = icon.getBoundingClientRect()
    if (host.height === 0 || box.height === 0) continue
    const drift = round(box.top + box.height / 2 - (host.top + host.height / 2))
    if (Math.abs(drift) > 1.5) iconDrift.push({ el: label(el), drift, iconSize: `${round(box.width)}x${round(box.height)}` })
  }

  // Typography and spacing spread across rendered text nodes.
  const typography = {}
  const spacing = {}
  for (const el of all) {
    const style = getComputedStyle(el)
    const hasOwnText = Array.from(el.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim().length > 0)
    if (hasOwnText) {
      const key = `${px(style.fontSize)}px/${style.lineHeight}/${style.fontWeight}`
      typography[key] = (typography[key] ?? 0) + 1
    }
    for (const prop of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'rowGap', 'columnGap']) {
      const value = px(style[prop])
      if (value > 0) spacing[value] = (spacing[value] ?? 0) + 1
    }
  }

  // Visible text that leaks engineering detail to a Persian business user.
  const textNodes = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const value = node.textContent.trim()
    if (!value) continue
    const parent = node.parentElement
    if (!parent || !visible(parent)) continue
    textNodes.push({ text: value, el: label(parent) })
  }
  for (const { text, el } of textNodes) {
    if (/\b[A-Z][A-Z0-9]{2,}(_[A-Z0-9]+)+\b/.test(text)) rawIdentifiers.push({ el, text: text.slice(0, 60), kind: 'raw enum' })
    else if (/\b(usr|dep|pos|mtg|tsk|rpt|req|dec)-[a-z0-9-]{3,}\b/i.test(text)) rawIdentifiers.push({ el, text: text.slice(0, 60), kind: 'internal id' })
    else if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) rawIdentifiers.push({ el, text: text.slice(0, 60), kind: 'uuid' })
    else if (/^[A-Za-z][A-Za-z ,.'()/-]{2,}$/.test(text) && !/^[A-Z]{2,5}$/.test(text)) latinLeaks.push({ el, text: text.slice(0, 60) })
  }

  return {
    direction: document.documentElement.dir,
    lang: document.documentElement.lang,
    theme: document.documentElement.dataset.theme ?? null,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    background: getComputedStyle(document.body).backgroundColor,
    color: getComputedStyle(document.body).color,
    horizontalOverflow: docWidth > viewWidth + 1 ? { docWidth, viewWidth } : null,
    counts: {
      controls: controls.length,
      overflowElements: overflowElements.length,
      clippedText: clippedText.length,
      smallTapTargets: smallTapTargets.length,
      missingNames: missingNames.length,
      iconDrift: iconDrift.length,
      focusHidden: focusHidden.length,
      rawIdentifiers: rawIdentifiers.length,
      latinLeaks: latinLeaks.length,
    },
    overflowElements: overflowElements.slice(0, 40),
    clippedText: clippedText.slice(0, 40),
    smallTapTargets: smallTapTargets.slice(0, 40),
    missingNames: missingNames.slice(0, 40),
    iconDrift: iconDrift.slice(0, 40),
    focusHidden: Array.from(new Set(focusHidden)).slice(0, 40),
    rawIdentifiers: rawIdentifiers.slice(0, 60),
    latinLeaks: latinLeaks.slice(0, 60),
    controlMetrics,
    typography,
    spacing,
  }
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true })
  const browser = await chromium.launch()
  const report = { baseUrl: BASE_URL, generatedAt: new Date().toISOString(), runs: [], failures: [] }

  for (const scheme of SCHEMES) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: scheme,
        locale: 'fa-IR',
        timezoneId: 'Asia/Tehran',
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      const consoleMessages = []
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleMessages.push({ type: message.type(), text: message.text().slice(0, 300) })
        }
      })
      page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: String(error).slice(0, 300) }))

      try {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 30000 })
        await ensureLoggedIn(page)
      } catch (error) {
        report.failures.push({ scheme, viewport: viewport.name, stage: 'login', error: String(error).slice(0, 300) })
      }

      for (const route of ROUTES) {
        const before = consoleMessages.length
        try {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30000 })
          await ensureLoggedIn(page)
          await sleep(900)
          const data = await page.evaluate(collect)
          await page.screenshot({ path: `${SHOTS_DIR}/${scheme}-${viewport.name}${route.replace(/\//g, '_')}.png`, fullPage: true })
          report.runs.push({
            route,
            scheme,
            viewport: viewport.name,
            width: viewport.width,
            console: consoleMessages.slice(before),
            ...data,
          })
        } catch (error) {
          report.failures.push({ scheme, viewport: viewport.name, route, error: String(error).slice(0, 300) })
        }
      }

      await context.close()
    }
  }

  await browser.close()

  await writeFile(`${OUT_DIR}/ui-audit.json`, JSON.stringify(report, null, 1), 'utf8')
  await writeFile(`${OUT_DIR}/ui-audit-summary.md`, summarize(report), 'utf8')
  console.log(`audited ${report.runs.length} route/viewport/scheme combinations, ${report.failures.length} failures`)
}

function summarize(report) {
  const lines = ['# UI audit summary', '', `Generated: ${report.generatedAt}`, `Combinations audited: ${report.runs.length}`, `Failures: ${report.failures.length}`, '']

  if (report.failures.length > 0) {
    lines.push('## Failures', '')
    for (const failure of report.failures.slice(0, 40)) {
      lines.push(`- ${failure.scheme ?? '-'} / ${failure.viewport ?? '-'} / ${failure.route ?? failure.stage}: ${failure.error}`)
    }
    lines.push('')
  }

  lines.push('## Per-combination counts', '', '| route | scheme | viewport | h-overflow | overflow els | clipped | small taps | no name | icon drift | raw ids | latin | console |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const run of report.runs) {
    lines.push(
      `| ${run.route} | ${run.scheme} | ${run.viewport} | ${run.horizontalOverflow ? 'YES' : '-'} | ${run.counts.overflowElements} | ${run.counts.clippedText} | ${run.counts.smallTapTargets} | ${run.counts.missingNames} | ${run.counts.iconDrift} | ${run.counts.rawIdentifiers} | ${run.counts.latinLeaks} | ${run.console.length} |`,
    )
  }
  lines.push('')

  // Control drift: same variant rendering at different heights is a systemic bug.
  const byVariant = new Map()
  for (const run of report.runs) {
    for (const control of run.controlMetrics ?? []) {
      const key = `${run.viewport}|${control.kind}|${control.variant}`
      const entry = byVariant.get(key) ?? { heights: new Set(), radii: new Set(), fontSizes: new Set(), paddings: new Set(), count: 0 }
      entry.heights.add(control.height)
      entry.radii.add(control.radius)
      entry.fontSizes.add(control.fontSize)
      entry.paddings.add(control.paddingBlock)
      entry.count += 1
      byVariant.set(key, entry)
    }
  }
  lines.push('## Control drift (same variant, different metrics)', '', '| viewport\\|kind\\|variant | n | heights | radii | font sizes | padding-block |', '| --- | --- | --- | --- | --- | --- |')
  for (const [key, entry] of [...byVariant.entries()].sort((a, b) => b[1].heights.size - a[1].heights.size).slice(0, 60)) {
    if (entry.heights.size < 2 && entry.radii.size < 2 && entry.fontSizes.size < 2) continue
    lines.push(`| ${key} | ${entry.count} | ${[...entry.heights].sort((a, b) => a - b).join(', ')} | ${[...entry.radii].join(', ')} | ${[...entry.fontSizes].join(', ')} | ${[...entry.paddings].join(', ')} |`)
  }
  lines.push('')

  const typography = new Map()
  const spacing = new Map()
  for (const run of report.runs) {
    for (const [key, value] of Object.entries(run.typography ?? {})) typography.set(key, (typography.get(key) ?? 0) + value)
    for (const [key, value] of Object.entries(run.spacing ?? {})) spacing.set(key, (spacing.get(key) ?? 0) + value)
  }
  lines.push(`## Typography combinations: ${typography.size}`, '')
  for (const [key, count] of [...typography.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) lines.push(`- ${key} — ${count}`)
  lines.push('', `## Distinct spacing values: ${spacing.size}`, '')
  lines.push([...spacing.keys()].map(Number).sort((a, b) => a - b).join(', '))
  lines.push('')

  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

// UI 전용 빠른 반복 하네스. WebGL을 쓰지 않으므로 GPU 락을 잡지 않는다.
// 최종 검증은 반드시 tools/shoot.mjs(notebook-open / deduction-board)로 한다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const argv = process.argv.slice(2)
const outIdx = argv.indexOf('--out')
const OUT = outIdx >= 0 ? argv[outIdx + 1] : 'shots/ui'
const only = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1))
const NAMES = only.length ? only : ['notebook-open', 'deduction-board', 'notebook-present', 'notebook-photos', 'hud-prompt', 'subtitle-line']
const PORT = Number(process.env.SHOT_PORT || 5480)

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })

async function waitPort (ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://localhost:${PORT}/tools/ui-selftest.html`); if (r.ok) return true } catch {}
    await sleep(200)
  }
  throw new Error('vite did not start')
}

try {
  await waitPort()
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const DSF = Number(process.env.DSF || 1)
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: DSF })
  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
  await page.goto(`http://localhost:${PORT}/tools/ui-selftest.html`, { waitUntil: 'load' })
  await page.waitForFunction('window.__UI__ && window.__UI__.ready', null, { timeout: 30000 })
  for (const n of NAMES) {
    const t0 = Date.now()
    await page.evaluate(name => window.__UI__.go(name), n)
    await page.screenshot({ path: `${OUT}/${n}.png` })
    console.log(`  ✓ ${n}  ${Date.now() - t0}ms`)
  }
  const errs = await page.evaluate(() => window.__UI__.errors)
  const report = { console: [...new Set(logs)], errors: errs }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  if (report.console.length) console.log('console:\n' + report.console.join('\n'))
  if (errs.length) console.log('errors:\n' + errs.join('\n'))
  await browser.close()
} finally {
  try { server.kill('SIGKILL') } catch {}
}
process.exit(0)

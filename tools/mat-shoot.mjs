// MATERIALS 단독 검수 촬영. tools/mat-selftest.html의 3개 뷰를 찍고 콘솔을 수집한다.
//   node tools/mat-shoot.mjs [--out shots/mat]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const argv = process.argv.slice(2)
const oi = argv.indexOf('--out')
const OUT = oi >= 0 ? argv[oi + 1] : 'shots/mat'
const PORT = Number(process.env.SHOT_PORT || 5399)
const VIEWS = ['grid', 'tile', 'graze']

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })

try {
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
    await sleep(250)
  }
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--force-color-profile=srgb']
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))

  for (const v of VIEWS) {
    await page.goto(`http://localhost:${PORT}/tools/mat-selftest.html?view=${v}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForFunction('window.__MATREADY__ === true', null, { timeout: 90000 })
    await page.screenshot({ path: `${OUT}/${v}.png` })
    console.log(`  ✓ ${v}`)
  }
  writeFileSync(`${OUT}/console.json`, JSON.stringify([...new Set(logs)], null, 2))
  if (logs.length) console.log('console issues:\n' + [...new Set(logs)].map(s => '  ' + s).join('\n'))
  else console.log('console clean')
  await browser.close()
} finally {
  try { server.kill('SIGKILL') } catch {}
}
process.exit(0)

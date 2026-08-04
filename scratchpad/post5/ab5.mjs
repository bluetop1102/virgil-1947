// A/B 진단 촬영. 노출을 고정하고(자동노출이 A/B를 상쇄한다) 임의의 런타임 변이를 건 뒤 찍는다.
//   node ab.mjs <outdir> <name>=<js> [<name>=<js> ...]
// js 안에서 P = pipeline, U = composite 유니폼.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const LOCK = new URL('../../.shot-lock', import.meta.url).pathname
const PORT = Number(process.env.SHOT_PORT || 5926)
const TAG = `pid=${process.pid} port=${PORT}`
let holds = false
for (let i = 0; ; i++) {
  try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, TAG); holds = true; break } catch {}
  try { if (Date.now() - statSync(LOCK).mtimeMs > 15 * 60 * 1000) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
  if (i === 0) console.log('  GPU 락 대기 중')
  if (i > 900) break
  await sleep(2000)
}
const release = () => { if (!holds) return; try { if (readFileSync(`${LOCK}/owner`, 'utf8') === TAG) rmSync(LOCK, { recursive: true, force: true }) } catch {}; holds = false }

const [outDir, ...cases] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { release(); try { server.kill('SIGKILL') } catch {} })
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1) })
for (let i = 0; i < 240; i++) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {} await sleep(250) }

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-frame-rate-limit', '--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
page.setDefaultTimeout(240000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load' })
try { await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 60000 }) } catch (e) { console.log('READY FAIL', JSON.stringify(logs).slice(0,3000)); console.log('URL', page.url(), 'TITLE', await page.title()); console.log('BODY', (await page.content()).slice(0,800)); throw e }
await page.evaluate(() => window.__CECIL__.warmup())
await page.evaluate(n => window.__CECIL__.goto(n), 'atmo-corridor-night')

// 노출 고정: measure()를 상수로 대체한다. 값은 첫 정착 프레임의 실측치.
const ev = await page.evaluate(() => {
  const p = window.__ENGINE__.get('pipeline')
  return p.composite.exposure
})
console.log('  pinned exposure', ev)
await page.evaluate(v => {
  const p = window.__ENGINE__.get('pipeline')
  Object.defineProperty(p.composite, 'exposure', { get: () => v, set: () => {}, configurable: true })
}, ev)

for (const c of cases) {
  const i = c.indexOf('=')
  const name = c.slice(0, i)
  const js = c.slice(i + 1)
  await page.evaluate(src => {
    const P = window.__ENGINE__.get('pipeline')
    const U = P.composite.mat.uniforms
    // eslint-disable-next-line no-new-func
    new Function('P', 'U', src)(P, U)
  }, js)
  // 이름이 '0:'으로 시작하면 dt=0 으로 굴린다 — 시간이 안 흐르므로 연기·점멸이 A/B를 오염시키지 않는다.
  const dt = name.startsWith('0:') ? 0 : 1 / 60
  await page.evaluate(d => { for (let i = 0; i < 40; i++) window.__ENGINE__.frame(d) }, dt)
  await page.screenshot({ path: `${outDir}/${name.replace(/^0:/, '')}.png`, timeout: 120000 })
  console.log('  ✓', `${outDir}/${name}.png`)
}
console.log('  console:', JSON.stringify(logs))
await browser.close()
release()
process.exit(0)

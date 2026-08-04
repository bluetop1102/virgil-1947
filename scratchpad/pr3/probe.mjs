// POST r2 진단 하네스. shoot.mjs 와 달리 (1) 노출을 상수로 고정하고 (2) 한 페이지 세션 안에서
// 여러 구성을 찍어 프레임 버퍼를 메모리에 남긴 뒤 (3) 교차 통계를 in-page 로 계산한다.
// 노출이 떠 있으면 볼류메트릭 A/B 는 자동노출 되먹임에 흡수돼 전부 무효다.
//   node scratchpad/pr2/probe.mjs --plan scratchpad/pr2/plan-x.mjs --out scratchpad/pr2/x
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const PLAN = arg('--plan')
const OUT = arg('--out', 'scratchpad/pr2/out')
const SHOT = arg('--shot', 'atmo-corridor-night')
const PORT = Number(process.env.SHOT_PORT || 5904)
const W = 1280, H = 720

const LOCK = new URL('../../.shot-lock', import.meta.url).pathname
const TAG = `pid=${process.pid} port=${PORT}`
let holds = false
async function lock () {
  for (let i = 0; i < 900; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, TAG); holds = true; return } catch {}
    try { if (Date.now() - statSync(LOCK).mtimeMs > 15 * 60 * 1000) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
    if (i === 0) console.log('  GPU 락 대기 중')
    await sleep(2000)
  }
}
function unlock () {
  if (!holds) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== TAG) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holds = false
}

// 좀비 vite 가 옛 모듈을 서빙하면 이 라운드의 모든 증거가 무효다(HANDOFF 3회 기록).
try { execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' }) } catch {}

const plan = (await import(new URL(`file://${process.cwd()}/${PLAN}`))).default

await lock()
const server = spawn('node_modules/.bin/vite', ['--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', detached: true, env: { ...process.env, SHOT: '1' }
})
const bye = () => { unlock(); try { process.kill(-server.pid, 'SIGKILL') } catch {} }
process.on('exit', bye)
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { bye(); process.exit(1) })

async function waitPort () {
  for (let i = 0; i < 160; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('vite did not start')
}

try {
  await waitPort()
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb']
  })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
  page.setDefaultTimeout(240000)
  await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
  await page.evaluate(() => window.__CECIL__.warmup())
  await page.evaluate(n => window.__CECIL__.goto(n), SHOT)

  // 하네스 유틸을 페이지에 심는다
  await page.evaluate(async () => {
    window.__MOODS__ = (await import('/src/world/atmo/moods.js')).MOODS
    const e = window.__ENGINE__
    const p = e.get('pipeline')
    const S = { bufs: {}, saved: {}, dust: [] }
    window.__PR = S
    S.p = p
    S.fixExposure = v => { const k = v / (p.ctx.look.exposure ?? 1); p.expo.measure = () => k }
    S.freeExposure = () => { delete p.expo.measure }
    S.effOff = n => { if (p.effects[n]) { S.saved[n] = p.effects[n]; delete p.effects[n] } }
    S.effOn = n => { if (S.saved[n]) { p.effects[n] = S.saved[n]; delete S.saved[n] } }
    S.dustHide = on => {
      if (!S.dust.length) e.scene.traverse(o => { if (o.isPoints) S.dust.push(o) })
      for (const o of S.dust) o.visible = !on
    }
    S.grab = tag => {
      const gl = e.renderer.getContext()
      e.frame(1 / 60)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
      const raw = new Uint8Array(w * h * 4)
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw)
      // readPixels 는 아래에서 위로 읽는다 — 위에서 아래(=PNG 좌표계)로 뒤집어 저장한다
      const buf = new Uint8Array(w * h * 3)
      for (let y = 0; y < h; y++) {
        const src = (h - 1 - y) * w * 4, dst = y * w * 3
        for (let x = 0; x < w; x++) {
          buf[dst + x * 3] = raw[src + x * 4]
          buf[dst + x * 3 + 1] = raw[src + x * 4 + 1]
          buf[dst + x * 3 + 2] = raw[src + x * 4 + 2]
        }
      }
      S.bufs[tag] = { buf, w, h }
      return { w, h, exposure: +Number(p.composite.exposure).toFixed(4) }
    }
    S.moods = window.__MOODS__
    S.settle = (n = 24) => { for (let i = 0; i < n; i++) e.frame(1 / 60) }
  })

  const results = []
  for (const c of plan.cases) {
    await page.evaluate(js => { const f = new Function('S', 'E', 'P', js); f(window.__PR, window.__ENGINE__, window.__PR.p) }, c.apply || '')
    await page.evaluate(() => window.__PR.settle(28))
    const info = await page.evaluate(t => window.__PR.grab(t), c.tag)
    if (c.png !== false) await page.screenshot({ path: `${OUT}/${c.tag}.png`, timeout: 120000 })
    console.log(`  ✓ ${c.tag}  ev=${info.exposure}`)
    results.push({ tag: c.tag, ...info })
  }

  const metrics = await page.evaluate(src => {
    const f = new Function('S', 'return (' + src + ')(S)')
    return f(window.__PR)
  }, plan.analyze.toString())

  writeFileSync(`${OUT}/metrics.json`, JSON.stringify({ cases: results, metrics, console: [...new Set(logs)].slice(0, 40) }, null, 2))
  console.log(JSON.stringify(metrics, null, 2))
  if (logs.length) console.log('CONSOLE ISSUES:', [...new Set(logs)].slice(0, 10))
  await browser.close()
} finally {
  unlock()
  try { process.kill(-server.pid, 'SIGKILL') } catch {}
}
process.exit(0)

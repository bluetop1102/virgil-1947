// ATMOSPHERE r2 진단 하네스. shoot.mjs와 같은 락·서버 규약을 쓰되, 한 세션 안에서
// 씬 상태를 바꿔가며 여러 장을 찍는다. 포트 선청소로 좀비 vite를 막는다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const LOCK = new URL('../../.shot-lock', import.meta.url).pathname
const PORT = Number(process.env.SHOT_PORT || 5905)
const OUT = process.env.AB_OUT || 'scratchpad/atm2'
const SHOT = process.env.AB_SHOT || 'atmo-corridor-night'
const OWNER = () => `pid=${process.pid} port=${PORT}`
let holds = false

async function lock () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER()); holds = true; return } catch {}
    try { if (Date.now() - statSync(LOCK).mtimeMs > 15 * 60 * 1000) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
    if (i === 0) console.log('  GPU 락 대기 중')
    if (i > 900) return
    await sleep(2000)
  }
}
function unlock () {
  if (!holds) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== OWNER()) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holds = false
}

try { execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' }) } catch {}

await lock()
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', env: { ...process.env, SHOT: '1' }
})
process.on('exit', () => { unlock(); try { server.kill('SIGKILL') } catch {} })
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { unlock(); process.exit(1) })

const t0 = Date.now()
while (Date.now() - t0 < 30000) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
  await sleep(250)
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb']
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
page.setDefaultTimeout(240000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())

// 새 유니폼 가드 — 좀비 vite가 옛 모듈을 서빙하면 여기서 즉시 드러난다
const guard = await page.evaluate(() => {
  const out = { shaftMats: 0, hasFbmUniforms: 0 }
  window.__ENGINE__.scene.traverse(o => {
    const u = o.material?.uniforms
    if (u && u.uSlatFreq) { out.shaftMats++; if (u.uShadowOn) out.hasFbmUniforms++ }
  })
  return out
})
console.log('  guard:', JSON.stringify(guard))

const LUM = () => {
  const e = window.__ENGINE__
  const gl = e.renderer.getContext()
  e.frame(1 / 60)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
  const buf = new Uint8Array(w * h * 4)
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf)
  const hist = new Int32Array(256)
  let sum = 0
  const n = w * h
  for (let i = 0; i < n; i++) {
    const l = (0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2]) | 0
    hist[l]++; sum += l
  }
  const rank = q => { const t = Math.ceil(n * q); let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= t) return v } return 255 }
  let dark = 0
  for (let v = 0; v <= 6; v++) dark += hist[v]
  // 심사자가 지목한 좌표 박스(원본 2560x1440 기준). readPixels는 아래에서 위로 읽으므로 y를 뒤집는다.
  const box = (x0, y0, x1, y1) => {
    let s = 0, s2 = 0, c = 0, lo = 255, rs = 0, bs = 0
    for (let y = y0; y < y1; y++) {
      const gy = h - 1 - y
      if (gy < 0 || gy >= h) continue
      for (let x = x0; x < x1; x++) {
        const i = (gy * w + x) * 4
        const l = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]
        s += l; s2 += l * l; c++; rs += buf[i]; bs += buf[i + 2]
        if (l < lo) lo = l
      }
    }
    const m = s / c
    return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / c - m * m, 0)).toFixed(1), min: lo | 0, r: +(rs / c).toFixed(0), b: +(bs / c).toFixed(0) }
  }
  const p = e.get('pipeline')
  return {
    mean: +(sum / n).toFixed(1), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999),
    darkPct: +(dark * 100 / n).toFixed(2),
    ev: p?.composite ? +Number(p.composite.exposure ?? 0).toFixed(3) : null,
    hdrAvg: p?.expo ? +Number(p.expo.stats.avg).toExponential(3) : null,
    shaftCore: box(1500, 700, 1700, 900),
    offAxis: box(900, 700, 1100, 900),
    nearWall: box(60, 780, 700, 1250),
    midWall: box(560, 380, 880, 700),
    farDoor: box(1180, 560, 1520, 900),
    darkPatch: box(0, 0, 300, 200)
  }
}

const VARIANTS = (process.env.AB_VARIANTS || 'ship,noshaft,novol,nopart').split(',')

const setup = {
  ship: () => {},
  noshaft: () => { window.__ENGINE__.scene.traverse(o => { const u = o.material?.uniforms; if (u && u.uSlatFreq) o.visible = false }) },
  shaftonly: () => {
    const p = window.__ENGINE__.get('pipeline')
    delete p.effects.volumetric
    window.__ENGINE__.scene.traverse(o => { if (o.name === 'atmo.particles') o.visible = false })
  },
  novol: () => { const p = window.__ENGINE__.get('pipeline'); delete p.effects.volumetric },
  nopart: () => { window.__ENGINE__.scene.traverse(o => { if (o.name === 'atmo.particles') o.visible = false }) },
  nohal: () => { const p = window.__ENGINE__.get('pipeline'); if (p.composite?.mat) p.composite.mat.uniforms.uHalation.value = 0 },
  // uRise는 smoke()에만 있는 유니폼이다 — 두 계열을 이름 없이 가른다
  nosmoke: () => { window.__ENGINE__.scene.traverse(o => { if (o.material?.uniforms?.uRise) o.visible = false }) },
  nodust: () => { window.__ENGINE__.scene.traverse(o => { const u = o.material?.uniforms; if (u?.uMaxPx && !u.uRise) o.visible = false }) },
  nobloom: () => { const p = window.__ENGINE__.get('pipeline'); delete p.effects.bloom },
  nodof: () => { const p = window.__ENGINE__.get('pipeline'); delete p.effects.dof }
}

const rows = []
for (const v of VARIANTS) {
  // goto는 프로브 리그를 다시 세운다 — 셋업은 반드시 goto 뒤에 와야 하고, 뒤에 또 goto하면 무효다
  await page.evaluate(n => window.__CECIL__.goto(n), SHOT)
  if (setup[v]) await page.evaluate(`(${setup[v].toString()})()`)
  const hit = await page.evaluate(() => {
    let n = 0
    window.__ENGINE__.scene.traverse(o => { const u = o.material?.uniforms; if (u && u.uSlatFreq) n += o.visible ? 1 : 100 })
    return n
  })
  // 셋업 뒤에 프레임을 다시 돌리지 않으면 캔버스에 직전 프레임이 남아 A/B가 통째로 무효가 된다.
  // 자동노출도 여기서 다시 수렴한다.
  await page.evaluate(() => window.__CECIL__.settle(120))
  await page.screenshot({ path: `${OUT}/${v}.png`, timeout: 120000 })
  const lum = await page.evaluate(LUM)
  rows.push({ v, shaftVis: hit, ...lum })
  console.log(` ${v.padEnd(10)} shafts=${hit} mean=${lum.mean} p1=${lum.p1} p999=${lum.p999} dark=${lum.darkPct}% ev=${lum.ev} hdrAvg=${lum.hdrAvg}`)
  console.log(`            core.sd=${lum.shaftCore.sd} off.sd=${lum.offAxis.sd} | near ${lum.nearWall.mean}/sd${lum.nearWall.sd}/min${lum.nearWall.min} mid ${lum.midWall.mean}/sd${lum.midWall.sd} far ${lum.farDoor.mean}/sd${lum.farDoor.sd} | patch.sd=${lum.darkPatch.sd}`)
  // 파괴적 변경은 되돌릴 수 없다 — 변형마다 페이지를 새로 로드한다
  if (v !== VARIANTS[VARIANTS.length - 1]) {
    await page.reload({ waitUntil: 'load' })
    await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
    await page.evaluate(() => window.__CECIL__.warmup())
  }
}
writeFileSync(`${OUT}/ab.json`, JSON.stringify({ rows, logs: [...new Set(logs)].slice(0, 40) }, null, 2))
if (logs.length) console.log('console:', [...new Set(logs)].slice(0, 10).join(' | '))
await browser.close()
unlock()
try { server.kill('SIGKILL') } catch {}
process.exit(0)

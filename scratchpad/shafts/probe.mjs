// 런타임 상태 덤프. 광축 셸의 유니폼이 실제로 무엇으로 채워지는지 눈이 아니라 값으로 본다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const LOCK = new URL('../../.shot-lock', import.meta.url).pathname
const PORT = Number(process.env.SHOT_PORT || 5922)
const SHOT = process.env.AB_SHOT || 'atmo-corridor-night'
const OWNER = () => `pid=${process.pid} port=${PORT}`
let holds = false
async function lock () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER()); holds = true; return } catch {}
    try { if (Date.now() - statSync(LOCK).mtimeMs > 9e5) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
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
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { unlock(); try { server.kill('SIGKILL') } catch {} })
const t0 = Date.now()
while (Date.now() - t0 < 30000) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {} await sleep(250) }
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())
await page.evaluate(n => window.__CECIL__.goto(n), SHOT)
await page.evaluate(() => window.__CECIL__.settle(120))
// 섀도맵을 CPU로 읽어 실제 내용이 있는지 본다. 비어 있으면(=far 클리어 1.0) 광축 차폐는
// 셰이더가 아무리 맞아도 영원히 1.0 이다.
const smap = await page.evaluate(() => {
  const E = window.__ENGINE__
  const dump = []
  E.scene.traverse(o => {
    if (!o.isLight || !o.castShadow || !o.shadow?.map) return
    const t = o.shadow.map
    const n = 8
    const px = new Float32Array(4 * n * n)
    let stat = null
    try {
      E.renderer.readRenderTargetPixels(t, (t.width >> 1) - n / 2, (t.height >> 1) - n / 2, n, n, px)
      let mn = 9, mx = -9, s = 0, g = 0
      for (let i = 0; i < n * n; i++) { const v = px[i * 4]; mn = Math.min(mn, v); mx = Math.max(mx, v); s += v; g += px[i * 4 + 1] }
      stat = { min: +mn.toFixed(5), max: +mx.toFixed(5), mean: +(s / (n * n)).toFixed(5), sdChan: +(g / (n * n)).toFixed(5) }
    } catch (e) { stat = { err: String(e).slice(0, 90) } }
    dump.push({ name: o.name, size: [t.width, t.height], type: t.texture.type, near: o.shadow.camera.near, far: +o.shadow.camera.far.toFixed(2), fov: +o.shadow.camera.fov.toFixed(1), center: stat })
  })
  return dump
})
console.log('SHADOWMAP:', JSON.stringify(smap))

const out = await page.evaluate(() => {
  const e = window.__ENGINE__
  const shafts = []
  e.scene.traverse(o => {
    const u = o.material?.uniforms
    if (!u?.uCosOuter) return
    const w = o.getWorldPosition(new o.position.constructor())
    shafts.push({
      len: u.uLen.value, cos: +u.uCosOuter.value.toFixed(4), inten: +u.uIntensity.value.toFixed(4),
      shadowOn: u.uShadowOn.value, hasMap: !!u.uShadowMap.value, soft: u.uSoft.value,
      res: [u.uResolution.value.x, u.uResolution.value.y], visible: o.visible,
      pos: [+w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2)]
    })
  })
  const lights = []
  e.scene.traverse(o => {
    if (!o.isLight || o.isAmbientLight || o.isHemisphereLight) return
    lights.push({ type: o.type, name: o.name, cast: o.castShadow, map: !!o.shadow?.map, inten: +o.intensity.toFixed(1), vis: o.visible })
  })
  const p = e.get('pipeline')
  return { shafts, lights, drawTris: p ? null : null, look: { hal: e.look.halation, vol: e.look.volumetricIntensity } }
})
console.log(JSON.stringify(out, null, 1))
if (logs.length) console.log('CONSOLE:', [...new Set(logs)].slice(0, 20).join('\n'))
await browser.close(); unlock(); try { server.kill('SIGKILL') } catch {}
process.exit(0)

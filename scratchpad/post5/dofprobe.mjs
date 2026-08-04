// DOF 상태 덤프: 고정 초점거리 · 조리개 · 깊이별 CoC(풀해상도 px) · 화면 지점별 실제 거리
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = Number(process.env.SHOT_PORT || 5932)
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })
for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {} await sleep(250) }

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
page.setDefaultTimeout(180000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load' })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())
await page.evaluate(n => window.__CECIL__.goto(n), 'atmo-corridor-night')
await page.evaluate(() => { for (let i = 0; i < 8; i++) window.__ENGINE__.frame(1 / 60) })

const lens = await page.evaluate(() => {
  const P = window.__ENGINE__.get('pipeline')
  const cu = P.effects.dof.mComp.uniforms
  const f = cu.uFocal.value, f0 = cu.uFocusFixed.value
  const A = f / Math.max(cu.uFstop.value, 0.7)
  const px = d => {
    const c = A * Math.abs(d - f0) / Math.max(d, 1e-3) * f / Math.max(f0 - f, 1e-3)
    const raw = c / cu.uSensor.value * cu.uPixels.value
    const near = d <= f0
    const lim = 1 - Math.min(1, Math.max(0, (d - cu.uNearLimit.value * 0.5) / (cu.uNearLimit.value * 0.5))) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (d - cu.uNearLimit.value * 0.5) / (cu.uNearLimit.value * 0.5))))
    const v = raw * (near ? cu.uNear.value * lim : 1)
    const cap = near ? cu.uMaxCoc.value * cu.uNearCap.value : cu.uMaxCoc.value
    return +Math.min(v, cap).toFixed(3)
  }
  return {
    fov: window.__ENGINE__.camera.fov,
    focal_mm: +(f * 1000).toFixed(2),
    fstop: cu.uFstop.value,
    focusFixed: f0,
    maxCoc_half: cu.uMaxCoc.value,
    nearCap: cu.uNearCap.value,
    gatherCutoff_half: 0.75,
    compositeOpen_half: 1.5,
    coc_half: [0.3, 0.6, 1.0, 2.0, 3.5, 6.0, 10.0, 30.0].map(d => `${d}m:${px(d)}`)
  }
})
const depth = await page.evaluate(async () => {
  const T = await import('/node_modules/three/build/three.module.js')
  const cam = window.__ENGINE__.camera
  const rc = new T.Raycaster()
  return [[1200, 700], [2300, 800], [1700, 1100], [550, 1050], [430, 1300]].map(([px, py]) => {
    rc.setFromCamera(new T.Vector2(px / 2560 * 2 - 1, 1 - py / 1440 * 2), cam)
    const h = rc.intersectObject(window.__ENGINE__.scene, true).filter(x => x.object.visible && x.object.material)[0]
    return `${px},${py}: ${h ? h.distance.toFixed(2) + 'm ' + (h.object.material.name || h.object.name || '?') : 'miss'}`
  })
})
console.log(JSON.stringify({ lens, depth }, null, 1))
await browser.close()
process.exit(0)

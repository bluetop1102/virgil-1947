// 임시 진단. 복도 러너 메시의 재질·uv 상태를 런타임에서 덤프한다.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = Number(process.env.SHOT_PORT || 5931)
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })
for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {} await sleep(250) }

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(180000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load' })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())
await page.evaluate(n => window.__CECIL__.goto(n), 'atmo-corridor-night')
const out = await page.evaluate(async () => {
  const T = await import('/node_modules/three/build/three.module.js')
  const cam = window.__ENGINE__.camera
  const rc = new T.Raycaster()
  const res = []
  for (const [px, py] of [[2200, 800], [2200, 1100], [1700, 1150], [1400, 830], [900, 1250], [400, 500]]) {
    rc.setFromCamera(new T.Vector2(px / 2560 * 2 - 1, 1 - py / 1440 * 2), cam)
    const hits = rc.intersectObject(window.__ENGINE__.scene, true).filter(h => h.object.visible && h.object.material)
    const h = hits[0]
    const chain = []
    for (let o = h && h.object; o; o = o.parent) chain.push(o.name || o.type)
    res.push({ px, py, mat: h?.object.material?.name, dist: h ? +h.distance.toFixed(2) : null, chain: chain.slice(0, 5) })
  }
  return res
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
process.exit(0)

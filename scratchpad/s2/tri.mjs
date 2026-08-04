import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
const PORT = Number(process.env.SHOT_PORT || 5941)
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
const out = await page.evaluate(() => {
  const acc = {}
  let total = 0
  window.__ENGINE__.scene.traverse(o => {
    if (!o.isMesh || !o.visible) return
    const g = o.geometry
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3
    const chain = []
    for (let p = o; p; p = p.parent) chain.push(p.name || p.type)
    const key = chain.slice(0, 3).reverse().join('/') + (o.castShadow ? ' [cast]' : '')
    acc[key] = (acc[key] || 0) + n
    total += n
  })
  return { total, rows: Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 30) }
})
console.log('SCENE TOTAL', Math.round(out.total))
for (const [k, v] of out.rows) console.log(String(Math.round(v)).padStart(8), k)
await browser.close()
process.exit(0)

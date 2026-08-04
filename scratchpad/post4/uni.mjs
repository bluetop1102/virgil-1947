import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
const PORT = 5941
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })
for (let i = 0; i < 240; i++) { try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {} await sleep(250) }
const b = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 640, height: 360 } })
p.setDefaultTimeout(240000)
await p.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load' })
await p.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
console.log(JSON.stringify(await p.evaluate(() => {
  const u = window.__ENGINE__.get('pipeline').composite.mat.uniforms
  return { pivot: u.uMidPivot.value, slope: u.uMidSlope.value, width: u.uMidWidth.value, sh: u.uShoulder.value, hal: u.uHalation.value, halGain: u.uHalGain.value }
})))
const r = await fetch(`http://localhost:${PORT}/src/render/passes/composite.js`)
const t = await r.text()
console.log('served file has uMidSlope:', /uMidSlope: \{ value: ([\d.]+)/.exec(t)?.[1])
await b.close(); process.exit(0)

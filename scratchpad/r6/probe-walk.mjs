import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()) })
await p.goto('http://127.0.0.1:5173/?q=medium', { waitUntil: 'load', timeout: 180000 })
await p.waitForFunction('window.__CECIL__?.ready && window.__ENGINE__?.get("lobby")?.active', null, { timeout: 300000 })
console.log(JSON.stringify(await p.evaluate(async () => {
  const e = window.__ENGINE__
  const pl = e.get('player')
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  while (e.get('cinematics')?.isModal?.()) await sleep(100)
  const trail = []
  const face = (x, z) => { pl.yawT = Math.atan2(-(x - pl.pos.x), -(z - pl.pos.z)) }
  const go = async (x, z, label, ms = 14000) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }))
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      await sleep(120)
      face(x, z)
      const d = Math.hypot(pl.pos.x - x, pl.pos.z - z)
      trail.push(`${label} t=${((Date.now() - t0) / 1000).toFixed(1)} pos=(${pl.pos.x.toFixed(2)},${pl.pos.y.toFixed(2)},${pl.pos.z.toFixed(2)}) d=${d.toFixed(2)} grounded=${pl.grounded} body=${!!pl.body}`)
      if (d < 0.7) break
    }
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
  }
  await go(-1.55, -2.5, 'desk')
  await go(-2.4, -4.05, 'deitch')
  // 조준
  const rig = e.get('characters').getRig('deitch')
  const wp = new (rig.position.constructor)(); rig.getWorldPosition(wp)
  const aim = []
  for (const h of [1.0, 1.3, 1.55, 1.9]) {
    const dx = wp.x - pl.pos.x, dz = wp.z - pl.pos.z, dy = (wp.y + h) - (pl.pos.y + 1.68)
    pl.yawT = Math.atan2(-dx, -dz); pl.pitchT = Math.atan2(dy, Math.hypot(dx, dz))
    await sleep(600)
    aim.push({ h, focus: pl.focus?.id ?? null, dist: +Math.hypot(dx, dz).toFixed(2) })
  }
  return { trail: trail.filter((_, i) => i % 4 === 0 || i === trail.length - 1), aim, final: { x: +pl.pos.x.toFixed(2), z: +pl.pos.z.toFixed(2) } }
}), null, 2))
await b.close()

import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto('http://127.0.0.1:5173/?q=medium', { waitUntil: 'load', timeout: 180000 })
await p.waitForFunction('window.__CECIL__?.ready && window.__ENGINE__?.get("lobby")?.active', null, { timeout: 300000 })
await p.waitForTimeout(4000)
console.log(JSON.stringify(await p.evaluate(() => {
  const e = window.__ENGINE__
  const pl = e.get('player')
  const rig = e.get('characters').getRig('deitch')
  const wp = new (rig.position.constructor)(); rig.getWorldPosition(wp)
  const meshes = []
  rig.traverse(o => { if (o.isMesh) meshes.push({ n: o.name || o.type, vis: o.visible, mat: o.material?.name, side: o.material?.side }) })
  pl._scan()
  const hot = pl.hot.map(o => o.userData.interact.id)
  const box = new (window.__ENGINE__.camera.position.constructor)()
  return {
    room: e.state.room,
    rigVisible: rig.visible,
    rigWorld: { x: +wp.x.toFixed(2), y: +wp.y.toFixed(2), z: +wp.z.toFixed(2) },
    playerPos: { x: +pl.pos.x.toFixed(2), y: +pl.pos.y.toFixed(2), z: +pl.pos.z.toFixed(2) },
    meshCount: meshes.length,
    meshes: meshes.slice(0, 8),
    hot,
    reach: pl.ray?.far
  }
}), null, 2))
await b.close()

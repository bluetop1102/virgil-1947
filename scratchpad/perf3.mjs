// 씬 렌더 34.5ms 가 드로우콜 제출 때문인지, 매 프레임 도는 JS(12모듈 update) 때문인지 가른다.
import { chromium } from 'playwright'
const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'] })
const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await pg.goto('http://127.0.0.1:5173/?scene=corridor-night&q=medium', { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 300000 })
const r = await pg.evaluate(async () => {
  const e = window.__ENGINE__
  const p = e.get('pipeline')
  for (const k of Object.keys(p.effects || {})) delete p.effects[k]
  if (p.taa) p.taa.render = () => {}
  e.renderer.shadowMap.enabled = false
  const gl = e.renderer.getContext()
  const run = (n = 40) => { for (let i = 0; i < 15; i++) e.frame(1 / 60); const t = performance.now(); for (let i = 0; i < n; i++) e.frame(1 / 60); gl.finish(); return +((performance.now() - t) / n).toFixed(1) }
  const withScene = run()
  // 지오메트리만 숨긴다 — 모듈 update 는 그대로 돈다
  const hid = []
  e.scene.traverse(o => { if (o.isMesh && o.visible) { o.visible = false; hid.push(o) } })
  const noDraw = run()
  for (const o of hid) o.visible = true
  return { withScene, noDraw, meshes: hid.length, calls: e.renderer.info.render.calls }
})
console.log(`  씬 렌더 + 모듈 update : ${r.withScene}ms   (메시 ${r.meshes}개)`)
console.log(`  모듈 update 만        : ${r.noDraw}ms`)
console.log(`  → 드로우콜 제출 비용   : ${(r.withScene - r.noDraw).toFixed(1)}ms`)
await br.close()

// 심사자 체감 기준: 링크 클릭 → 실제로 움직일 수 있게 되기까지.
import { chromium } from 'playwright'
const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const t0 = Date.now()
await pg.goto('http://127.0.0.1:5173/?scene=corridor-night&q=medium', { waitUntil: 'load', timeout: 120000 })
const tLoad = Date.now() - t0
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 300000 })
const tReady = Date.now() - t0
const r = await pg.evaluate(() => {
  const e = window.__ENGINE__
  const t = performance.now()
  e.frame(1 / 60)
  const first = performance.now() - t
  const i = e.renderer.info
  return {
    first: +first.toFixed(0), modules: [...e.modules.keys()].length,
    tex: i.memory.textures, geo: i.memory.geometries,
    calls: i.render.calls, tris: i.render.triangles, programs: e.renderer.info.programs?.length
  }
})
console.log(`  load ${(tLoad / 1000).toFixed(1)}s → ready ${(tReady / 1000).toFixed(1)}s → 첫 프레임 ${r.first}ms`)
console.log(`  모듈 ${r.modules} · 텍스처 ${r.tex} · 지오메트리 ${r.geo} · 프로그램 ${r.programs}`)
console.log(`  드로우콜 ${r.calls} · 삼각형 ${(r.tris / 1000).toFixed(0)}k  (복도 한 공간)`)
await br.close()

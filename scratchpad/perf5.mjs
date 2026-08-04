// 기본 조건(high/dpr2)에서 패스별 비용을 하나씩 꺼가며 귀속한다.
// 목적: 렉이 (a) 풀스크린 포스트 필레이트인지 (b) 지오/드로우콜인지 (c) 그림자인지 가르기.
import { chromium } from 'playwright'

const br = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-frame-rate-limit']
})
const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await pg.goto('http://127.0.0.1:5173/?scene=corridor-night', { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 300000 })

const r = await pg.evaluate(() => {
  const e = window.__ENGINE__
  const p = e.get('pipeline')
  const gl = e.renderer.getContext()
  const run = (n = 30) => {
    for (let i = 0; i < 10; i++) e.frame(1 / 60)
    const t = performance.now()
    for (let i = 0; i < n; i++) e.frame(1 / 60)
    gl.finish()
    return +((performance.now() - t) / n).toFixed(1)
  }
  const out = []
  const base = run()
  out.push(['base (high/dpr2)', base, 0])

  // 이펙트 단위 제거
  const keys = Object.keys(p.effects)
  for (const k of keys) {
    const saved = p.effects[k]
    delete p.effects[k]
    const ms = run()
    out.push(['-' + k, ms, +(base - ms).toFixed(1)])
    p.effects[k] = saved
  }

  // TAA
  const taaR = p.taa.render.bind(p.taa)
  p.taa.render = () => {}
  out.push(['-taa', run(), 0])
  p.taa.render = taaR
  out[out.length - 1][2] = +(base - out[out.length - 1][1]).toFixed(1)

  // 그림자
  e.renderer.shadowMap.enabled = false
  const noShadow = run()
  out.push(['-shadowMap', noShadow, +(base - noShadow).toFixed(1)])
  e.renderer.shadowMap.enabled = true

  // 포스트 전부 제거 = 지오/드로우콜 + 그림자만
  const savedFx = { ...p.effects }
  for (const k of keys) delete p.effects[k]
  p.taa.render = () => {}
  const geoOnly = run()
  out.push(['포스트 전부 제거(지오+그림자만)', geoOnly, +(base - geoOnly).toFixed(1)])
  e.renderer.shadowMap.enabled = false
  const geoNoShadow = run()
  out.push(['  + 그림자도 제거(순수 지오)', geoNoShadow, +(base - geoNoShadow).toFixed(1)])

  Object.assign(p.effects, savedFx)
  p.taa.render = taaR
  e.renderer.shadowMap.enabled = true

  return { out, calls: e.renderer.info.render.calls, tris: e.renderer.info.render.triangles, px: gl.drawingBufferWidth * gl.drawingBufferHeight }
})

console.log(`drawcalls=${r.calls} tris=${r.tris} px=${(r.px / 1e6).toFixed(1)}Mpx\n`)
for (const [tag, ms, saved] of r.out) {
  console.log(`  ${tag.padEnd(34)} ${String(ms).padStart(7)}ms  ${String((1000 / ms).toFixed(1)).padStart(6)}fps  절감 ${String(saved).padStart(6)}ms`)
}
await br.close()

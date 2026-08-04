// perf5가 남긴 질문: 포스트를 다 꺼도 123.8ms다. 이 비용이
// (a) 픽셀당 프래그먼트 셰이더 비용인지 (b) 드로우콜 CPU 오버헤드인지 가른다.
// 판별: 같은 씬을 dpr만 바꿔 잰다 — 드로우콜 수 고정, 픽셀만 4배 차이.
//   픽셀에 비례하면 (a) 프래그먼트 바운드, 평평하면 (b) CPU 바운드.
// 빈 화면(전 메시 숨김)을 같이 재서 씬과 무관한 고정비를 뺀다.
import { chromium } from 'playwright'

const br = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-frame-rate-limit']
})

for (const dpr of [2, 1]) {
  const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })
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
    const full = run()

    // 포스트·그림자 off — 씬 패스만
    const keys = Object.keys(p.effects)
    const savedFx = { ...p.effects }
    for (const k of keys) delete p.effects[k]
    const taaR = p.taa.render.bind(p.taa)
    p.taa.render = () => {}
    e.renderer.shadowMap.enabled = false
    const geo = run()

    // 메시 전부 숨김 = 씬과 무관한 고정비
    const meshes = []
    e.scene.traverse(o => { if (o.isMesh && o.visible) meshes.push(o) })
    for (const m of meshes) m.visible = false
    const empty = run()
    for (const m of meshes) m.visible = true

    Object.assign(p.effects, savedFx)
    p.taa.render = taaR
    e.renderer.shadowMap.enabled = true

    return { full, geo, empty, meshes: meshes.length, calls: e.renderer.info.render.calls, px: gl.drawingBufferWidth * gl.drawingBufferHeight }
  })
  const scene = +(r.geo - r.empty).toFixed(1)
  console.log(`dpr=${dpr}  ${(r.px / 1e6).toFixed(1)}Mpx  meshes=${r.meshes} calls=${r.calls}`)
  console.log(`   전체 파이프라인            ${String(r.full).padStart(7)}ms`)
  console.log(`   씬패스만(포스트·그림자 off)  ${String(r.geo).padStart(7)}ms`)
  console.log(`   빈 화면(전 메시 숨김)       ${String(r.empty).padStart(7)}ms`)
  console.log(`   → 씬 지오/셰이딩 순비용      ${String(scene).padStart(7)}ms\n`)
  await pg.close()
}
await br.close()

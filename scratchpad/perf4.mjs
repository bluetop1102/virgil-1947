// 35.6ms 드로우콜 비용이 (a) 재질/프로그램 전환 때문인지 (b) 순수 드로우콜 개수 때문인지 가른다.
// 이 구분이 스택 교체 여부를 정한다 — (a)면 코드 문제, (b)면 배칭 문제. 둘 다 three.js 한계가 아니다.
import { chromium } from 'playwright'
const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'] })
const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await pg.goto('http://127.0.0.1:5173/?scene=corridor-night&q=medium', { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 300000 })

const r = await pg.evaluate(() => {
  const e = window.__ENGINE__
  const p = e.get('pipeline')
  for (const k of Object.keys(p.effects || {})) delete p.effects[k]
  if (p.taa) p.taa.render = () => {}
  e.renderer.shadowMap.enabled = false
  const gl = e.renderer.getContext()
  const run = (n = 40) => { for (let i = 0; i < 15; i++) e.frame(1 / 60); const t = performance.now(); for (let i = 0; i < n; i++) e.frame(1 / 60); gl.finish(); return +((performance.now() - t) / n).toFixed(1) }

  // 인벤토리
  const mats = new Set(), geos = new Set(), meshes = []
  let transparent = 0, shadowCasters = 0
  e.scene.traverse(o => {
    if (!o.isMesh || !o.visible) return
    meshes.push(o)
    const ms = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of ms) { if (m) { mats.add(m); if (m.transparent || m.blending !== 1) transparent++ } }
    geos.add(o.geometry)
    if (o.castShadow) shadowCasters++
  })
  const base = run()

  // (a) 전 메시를 단일 재질로 — 드로우콜 수는 그대로, 재질/프로그램 전환만 제거
  const proto = new (Object.getPrototypeOf(meshes.find(m => m.material && !Array.isArray(m.material)).material).constructor)()
  const saved = meshes.map(m => [m, m.material])
  for (const m of meshes) m.material = proto
  const oneMat = run()
  for (const [m, mm] of saved) m.material = mm

  // (b) 메시 절반만 — 드로우콜 수가 절반일 때
  const half = meshes.filter((_, i) => i % 2 === 0)
  for (const m of half) m.visible = false
  const halfDraw = run()
  for (const m of half) m.visible = true

  return {
    meshes: meshes.length, mats: mats.size, geos: geos.size, transparent, shadowCasters,
    base, oneMat, halfDraw, calls: e.renderer.info.render.calls
  }
})
console.log(`  메시 ${r.meshes} · 고유 재질 ${r.mats} · 고유 지오메트리 ${r.geos} · 반투명 ${r.transparent} · 그림자 캐스터 ${r.shadowCasters}`)
console.log(`  씬 렌더 기준               ${r.base}ms`)
console.log(`  단일 재질(전환 제거)        ${r.oneMat}ms`)
console.log(`  메시 절반(드로우콜 절반)     ${r.halfDraw}ms`)
await br.close()

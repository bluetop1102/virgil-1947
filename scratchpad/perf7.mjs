// 씬패스 109.7ms(dpr2)의 내역을 재질 셰이더 기능 단위로 가른다.
// POM / 트리플래너 / 스토캐스틱 define을 꺼서 재컴파일시키고, 조명 개수도 따로 잰다.
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
    for (let i = 0; i < 12; i++) e.frame(1 / 60)   // 재컴파일 흡수
    const t = performance.now()
    for (let i = 0; i < n; i++) e.frame(1 / 60)
    gl.finish()
    return +((performance.now() - t) / n).toFixed(1)
  }
  // 포스트·그림자 off — 씬 패스만 남긴다
  for (const k of Object.keys(p.effects)) delete p.effects[k]
  p.taa.render = () => {}
  e.renderer.shadowMap.enabled = false

  const mats = new Set()
  const lights = []
  e.scene.traverse(o => {
    if (o.isMesh && o.visible) {
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) mats.add(m)
    }
    if (o.isLight && o.visible && !o.isAmbientLight) lights.push(o)
  })
  const M = [...mats]
  const out = []
  const base = run()
  out.push(['씬패스 기준', base, 0])

  const count = d => M.filter(m => m.defines && d in m.defines).length
  const inv = { POM: count('CECIL_POM'), TRI: count('CECIL_TRIPLANAR'), STOCH: count('CECIL_STOCH'), FLOW: count('CECIL_FLOW') }

  const ablate = (def, tag) => {
    const hit = M.filter(m => m.defines && def in m.defines)
    if (!hit.length) return
    const saved = hit.map(m => m.defines[def])
    for (const m of hit) { delete m.defines[def]; m.needsUpdate = true }
    const ms = run()
    out.push([tag + ` (${hit.length}개 재질)`, ms, +(base - ms).toFixed(1)])
    hit.forEach((m, i) => { m.defines[def] = saved[i]; m.needsUpdate = true })
    run(3)
  }
  ablate('CECIL_POM', '-POM')
  ablate('CECIL_TRIPLANAR', '-트리플래너')
  ablate('CECIL_STOCH', '-스토캐스틱')

  // 조명 절반 끄기
  const half = lights.filter((_, i) => i % 2 === 0)
  for (const l of half) l.visible = false
  const halfL = run()
  out.push([`-조명 절반 (${lights.length}→${lights.length - half.length})`, halfL, +(base - halfL).toFixed(1)])
  for (const l of half) l.visible = true

  return { out, inv, lights: lights.length, mats: M.length }
})

console.log(`재질 ${r.mats}개  조명 ${r.lights}개  defines: POM=${r.inv.POM} TRI=${r.inv.TRI} STOCH=${r.inv.STOCH} FLOW=${r.inv.FLOW}\n`)
for (const [tag, ms, saved] of r.out) {
  console.log(`  ${tag.padEnd(30)} ${String(ms).padStart(7)}ms   절감 ${String(saved).padStart(6)}ms`)
}
await br.close()

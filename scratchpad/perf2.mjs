// 프레임 비용이 콘텐츠(드로우콜·삼각형) 때문인지 포스트 파이프라인(해상도) 때문인지 가른다.
import { chromium } from 'playwright'
const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-frame-rate-limit'] })
const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await pg.goto('http://127.0.0.1:5173/?scene=corridor-night&q=medium', { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 300000 })
const bench = async (label, setup) => {
  const r = await pg.evaluate(async (js) => {
    const e = window.__ENGINE__
    if (js) eval(js)
    for (let i = 0; i < 20; i++) e.frame(1 / 60)
    const gl = e.renderer.getContext()
    const t = performance.now()
    for (let i = 0; i < 40; i++) e.frame(1 / 60)
    gl.finish()
    return { ms: +((performance.now() - t) / 40).toFixed(1), calls: e.renderer.info.render.calls }
  }, setup)
  console.log(`  ${label.padEnd(34)} ${String(r.ms).padStart(6)}ms  calls=${r.calls}`)
  return r.ms
}
const full = await bench('전체 (medium, dpr1)', null)
await bench('− volumetric', "const p=e.get('pipeline'); delete p.effects.volumetric")
await bench('− volumetric, gtao', "const p=e.get('pipeline'); delete p.effects.gtao")
await bench('− vol, gtao, bloom', "const p=e.get('pipeline'); delete p.effects.bloom")
const bare = await bench('− 위 전부 + 그림자 off', "e.renderer.shadowMap.enabled=false; e.scene.traverse(o=>{o.castShadow=false})")
await bench('씬만 (포스트 전량 제거)', "const p=e.get('pipeline'); for(const k of Object.keys(p.effects||{})) delete p.effects[k]; if(p.taa) p.taa.render=()=>{}")
console.log(`\n  → 콘텐츠(씬 렌더)가 차지하는 비중: 위 마지막 줄 / ${full}ms`)
await br.close()

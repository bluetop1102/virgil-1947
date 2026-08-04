// 품질 티어별 실시간 프레임 시간 측정. 창 크기와 dpr을 실제 브라우저 조건에 맞춰 잰다.
import { chromium } from 'playwright'

const PORT = 5173
const CASES = [
  { tag: 'high  dpr2 (기본)', q: '', dpr: 2 },
  { tag: 'medium dpr2', q: '&q=medium', dpr: 2 },
  { tag: 'high  dpr1', q: '', dpr: 1 },
  { tag: 'medium dpr1', q: '&q=medium', dpr: 1 }
]

const br = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-frame-rate-limit']
})
for (const c of CASES) {
  const pg = await br.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: c.dpr })
  const errs = []
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 90)) })
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 90)))
  await pg.goto(`http://127.0.0.1:${PORT}/?scene=corridor-night${c.q}`, { waitUntil: 'load', timeout: 90000 })
  await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 180000 })
  const r = await pg.evaluate(async () => {
    const e = window.__ENGINE__
    for (let i = 0; i < 30; i++) e.frame(1 / 60)          // 워밍업(셰이더 컴파일)
    const gl = e.renderer.getContext()
    const t0 = performance.now()
    const N = 60
    for (let i = 0; i < N; i++) e.frame(1 / 60)
    gl.finish()
    const ms = (performance.now() - t0) / N
    return {
      ms: +ms.toFixed(1),
      fps: +(1000 / ms).toFixed(1),
      quality: e.quality.name,
      dpr: e.renderer.getPixelRatio(),
      px: gl.drawingBufferWidth * gl.drawingBufferHeight,
      calls: e.renderer.info.render.calls
    }
  })
  console.log(`  ${c.tag.padEnd(18)} ${String(r.ms).padStart(6)}ms  ${String(r.fps).padStart(5)}fps  q=${r.quality} dpr=${r.dpr} ${(r.px / 1e6).toFixed(1)}Mpx calls=${r.calls}${errs.length ? '  ERR:' + errs[0] : ''}`)
  await pg.close()
}
await br.close()

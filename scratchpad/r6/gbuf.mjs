// 파이프라인 중간 타깃을 스캔라인으로 읽는다. "화면에 보이는 계단"이 지오메트리(깊이)인지
// 라이팅 버퍼(vol/ssr/ao)인지 귀속하기 위한 것 — 추측 대신 버퍼로 가른다.
//   node scratchpad/r6/gbuf.mjs <shot> <y> <x0> <x1>
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const [SHOT, Y, X0, X1] = process.argv.slice(2)
const PORT = Number(process.env.SHOT_PORT || 5955)
const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { srv.kill('SIGKILL') } catch {} })
for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break } catch {} await sleep(250) }

const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] })
const pg = await br.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
pg.setDefaultTimeout(240000)
await pg.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await pg.evaluate(() => window.__CECIL__.warmup())

const out = await pg.evaluate(([shot, y, x0, x1]) => {
  window.__CECIL__.goto(shot)
  const E = window.__ENGINE__, p = E.get('pipeline'), ctx = p.ctx, r = E.renderer
  const readRow = (target, chans) => {
    const w = target.width, h = target.height
    const sx = w / ctx.w                       // 풀해상도 좌표 → 이 타깃 좌표
    const rx0 = Math.max(0, Math.floor(x0 * sx)), rx1 = Math.min(w - 1, Math.ceil(x1 * sx))
    const ry = Math.min(h - 1, Math.max(0, Math.round((ctx.h - 1 - y) * (h / ctx.h))))
    const n = rx1 - rx0 + 1
    const isF = target.texture.type !== 1009    // UnsignedByteType=1009
    const buf = isF ? new Float32Array(n * 4) : new Uint8Array(n * 4)
    r.readRenderTargetPixels(target, rx0, ry, n, 1, buf)
    const rows = []
    for (let i = 0; i < n; i++) {
      const v = []
      for (const c of chans) v.push(+buf[i * 4 + c].toFixed(4))
      rows.push({ x: Math.round((rx0 + i) / sx), v })
    }
    return { w, h, rows }
  }
  const T = ctx.targets
  return {
    ctx: { w: ctx.w, h: ctx.h },
    normal: readRow(T.normal, [3]),            // a = 선형 뷰 깊이
    rough: T.roughness ? readRow(T.roughness, [0]) : null,
    ao: T.ao ? readRow(T.ao, [0]) : null,
    ssr: T.ssr ? readRow(T.ssr, [0, 3]) : null,
    vol: T.vol ? readRow(T.vol, [0, 3]) : null,
    hdr: readRow(T.hdr, [0, 1])
  }
}, [SHOT, +Y, +X0, +X1])

await br.close()
srv.kill('SIGKILL')

const fmt = (label, o) => {
  if (!o) return console.log(`${label}: (없음)`)
  console.log(`\n== ${label}  (${o.w}x${o.h}) ==`)
  let prev = null
  for (const r of o.rows) {
    const d = prev ? r.v.map((v, i) => v - prev[i]) : r.v.map(() => 0)
    const big = d.some((v, i) => Math.abs(v) > (label === 'normal(depth)' ? 0.06 : 0.02) * Math.max(1, Math.abs(r.v[i])))
    console.log(`  x=${String(r.x).padStart(5)}  ${r.v.map(v => String(v).padStart(10)).join(' ')}   ${d.map(v => (v > 0 ? '+' : '') + v.toFixed(4)).join(' ')} ${big ? ' <<<' : ''}`)
    prev = r.v
  }
}
console.log(`ctx ${out.ctx.w}x${out.ctx.h}`)
fmt('normal(depth)', out.normal)
fmt('vol(r,a)', out.vol)
fmt('ao', out.ao)
fmt('ssr(r,a)', out.ssr)
fmt('rough', out.rough)
fmt('hdr(r,g)', out.hdr)

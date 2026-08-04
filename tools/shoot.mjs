// 결정론적 스크린샷 하네스. 가혹 검수 루프의 유일한 증거 생산 경로다.
//   node tools/shoot.mjs                    전체 샷
//   node tools/shoot.mjs lobby-wide         특정 샷
//   node tools/shoot.mjs --out shots/r03    출력 디렉터리 지정
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

// GPU 락. 2560x1440 시네마틱 파이프라인은 단독이면 프레임당 43ms지만 6중 경합에서 300~500ms로 늘어
// 첫 샷이 타임아웃으로 죽는다. 에이전트 자율 조정은 신뢰할 수 없으므로 하네스가 기계적으로 직렬화한다.
const LOCK = new URL('../.shot-lock', import.meta.url).pathname
const LOCK_STALE_MS = 15 * 60 * 1000

const OWNER_TAG = () => `pid=${process.pid} port=${PORT}`
let holdsLock = false

async function acquireLock () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER_TAG()); holdsLock = true; return true } catch {}
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > LOCK_STALE_MS) {
        console.log('  stale lock 제거 (15분 초과)')
        rmSync(LOCK, { recursive: true, force: true })
        continue
      }
    } catch {}
    if (i === 0) console.log('  GPU 락 대기 중 — 다른 샷 실행이 끝나면 자동으로 시작합니다')
    if (i > 900) { console.log('  락 대기 30분 초과 — 강제 진행'); return false }
    await sleep(2000)
  }
}

// 소유자만 푼다. 무조건 rmSync하면 대기 중이거나 강제 진행한 프로세스가 종료될 때 남의 락을
// 지워버려 직렬화가 무너진다(실제로 그래서 스크린샷이 동시 실행으로 타임아웃했다).
function releaseLock () {
  if (!holdsLock) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== OWNER_TAG()) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holdsLock = false
}

const argv = process.argv.slice(2)
const outIdx = argv.indexOf('--out')
const OUT = outIdx >= 0 ? argv[outIdx + 1] : 'shots'
const only = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1))
const PORT = Number(process.env.SHOT_PORT || (5100 + (process.pid % 700)))
const W = 1280, H = 720

const GPU_ARGS = [
  '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb'
]

function serve () {
  // SHOT=1 → vite.config.js가 HMR/워처를 끈다. 샷 도중 남의 파일 저장이 full reload를 유발하면 안 된다.
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', detached: false, env: { ...process.env, SHOT: '1' }
  })
  return p
}

async function waitPort (ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) return true } catch {}
    await sleep(250)
  }
  throw new Error('vite did not start')
}

await acquireLock()
const server = serve()
process.on('exit', () => { releaseLock(); try { server.kill('SIGKILL') } catch {} })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { releaseLock(); process.exit(1) })

try {
  await waitPort()
  if (existsSync(OUT) && OUT !== 'shots') rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true, args: GPU_ARGS })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })

  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))

  page.setDefaultTimeout(240000)
  await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })

  // --off vol,bloom,dof : 패스를 끄고 찍는다. 워시아웃 같은 증상의 원인을 추측 대신 A/B로 가른다.
  const offIdx = argv.indexOf('--off')
  if (offIdx >= 0 && argv[offIdx + 1]) {
    const names = argv[offIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
    const hit = await page.evaluate(ns => {
      const p = window.__ENGINE__.get('pipeline') || {}
      const found = []
      const cand = Object.entries(p.effects || {})
      // taa/composite는 effects가 아니라 pipeline 직속이다. 둘 다 뒤진다.
      for (const k of ['taa', 'composite']) if (p[k]) cand.push([k, p[k]])
      for (const n of ns) {
        for (const [k, v] of cand) {
          if (!k.toLowerCase().startsWith(n.toLowerCase()) || !v) continue
          // enabled=false로는 부족하다. 파이프라인이 `fx.bloom ? targets.bloom.texture : null`처럼
          // **존재 여부**로 합성을 결정하므로, 끄기만 하면 직전 프레임의 결과 타깃이 계속 합성돼
          // A/B가 무효가 된다. 엔트리 자체를 제거해야 진짜로 빠진다.
          if (p.effects && k in p.effects) delete p.effects[k]
          else if (typeof v.render === 'function') v.render = () => {}
          if ('enabled' in v) v.enabled = false
          found.push(k)
        }
      }
      return found
    }, names)
    console.log(`  passes off: ${hit.join(', ') || '(일치 없음 — 이름 확인 필요)'}`)
  }

  // 셰이더 컴파일·재질 베이크를 첫 샷 밖으로 빼낸다. 안 그러면 첫 샷만 타임아웃으로 죽는다.
  const t0w = Date.now()
  const warm = await page.evaluate(() => window.__CECIL__.warmup())
  console.log(`  warmup ${((Date.now() - t0w) / 1000).toFixed(1)}s — ${warm.programs} programs, ${warm.calls} calls`)

  const boot = await page.evaluate(() => ({
    loaded: window.__CECIL__.loaded, errors: window.__CECIL__.errors,
    gl: (() => { const g = window.__ENGINE__.renderer.getContext(); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a' })()
  }))

  // 프레임 전체가 다이내믹 레인지 하위에 갇히는 사고(루브릭 D6)를 사람 눈이 아니라 수치로 잡는다.
  // 통과 기준: p99.9 휘도 >= 150, 휘도 6 이하 픽셀 비율 <= 10%.
  const LUM_PROBE = () => {
    const e = window.__ENGINE__
    const gl = e.renderer.getContext()
    e.frame(1 / 60)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const w = gl.drawingBufferWidth
    const h = gl.drawingBufferHeight
    const buf = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf)

    const hist = new Int32Array(256)
    let max = 0, black = 0, white = 0, sum = 0
    const n = w * h
    for (let i = 0; i < n; i++) {
      const r = buf[i * 4], g = buf[i * 4 + 1], b = buf[i * 4 + 2]
      if (r > max) max = r
      if (g > max) max = g
      if (b > max) max = b
      if (r === 0 && g === 0 && b === 0) black++
      if (r === 255 && g === 255 && b === 255) white++
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0
      hist[l]++
      sum += l
    }
    const rank = (q) => {
      const t = Math.ceil(n * q)
      let seen = 0
      for (let v = 0; v < 256; v++) { seen += hist[v]; if (seen >= t) return v }
      return 255
    }
    let dark = 0
    for (let v = 0; v <= 6; v++) dark += hist[v]

    const p = e.get('pipeline')
    return {
      w, h,
      max,
      p999: rank(0.999),
      p50: rank(0.5),
      mean: +(sum / n).toFixed(1),
      darkPct: +(dark * 100 / n).toFixed(2),
      blackPct: +(black * 100 / n).toFixed(2),
      whitePct: +(white * 100 / n).toFixed(2),
      exposure: p && p.composite ? +Number(p.composite.exposure ?? 0).toFixed(4) : null,
      hdrAvg: p && p.expo ? +Number(p.expo.stats.avg).toExponential(2) : null,
      hdrP99: p && p.expo ? +Number(p.expo.stats.p99).toExponential(2) : null
    }
  }

  // --ab <file.json> : [{tag, js}] 를 순서대로 page에서 실행하고 변종마다 샷을 남긴다.
  // 한 세션 안에서 돌려야 warmup(20~30초)과 GPU 락을 변종 수만큼 반복하지 않는다.
  // js는 브라우저 컨텍스트에서 평가되며 window.__ENGINE__ / __CECIL__ 을 그대로 쓴다.
  const abIdx = argv.indexOf('--ab')
  const AB = abIdx >= 0 && argv[abIdx + 1] ? JSON.parse(readFileSync(argv[abIdx + 1], 'utf8')) : null

  const names = only.length ? only : await page.evaluate(() => Object.keys(window.__CECIL__.shots))
  // 여러 에이전트가 기본 출력(shots/)을 공유하므로, 이 리포트가 누구 것인지 식별 가능해야 한다.
  const report = { runner: `pid=${process.pid} port=${PORT}`, gl: boot.gl, modules: boot.loaded, bootErrors: boot.errors, shots: [], console: [] }

  for (const name of names) {
    for (const variant of (AB || [{ tag: '', js: '' }])) {
      const t0 = Date.now()
      const suffix = variant.tag ? `__${variant.tag}` : ''
      let stats = null, lum = null, err = null, applied = null
      try {
        await page.evaluate(n => window.__CECIL__.goto(n), name)
        if (variant.js) applied = await page.evaluate(variant.js)
        stats = await page.evaluate(() => window.__CECIL__.stats())
        await page.screenshot({ path: `${OUT}/${name}${suffix}.png`, timeout: 120000 })
        lum = await page.evaluate(LUM_PROBE)
      } catch (e) { err = e.message }
      const gate = lum ? (lum.p999 >= 150 && lum.darkPct <= 10) : null
      report.shots.push({ name: name + suffix, ms: Date.now() - t0, applied, stats, lum, gate, err })
      const lumTxt = lum ? `  ${gate ? 'gate ok' : 'GATE FAIL'} p99.9=${lum.p999} dark=${lum.darkPct}% ev=${lum.exposure}` : ''
      console.log(`  ${err ? '✗' : '✓'} ${name}${suffix}${stats ? `  ${stats.calls} calls` : ''}${lumTxt}${applied ? `  [${JSON.stringify(applied)}]` : ''}${err ? `  ${err}` : ''}`)
    }
  }
  report.gateFailures = report.shots.filter(s => s.gate === false).map(s => s.name)

  report.console = [...new Set(logs)].slice(0, 60)
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(`\nGL: ${boot.gl}\nmodules: ${(boot.loaded || []).join(', ') || '(none)'}`)
  if (report.console.length) console.log(`console issues (${report.console.length}):\n` + report.console.slice(0, 15).map(s => '  ' + s).join('\n'))
  await browser.close()
} finally {
  releaseLock()
  try { server.kill('SIGKILL') } catch {}
}
process.exit(0)

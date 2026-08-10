// 프레임 예산 계측 하네스 (S-L). shoot.mjs 가 "픽셀"의 증거 생산 경로라면 이쪽은 "시간"이다.
//
//   SHOT_PORT=5928 node tools/perf.mjs --out shots/sl-perf                 # 기준선(HIGH·DPR2)
//   SHOT_PORT=5928 node tools/perf.mjs --out shots/sl-perf --ablate        # + 패스별 삭제 델타
//   SHOT_PORT=5928 node tools/perf.mjs --q medium --dpr 2 --out shots/sl-m
//
// shoot.mjs 와 다른 점 — 여기서는 **RAF 를 돌린다**. QA 모드(`?qa=1`)는 하네스가 프레임을 몰고
// cinematic 프리셋으로 고정되므로 "실기기에서 렉이 걸리는가"를 측정할 수 없다. 그래서
// judge-probes 와 같은 실플레이 경로(`?q=<preset>`, 게이트 → 타이틀 → 인트로)로 부팅한다.
//
// 계측 정의
//   raf  : requestAnimationFrame 타임스탬프 간격 = 사용자가 체감하는 프레임 간격(GPU 대기 포함).
//          --disable-frame-rate-limit 이 붙어 있어 vsync 로 16.7ms 에 눌리지 않는다.
//   cpu  : engine.frame() 의 JS 구간. raf 와 벌어지는 폭이 GPU 바운드의 크기다.
// 두 값이 모두 필요하다 — cpu 가 낮은데 raf 가 높으면 레버는 픽셀 수(렌더 스케일·오프스크린
// 해상도)이고, 둘이 같이 높으면 레버는 드로우콜·그림자 갱신 쪽이다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

// ── GPU 락 (shoot.mjs 와 같은 디렉터리 락. 병렬 세션의 샷과 직렬화된다) ──────────────
const LOCK = new URL('../.shot-lock', import.meta.url).pathname
const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = k => argv.includes(k)

const PORT = Number(process.env.SHOT_PORT || 5928)
const OUT = arg('--out', 'shots/sl-perf')
const PRESET = arg('--q', 'high')
const DPR = Number(arg('--dpr', '2'))
const WIN_MS = Number(arg('--ms', '3000'))
const VW = Number(arg('--vw', '1600'))
const VH = Number(arg('--vh', '900'))
const OWNER_TAG = () => `perf pid=${process.pid} port=${PORT}`
let holdsLock = false

function lockOwnerState () {
  try {
    const match = readFileSync(`${LOCK}/owner`, 'utf8').match(/pid=(\d+)/)
    if (!match) return 'unknown'
    process.kill(Number(match[1]), 0)
    return 'alive'
  } catch (error) {
    if (error?.code === 'ESRCH') return 'dead'
    if (error?.code === 'ENOENT') return 'unknown'
    return 'alive'
  }
}

async function acquireLock () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER_TAG()); holdsLock = true; return true } catch {}
    const owner = lockOwnerState()
    if (owner === 'dead' || (owner === 'unknown' && i >= 2)) {
      console.log(`  ${owner === 'dead' ? '종료된 소유자' : '소유자 없는 고아'} 락 제거`)
      try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
      continue
    }
    if (i === 0) console.log('  GPU 락 대기 중 — 다른 샷/계측이 끝나면 자동으로 시작합니다')
    if (i > 900) { console.log('  락 대기 30분 초과 — 강제 진행'); return false }
    await sleep(2000)
  }
}

function releaseLock () {
  if (!holdsLock) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== OWNER_TAG()) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holdsLock = false
}

const GPU_ARGS = [
  '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb',
  '--autoplay-policy=no-user-gesture-required'
]

function serve () {
  const bin = new URL('../node_modules/.bin/vite', import.meta.url).pathname
  const p = spawn(bin, ['--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', detached: true, env: { ...process.env, SHOT: '1' }
  })
  p.unref()
  return p
}

function killServer (p) {
  if (!p?.pid) return
  try { process.kill(-p.pid, 'SIGKILL') } catch {}
  try { p.kill('SIGKILL') } catch {}
}

async function waitPort (ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/`); if (r.ok) return true } catch {}
    await sleep(250)
  }
  throw new Error('vite did not start')
}

// ── 페이지 측 계측기 ────────────────────────────────────────────────────────────
// engine.frame 을 감싸 JS 구간을 재고, 별도 RAF 루프로 프레임 간격을 잰다. 엔진의 RAF 와
// 같은 프레임에 실행되므로 간격은 동일하다.
const INSTALL = () => {
  const E = window.__ENGINE__
  const P = { raf: [], cpu: [], last: 0, on: false }
  window.__PERF__ = P
  const orig = E.frame.bind(E)
  E.frame = function (dt) {
    const a = performance.now()
    orig(dt)
    if (P.on) P.cpu.push(performance.now() - a)
  }
  const loop = t => {
    if (P.on) { if (P.last) P.raf.push(t - P.last); P.last = t }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  const p = E.get('pipeline')
  window.__FXBAK__ = { ...(p?.effects || {}) }
  window.__RBAK__ = {
    taa: p?.taa?.render?.bind(p.taa),
    prepass: p?.prepass?.render?.bind(p.prepass),
    contact: p?.contact?.render?.bind(p.contact)
  }
}

const RESET = () => {
  const E = window.__ENGINE__
  const p = E.get('pipeline')
  p.effects = { ...window.__FXBAK__ }
  p.taa.render = window.__RBAK__.taa
  p.prepass.render = window.__RBAK__.prepass
  p.contact.render = window.__RBAK__.contact
  p.ready = true
  E.renderer.shadowMap.enabled = true
  const u = p.composite?.mat?.uniforms
  if (u && window.__UBAK__) for (const [k, v] of Object.entries(window.__UBAK__)) u[k].value = v
  if (E.renderer.getPixelRatio() !== window.__DPR0__) {
    E.renderer.setPixelRatio(window.__DPR0__)
    E._onResize()
  }
}

const MEASURE_START = () => {
  const P = window.__PERF__
  P.raf.length = 0; P.cpu.length = 0; P.last = 0; P.on = true
}

const MEASURE_STOP = () => {
  const P = window.__PERF__
  P.on = false
  const q = (a, r) => {
    if (!a.length) return null
    const s = [...a].sort((x, y) => x - y)
    return +s[Math.min(s.length - 1, Math.floor(s.length * r))].toFixed(2)
  }
  const E = window.__ENGINE__
  const info = E.renderer.info
  const gl = E.renderer.getContext()
  const mean = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null
  return {
    n: P.raf.length,
    p50: q(P.raf, 0.5), p95: q(P.raf, 0.95), p99: q(P.raf, 0.99), mean: mean(P.raf),
    cpu50: q(P.cpu, 0.5), cpu95: q(P.cpu, 0.95),
    fps: mean(P.raf) ? +(1000 / mean(P.raf)).toFixed(1) : null,
    calls: info.render.calls, tris: info.render.triangles,
    dpr: E.renderer.getPixelRatio(),
    buf: [gl.drawingBufferWidth, gl.drawingBufferHeight]
  }
}

// 씬·그림자 인구조사. 발주문 P0-1 ③⑤.
const CENSUS = () => {
  const E = window.__ENGINE__
  let meshes = 0, visible = 0, casters = 0, visCasters = 0
  const lights = []
  E.scene.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) {
      meshes++
      if (o.visible) visible++
      if (o.castShadow) { casters++; if (o.visible) visCasters++ }
    }
    if (o.isLight) {
      lights.push({
        type: o.type, name: o.name || null, visible: o.visible, cast: !!o.castShadow,
        map: o.shadow ? [o.shadow.mapSize.x, o.shadow.mapSize.y] : null,
        auto: o.shadow ? o.shadow.autoUpdate : null,
        allocated: !!(o.shadow && o.shadow.map)
      })
    }
  })
  const p = E.get('pipeline')
  const gl = E.renderer.getContext()
  const targets = []
  if (p) {
    for (const [k, v] of Object.entries(p.ctx.targets)) {
      if (v && v.width) targets.push({ name: k, w: v.width, h: v.height })
    }
  }
  return {
    quality: E.quality.name,
    meshes, visible, casters, visCasters,
    lights: lights.length,
    castingNow: lights.filter(l => l.cast && l.visible).length,
    shadowLights: lights.filter(l => l.cast || l.allocated),
    shadowType: E.renderer.shadowMap.type,
    rendererAutoUpdate: E.renderer.shadowMap.autoUpdate,
    devicePixelRatio: window.devicePixelRatio,
    rendererPixelRatio: E.renderer.getPixelRatio(),
    drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    cssSize: [E.size.w, E.size.h],
    passes: p ? Object.keys(p.effects || {}) : [],
    targets,
    timerQuery: !!(gl.getExtension('EXT_disjoint_timer_query_webgl2') || gl.getExtension('EXT_disjoint_timer_query')),
    programs: E.renderer.info.programs?.length ?? null,
    memory: { geometries: E.renderer.info.memory.geometries, textures: E.renderer.info.memory.textures }
  }
}

// ── 시점 ────────────────────────────────────────────────────────────────────────
// 로비 자유 시점 3곳은 judge-probes/probe-frames.mjs 의 제출 프레임 계보를 그대로 쓴다.
// 같은 좌표라야 "제출 프레임이 몇 ms 인가"가 성립한다.
const VIEWS = [
  { id: 'lobby-desk-corner', pos: [1.2, 6.2], look: [-3.0, 1.35, -4.0] },
  { id: 'lobby-ceiling-up', pos: [1.2, 1.5], look: [0.4, 6.0, -0.5] },
  { id: 'lobby-wide', pos: [1.2, 6.2], look: [-2.2, 1.5, -4.0] }
]

async function place (page, pos, look) {
  await page.evaluate(([x, z, tx, ty, tz]) => {
    const E = window.__ENGINE__
    const p = E.get('player')
    const yaw = Math.atan2(-(tx - x), -(tz - z))
    p.teleport?.([x, p.pos?.y ?? 0, z], yaw)
    p.yawT = yaw
    const eye = E.camera.position.y
    p.pitchT = Math.max(-1.48, Math.min(1.48, Math.atan2(ty - eye, Math.hypot(tx - x, tz - z))))
  }, [pos[0], pos[1], look[0], look[1], look[2]])
}

async function measure (page, ms = WIN_MS) {
  await page.evaluate(MEASURE_START)
  await sleep(ms)
  return page.evaluate(MEASURE_STOP)
}

// ── 실행 ────────────────────────────────────────────────────────────────────────
await acquireLock()
const server = serve()
let exitCode = 0
process.on('exit', () => { releaseLock(); killServer(server) })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { releaseLock(); process.exit(1) })

const report = {
  runner: OWNER_TAG(), preset: PRESET, deviceScaleFactor: DPR, viewport: [VW, VH],
  windowMs: WIN_MS, at: new Date().toISOString(),
  census: null, views: [], ablation: [], dprSweep: [], resize: [], console: []
}

try {
  await waitPort()
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true, args: GPU_ARGS })
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR })
  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
  page.setDefaultTimeout(240000)

  // --stats 는 FRAME LEDGER 오버레이까지 같이 태운다(그 코드 경로의 회귀 검증용). 기본은 꺼둔다 —
  // 0.25s 마다 도는 정렬·DOM 쓰기가 계측값에 섞이면 안 된다.
  await page.goto(`http://127.0.0.1:${PORT}/?q=${PRESET}${has('--stats') ? '&stats=1' : ''}`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => window.__CECIL__?.ready, null, { timeout: 240000 })
  await page.waitForFunction(() => {
    const t = window.__ENGINE__?.get('title')
    return t && (t.active === 'gate' || t.active === 'title')
  }, null, { timeout: 120000 }).catch(() => {})
  if (await page.evaluate(() => window.__ENGINE__?.get('title')?.active === 'gate')) await page.keyboard.press('Space')
  await page.waitForFunction(() => window.__ENGINE__?.get('title')?.active === 'title', null, { timeout: 120000 }).catch(() => {})

  await page.keyboard.press('Enter')
  // 인트로 30초를 실시간으로 기다리면 계측 한 판이 2분 늘어난다. 시계를 종점 직전으로 밀면
  // 다음 update 틱이 _handoff() 와 _finish() 를 순서대로 발화한다 — 이양 이후 상태는 동일하다.
  await page.waitForFunction(() => window.__ENGINE__?.get('cinematics')?.playing === true, null, { timeout: 60000 }).catch(() => {})
  await page.evaluate(() => { const c = window.__ENGINE__.get('cinematics'); if (c) c.clock = 29.95 })
  await page.waitForFunction(() => window.__ENGINE__?.get('cinematics')?.playing === false, null, { timeout: 60000 })
  // 이양 직후 노출 적응(2.4 엔진초)이 끝날 때까지 둔다 — 적응 중 프레임은 셰이더가 같아도
  // 오토노출 계측이 매 프레임 돌아 수치가 흔들린다.
  await sleep(9000)

  await page.evaluate(INSTALL)
  await page.evaluate(() => { window.__DPR0__ = window.__ENGINE__.renderer.getPixelRatio() })
  await page.evaluate(() => {
    const u = window.__ENGINE__.get('pipeline')?.composite?.mat?.uniforms
    window.__UBAK__ = u ? { uHalation: u.uHalation.value, uGrain: u.uGrain.value, uChromatic: u.uChromatic.value, uVignette: u.uVignette.value } : null
  })

  report.census = await page.evaluate(CENSUS)
  console.log(`\n인구조사: 메시 ${report.census.meshes}(가시 ${report.census.visible}) · 캐스터 ${report.census.casters}(가시 ${report.census.visCasters})`)
  console.log(`  광원 ${report.census.lights} · 지금 그림자 굽는 광원 ${report.census.castingNow} · 타이머쿼리 ${report.census.timerQuery}`)
  console.log(`  DPR ${report.census.rendererPixelRatio} · 드로잉버퍼 ${report.census.drawingBuffer.join('×')} · CSS ${report.census.cssSize.join('×')}`)
  console.log(`  패스 ${report.census.passes.join(', ')}`)

  // ① 기준선 — 시점별 P50/P95
  for (const v of VIEWS) {
    await place(page, v.pos, v.look)
    await sleep(2200)
    const m = await measure(page)
    report.views.push({ id: v.id, ...m })
    console.log(`  ${v.id.padEnd(20)} p50 ${String(m.p50).padStart(7)} ms · p95 ${String(m.p95).padStart(7)} ms · cpu50 ${String(m.cpu50).padStart(6)} ms · ${m.calls} calls · ${m.fps} fps`)
  }

  // ② 심문 — 데스크 정면 진입(probe-tell 동선). 앵커 `npc/deitch` 를 씬에서 찾아 그 좌표를
  //    직접 겨눈다. 텔레포트 직후에는 상호작용 레이캐스트가 한 프레임 늦게 서므로 재시도한다.
  if (!has('--no-ig')) {
    try {
      const npc = await page.evaluate(() => {
        let hit = null
        window.__ENGINE__.scene.traverse(o => { if (!hit && o.userData?.interact?.npc === 'deitch') hit = o })
        if (!hit) return null
        const v = new hit.position.constructor()
        hit.getWorldPosition(v)
        return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]
      })
      const at = npc || [-3.35, 1.0, -4.25]
      await place(page, [at[0] + 0.9, at[2] + 1.9], [at[0], at[1] + 1.15, at[2]])
      await sleep(1600)
      // 상호작용 레이캐스트 대신 모듈 자신의 진입점을 쓴다. 여기서 재는 것은 "E 를 맞출 수
      // 있는가"가 아니라 심문 상태의 렌더 비용이라, 입력 경로의 흔들림을 섞을 이유가 없다.
      await page.evaluate(() => window.__ENGINE__.bus.emit('interrogation:start', { npc: 'deitch' }))
      await sleep(2500)
      let phase = await page.evaluate(() => window.__ENGINE__.get('interrogation')?.getState?.()?.phase ?? null)
      if (!phase || phase === 'idle') {
        await page.keyboard.press('e')
        await sleep(1600)
        phase = await page.evaluate(() => window.__ENGINE__.get('interrogation')?.getState?.()?.phase ?? null)
      }
      if (phase && phase !== 'idle') {
        await sleep(2500)
        const m = await measure(page)
        report.views.push({ id: 'interrogation', phase, ...m })
        console.log(`  ${'interrogation'.padEnd(20)} p50 ${String(m.p50).padStart(7)} ms · p95 ${String(m.p95).padStart(7)} ms · cpu50 ${String(m.cpu50).padStart(6)} ms · ${m.calls} calls · ${m.fps} fps`)
      } else {
        console.log(`  interrogation 진입 실패 (phase=${phase}) — 건너뜀`)
        report.views.push({ id: 'interrogation', phase, skipped: true })
      }
    } catch (e) {
      report.views.push({ id: 'interrogation', err: e.message })
    }
  }

  // ②-b 렌더 스케일의 화질 대가 A/B — 같은 세션·같은 카메라에서 예산 적용본과 강제 네이티브본을
  //     나란히 남긴다. "얼마나 빨라졌나"만 보고 "얼마나 흐려졌나"를 안 보면 판정이 반쪽이다.
  if (has('--frames')) {
    const v = VIEWS[2]
    await place(page, v.pos, v.look)
    await sleep(2400)
    await page.screenshot({ path: `${OUT}/scale-budget-${PRESET}.png` })
    await page.evaluate(() => {
      const E = window.__ENGINE__
      window.__QBAK__ = { m: E.quality.maxPixelRatio, p: E.quality.pixelBudget }
      E.quality.maxPixelRatio = 0
      E.quality.pixelBudget = 0
      E.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      E._onResize()
    })
    await sleep(3000)
    await page.screenshot({ path: `${OUT}/scale-native-${PRESET}.png` })
    await page.evaluate(() => {
      const E = window.__ENGINE__
      E.quality.maxPixelRatio = window.__QBAK__.m
      E.quality.pixelBudget = window.__QBAK__.p
      E._onResize()
    })
    await sleep(2400)
    console.log(`  프레임 A/B → ${OUT}/scale-{budget,native}-${PRESET}.png`)
  }

  // ③ 패스별 기여 — 하나씩 빼고 델타. RESUME §3.2(나): enabled=false 로는 부족하고 엔트리를
  //    삭제해야 파이프라인이 진짜로 건너뛴다. composite 은 직속이라 유니폼으로만 만진다.
  if (has('--ablate')) {
    const ABL = [
      ['기준선(재측정)', '(() => {})()'],
      ['−gtao', 'delete window.__ENGINE__.get("pipeline").effects.gtao'],
      ['−ssr', 'delete window.__ENGINE__.get("pipeline").effects.ssr'],
      ['−volumetric', 'delete window.__ENGINE__.get("pipeline").effects.volumetric'],
      ['−bloom', 'delete window.__ENGINE__.get("pipeline").effects.bloom'],
      ['−dof', 'delete window.__ENGINE__.get("pipeline").effects.dof'],
      ['−motionblur', 'delete window.__ENGINE__.get("pipeline").effects.motionblur'],
      ['−taa', 'window.__ENGINE__.get("pipeline").taa.render = () => {}'],
      ['−prepass', 'window.__ENGINE__.get("pipeline").prepass.render = () => {}'],
      ['−contact', 'window.__ENGINE__.get("pipeline").contact.render = () => {}'],
      ['−halation', 'window.__ENGINE__.get("pipeline").composite.mat.uniforms.uHalation.value = 0'],
      ['−grain/CA/vignette', '(() => { const u = window.__ENGINE__.get("pipeline").composite.mat.uniforms; u.uGrain.value = 0; u.uChromatic.value = 0; u.uVignette.value = 0 })()'],
      ['−그림자 전체', 'window.__ENGINE__.renderer.shadowMap.enabled = false'],
      ['−포스트 전체(씬만)', 'window.__ENGINE__.get("pipeline").ready = false']
    ]
    const v = VIEWS[2]
    await place(page, v.pos, v.look)
    await sleep(2000)
    console.log(`\n패스 기여 (${v.id}):`)
    for (const [tag, js] of ABL) {
      await page.evaluate(RESET)
      await sleep(900)
      await page.evaluate(js)
      await sleep(1400)
      const m = await measure(page)
      report.ablation.push({ view: v.id, tag, ...m })
      console.log(`  ${tag.padEnd(22)} p50 ${String(m.p50).padStart(7)} ms · p95 ${String(m.p95).padStart(7)} ms · cpu50 ${String(m.cpu50).padStart(6)} ms · ${m.calls} calls`)
    }
    await page.evaluate(RESET)
    await sleep(900)
  }

  // ④ 렌더 스케일 스윕 — 픽셀 수가 정말 지배적인지. setPixelRatio 후 엔진 리사이즈를 태우면
  //    파이프라인이 전 타깃을 재할당한다(pipeline.resize).
  if (!has('--no-dpr')) {
    const v = VIEWS[2]
    await place(page, v.pos, v.look)
    await sleep(1600)
    console.log('\n렌더 스케일 스윕:')
    for (const r of [2, 1.75, 1.5, 1.25, 1]) {
      await page.evaluate(x => {
        const E = window.__ENGINE__
        E.renderer.setPixelRatio(x)
        E._onResize()
      }, r)
      await sleep(2400)
      const m = await measure(page)
      report.dprSweep.push({ view: v.id, ratio: r, ...m })
      console.log(`  DPR ${String(r).padEnd(5)} ${String(m.buf.join('×')).padEnd(11)} p50 ${String(m.p50).padStart(7)} ms · p95 ${String(m.p95).padStart(7)} ms · cpu50 ${String(m.cpu50).padStart(6)} ms`)
    }
    await page.evaluate(RESET)
  }

  // ⑤ 리사이즈 경로 — 예산은 창 크기에 걸려 있으므로 창이 바뀌면 배율을 다시 계산하고 파이프라인
  //    타깃을 통째로 재할당한다. 이 경로가 이번 변경에서 가장 깨지기 쉬운 곳이라 매번 태운다.
  if (!has('--no-resize')) {
    console.log('\n리사이즈:')
    for (const [w, h] of [[1280, 720], [1920, 1080], [VW, VH]]) {
      await page.setViewportSize({ width: w, height: h })
      await sleep(2600)
      const r = await page.evaluate(() => {
        const E = window.__ENGINE__
        const gl = E.renderer.getContext()
        const t = E.get('pipeline').ctx.targets
        return {
          css: [E.size.w, E.size.h],
          buf: [gl.drawingBufferWidth, gl.drawingBufferHeight],
          ratio: +E.renderer.getPixelRatio().toFixed(3),
          sizeDpr: +E.size.dpr.toFixed(3),
          hdr: [t.hdr.width, t.hdr.height],
          vol: [t.vol.width, t.vol.height],
          glErr: gl.getError()
        }
      })
      const ok = r.hdr[0] === r.buf[0] && r.hdr[1] === r.buf[1] && r.vol[0] === (r.buf[0] >> 1) && r.ratio === r.sizeDpr && r.glErr === 0
      report.resize.push({ requested: [w, h], ...r, ok })
      console.log(`  ${String(w + '×' + h).padEnd(10)} CSS ${r.css.join('×')} → 버퍼 ${r.buf.join('×')} @${r.ratio}x · hdr ${r.hdr.join('×')} · vol ${r.vol.join('×')} · glErr ${r.glErr} · ${ok ? 'OK' : '불일치'}`)
    }
  }

  report.console = [...new Set(logs)].slice(0, 40)
  writeFileSync(`${OUT}/perf-${PRESET}-dpr${DPR}.json`, JSON.stringify(report, null, 2))
  console.log(`\n→ ${OUT}/perf-${PRESET}-dpr${DPR}.json`)
  if (report.console.length) console.log(`콘솔 이슈 ${report.console.length}건:\n` + report.console.slice(0, 10).map(s => '  ' + s).join('\n'))
  await browser.close()
} catch (e) {
  console.error('perf 실패:', e.message)
  exitCode = 1
} finally {
  releaseLock()
  killServer(server)
}
process.exit(exitCode)

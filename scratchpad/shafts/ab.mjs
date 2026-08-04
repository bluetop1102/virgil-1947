// SHAFTS 진단 하네스. atm2/ab.mjs 규약을 그대로 쓰되 광축을 가로지르는 수평 스캔라인의
// 휘도 프로파일을 숫자로 뽑는다. 헐레이션은 composite 직속이라 --off로 못 끄므로 여기서 끈다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const LOCK = new URL('../../.shot-lock', import.meta.url).pathname
const PORT = Number(process.env.SHOT_PORT || 5922)
const OUT = process.env.AB_OUT || 'scratchpad/shafts/run'
const SHOT = process.env.AB_SHOT || 'atmo-corridor-night'
const OWNER = () => `pid=${process.pid} port=${PORT}`
let holds = false

async function lock () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER()); holds = true; return } catch {}
    try { if (Date.now() - statSync(LOCK).mtimeMs > 15 * 60 * 1000) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
    if (i === 0) console.log('  GPU 락 대기 중')
    if (i > 900) return
    await sleep(2000)
  }
}
function unlock () {
  if (!holds) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== OWNER()) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holds = false
}

try { execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' }) } catch {}

await lock()
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', env: { ...process.env, SHOT: '1' }
})
process.on('exit', () => { unlock(); try { server.kill('SIGKILL') } catch {} })
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { unlock(); process.exit(1) })

const t0 = Date.now()
while (Date.now() - t0 < 30000) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
  await sleep(250)
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb']
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
page.setDefaultTimeout(240000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())

// 스캔라인 y 목록(원본 2560x1440 기준). 광축을 가로지르는 행.
const SCAN_Y = (process.env.AB_SCANY || '620,700,780,860').split(',').map(Number)
const SCAN_X = (process.env.AB_SCANX || '600,1900').split(',').map(Number)

const PROBE = ([scanY, scanX]) => {
  const e = window.__ENGINE__
  const gl = e.renderer.getContext()
  e.frame(1 / 60)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
  const buf = new Uint8Array(w * h * 4)
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf)
  const lumAt = (x, y) => {
    const gy = h - 1 - y
    if (gy < 0 || gy >= h || x < 0 || x >= w) return 0
    const i = (gy * w + x) * 4
    return 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]
  }
  const box = (x0, y0, x1, y1) => {
    let s = 0, s2 = 0, c = 0, lo = 255, hi = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const l = lumAt(x, y); s += l; s2 += l * l; c++
      if (l < lo) lo = l
      if (l > hi) hi = l
    }
    const m = s / c
    return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / c - m * m, 0)).toFixed(1), min: +lo.toFixed(0), max: +hi.toFixed(0) }
  }
  // 각 스캔라인: 세로 5px 평균으로 그레인을 눌러 형상만 남긴다
  const scans = {}
  for (const y of scanY) {
    const row = []
    for (let x = scanX[0]; x < scanX[1]; x += 4) {
      let s = 0
      for (let dy = -2; dy <= 2; dy++) s += lumAt(x, y + dy)
      row.push(+(s / 5).toFixed(1))
    }
    scans[y] = row
  }
  const p = e.get('pipeline')
  let hist = new Int32Array(256), sum = 0
  const n = w * h
  for (let i = 0; i < n; i++) {
    const l = (0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2]) | 0
    hist[l]++; sum += l
  }
  const rank = q => { const t = Math.ceil(n * q); let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= t) return v } return 255 }
  let dark = 0
  for (let v = 0; v <= 6; v++) dark += hist[v]
  return {
    mean: +(sum / n).toFixed(1), p999: rank(0.999), darkPct: +(dark * 100 / n).toFixed(2),
    ev: p?.composite ? +Number(p.composite.exposure ?? 0).toFixed(3) : null,
    // 좌측 벽등 광축 코어 / 그 바로 옆 축밖 / 원경 출입구 평면 / 어두운 천장(먼지 검사)
    axisL: box(1120, 700, 1240, 820),
    offAxisL: box(1380, 700, 1500, 820),
    farDoor: box(1400, 480, 1740, 880),
    darkCeil: box(1000, 400, 1600, 700),
    scans
  }
}

// composite 은 매 프레임 look.halation 을 유니폼에 다시 밀어넣는다 — 유니폼을 0으로 두면
// 다음 프레임에 되돌아온다. 소스인 engine.look 을 꺼야 실제로 꺼진다.
const setup = {
  ship: () => {},
  nohal: () => { window.__ENGINE__.look.halation = 0 },
  noshaft: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => { const u = o.material?.uniforms; if (u && u.uSlatFreq) o.visible = false })
  },
  novol: () => {
    window.__ENGINE__.look.halation = 0
    delete window.__ENGINE__.get('pipeline').effects.volumetric
  },
  nopart: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => { if (o.name === 'atmo.particles') o.visible = false })
  },
  volonly: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const u = o.material?.uniforms
      if (u && u.uSlatFreq) o.visible = false
      if (o.name === 'atmo.particles') o.visible = false
    })
  },
  shaftonly: () => {
    window.__ENGINE__.look.halation = 0
    delete window.__ENGINE__.get('pipeline').effects.volumetric
    window.__ENGINE__.scene.traverse(o => { if (o.name === 'atmo.particles') o.visible = false })
  },
  // 먼지 계열 분리: uRise 는 smoke() 전용, uMaxPx 만 있으면 dust()
  nodust: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => { const u = o.material?.uniforms; if (u?.uMaxPx && !u.uRise) o.visible = false })
  },
  // 광축 차폐만 끈다. atmosphere.update 가 매 프레임 uShadowOn 을 되쓰므로 값을 못 쓰게 막는다
  noocc: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const u = o.material?.uniforms
      if (u?.uCosOuter) Object.defineProperty(u.uShadowOn, 'value', { get: () => 0, set: () => {} })
    })
  },
  // 차폐 양성대조. 출하 광축(1.5m)은 안에 오클루더가 하나도 없어 uShadowOn 을 꺼도 화면이
  // 그대로다 — 그건 셰이더가 죽은 게 아니라 막을 물체가 없다는 뜻이다. 프록시를 4배로 키우고
  // uLen 을 6m 로 맞추면(반각 동일) 벽등 빔이 2.88m 지점에서 바닥을 관통한다. 그 아래는
  // 광원 섀도맵 기준으로 확실한 차폐 영역이다.
  occtest: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const u = o.material?.uniforms
      if (!u?.uCosOuter) return
      o.parent.scale.setScalar(4)
      Object.defineProperty(u.uLen, 'value', { get: () => 6.0, set: () => {} })
    })
  },
  occtestOff: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const u = o.material?.uniforms
      if (!u?.uCosOuter) return
      o.parent.scale.setScalar(4)
      Object.defineProperty(u.uLen, 'value', { get: () => 6.0, set: () => {} })
      Object.defineProperty(u.uShadowOn, 'value', { get: () => 0, set: () => {} })
    })
  },
  // 섀도 좌표·맵 샘플을 그대로 색으로 뱉는다. R=vsm, G=맵의 mean, B=비교 깊이 c.z.
  // 차폐가 안 걸리는 이유가 좌표 범위인지 깊이 규약인지 값으로 가른다.
  dbgvsm: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const m = o.material
      if (!m?.uniforms?.uCosOuter) return
      o.parent.scale.setScalar(4)
      Object.defineProperty(m.uniforms.uLen, 'value', { get: () => 6.0, set: () => {} })
      m.blending = 0
      m.transparent = false
      m.fragmentShader = m.fragmentShader.replace(
        'gl_FragColor = vec4(uColor * (acc * uIntensity), 1.0);',
        `vec3 pm = ro + rd * mix(t0, tEnd, 0.92);
   vec4 sc = uShadowMat * vec4(pm, 1.0);
   vec3 cc = sc.xyz / sc.w;
   float mv = texture2D(uShadowMap, cc.xy).r;
   gl_FragColor = vec4(vsm(pm), mv, cc.z, 1.0);`)
      m.needsUpdate = true
    })
  },
  // vsm 경로 생존 확인. 바이어스를 크게 밀면 모든 샘플이 "차폐"로 떨어져야 한다.
  // 광축이 사라지면 vsm 결과가 실제로 누적에 곱해지고 있다는 뜻이다.
  biasPlus: () => {
    window.__ENGINE__.look.halation = 0
    window.__ENGINE__.scene.traverse(o => {
      const u = o.material?.uniforms
      if (!u?.uCosOuter) return
      Object.defineProperty(u.uShadowBias, 'value', { get: () => 0.5, set: () => {} })
    })
  },
  // 볼류메트릭 spark 만 0 — 반짝임이 패스 소산인지 파티클 스프라이트인지 가른다
  nospark: () => {
    window.__ENGINE__.look.halation = 0
    const v = window.__ENGINE__.get('pipeline').effects.volumetric
    if (v?.mMarch) v.mMarch.uniforms.uSpark.value = 0
  }
}

const VARIANTS = (process.env.AB_VARIANTS || 'ship,nohal,noshaft,novol').split(',')
const rows = []
for (const v of VARIANTS) {
  await page.evaluate(n => window.__CECIL__.goto(n), SHOT)
  if (setup[v]) await page.evaluate(`(${setup[v].toString()})()`)
  await page.evaluate(() => window.__CECIL__.settle(120))
  await page.screenshot({ path: `${OUT}/${v}.png`, timeout: 120000 })
  const lum = await page.evaluate(PROBE, [SCAN_Y, SCAN_X])
  rows.push({ v, ...lum })
  console.log(` ${v.padEnd(10)} mean=${lum.mean} p999=${lum.p999} dark=${lum.darkPct}% ev=${lum.ev}`)
  console.log(`   axisL ${lum.axisL.mean}/sd${lum.axisL.sd}  offAxisL ${lum.offAxisL.mean}/sd${lum.offAxisL.sd}  farDoor ${lum.farDoor.mean}/sd${lum.farDoor.sd}  darkCeil ${lum.darkCeil.mean}/sd${lum.darkCeil.sd}/max${lum.darkCeil.max}`)
  if (v !== VARIANTS[VARIANTS.length - 1]) {
    await page.reload({ waitUntil: 'load' })
    await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
    await page.evaluate(() => window.__CECIL__.warmup())
  }
}
writeFileSync(`${OUT}/ab.json`, JSON.stringify({ rows, logs: [...new Set(logs)].slice(0, 40) }, null, 2))
if (logs.length) console.log('console:', [...new Set(logs)].slice(0, 10).join(' | '))
await browser.close()
unlock()
try { server.kill('SIGKILL') } catch {}
process.exit(0)

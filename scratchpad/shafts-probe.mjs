// shoot.mjs 파생 진단 하네스(SHAFTS 담당). 같은 GPU 락을 쓰되 한 세션에서
// 여러 변형(uHalation 0, 셸 숨김, 볼류메트릭 off, 파티클 off)을 연속 촬영한다.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, rmSync, statSync, readFileSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const ROOT = '/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir'
const LOCK = `${ROOT}/.shot-lock`
const LOCK_STALE_MS = 15 * 60 * 1000
const PORT = Number(process.env.SHOT_PORT || 5922)
const OUT = process.argv[2] || '/tmp/probe'
const SHOT = process.argv[3] || 'atmo-corridor-night'
const OWNER = () => `pid=${process.pid} port=${PORT}`
let holds = false

async function acquire () {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(`${LOCK}/owner`, OWNER()); holds = true; return } catch {}
    try { if (Date.now() - statSync(LOCK).mtimeMs > LOCK_STALE_MS) { rmSync(LOCK, { recursive: true, force: true }); continue } } catch {}
    if (i === 0) console.log('  GPU 락 대기 중')
    if (i > 900) return
    await sleep(2000)
  }
}
function release () {
  if (!holds) return
  try { if (readFileSync(`${LOCK}/owner`, 'utf8') !== OWNER()) return } catch {}
  try { rmSync(LOCK, { recursive: true, force: true }) } catch {}
  holds = false
}

await acquire()
try { execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: 'ignore' }) } catch {}
const server = spawn(`${ROOT}/node_modules/.bin/vite`, ['--port', String(PORT), '--strictPort'], {
  cwd: ROOT, stdio: 'ignore', detached: true, env: { ...process.env, SHOT: '1' }
})
const kill = () => { try { process.kill(-server.pid, 'SIGKILL') } catch {} }
process.on('exit', () => { release(); kill() })
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); kill(); process.exit(1) })

const t0 = Date.now()
while (Date.now() - t0 < 30000) {
  try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
  await sleep(250)
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
    '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb']
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
page.setDefaultTimeout(240000)
await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await page.evaluate(() => window.__CECIL__.warmup())

await page.evaluate(() => {
  const E = window.__ENGINE__
  window.__P = {
    shafts () {
      const out = []
      E.scene.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uCosOuter) out.push(o) })
      return out
    },
    hal (v) { const c = E.get('pipeline') && E.get('pipeline').composite; if (c && c.mat) c.mat.uniforms.uHalation.value = v },
    setShafts (v) { for (const s of window.__P.shafts()) s.visible = v },
    dumpShafts () {
      return window.__P.shafts().map(s => {
        const u = s.material.uniforms
        const w = s.getWorldPosition(E.camera.position.clone())
        return {
          pos: [+w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2)],
          I: +u.uIntensity.value.toFixed(4), len: u.uLen.value,
          cosOuter: +u.uCosOuter.value.toFixed(4), shadowOn: u.uShadowOn.value,
          soft: u.uSoft.value, hasMap: !!u.uShadowMap.value, gain: u.uGain.value
        }
      })
    },
    vol (on) {
      const p = E.get('pipeline')
      if (!p || !p.effects || !p.effects.volumetric) return 'missing'
      p.effects.volumetric.enabled = on
      return 'ok'
    },
    // 마치의 섀도 기여만 죽인다. light.shadow.intensity 를 건드리면 three 의 표면 셰이딩까지
    // 같이 바뀌어 A/B 가 오염된다. uLParam2.w 는 마치 셰이더 전용 mix 계수다.
    volShadow (on) {
      const v = E.get('pipeline').effects.volumetric
      if (v.__patched) { v.__noShadow = !on; return 'ok' }
      const orig = v._upload.bind(v)
      v.__noShadow = !on
      v.__patched = true
      v._upload = (ls) => {
        orig(ls)
        if (!v.__noShadow) return
        const u = v.mMarch.uniforms
        for (let i = 0; i < ls.length; i++) u.uLParam2.value[i].w = 0
      }
      return 'ok'
    },
    volLights () {
      const v = E.get('pipeline').effects.volumetric
      return (v.lights || []).map(l => ({
        name: l.obj.name, type: l.type, sIdx: l.shadowIdx,
        inten: +l.obj.intensity.toFixed(3),
        pos: [...l.obj.matrixWorld.elements.slice(12, 15)].map(n => +n.toFixed(2))
      }))
    },
    parts (v) {
      const out = []
      E.scene.traverse(o => { if (o.isPoints) out.push(o) })
      for (const o of out) o.visible = v
      return out.length
    },
    // 패스 제거는 enabled=false 로는 부족하다 — pipeline 이 타깃 존재 여부로 합성하므로
    // 엔트리 자체를 지워야 직전 프레임 결과가 계속 합성되지 않는다(shoot.mjs 와 같은 규약).
    drop (names) {
      const p = E.get('pipeline')
      const hit = []
      for (const n of names) { if (p.effects && p.effects[n]) { delete p.effects[n]; hit.push(n) } }
      return hit
    },
    // 광원 종류별 소등. 표면 조명이 만든 쐐기인지 공기 산란인지 가른다.
    lights (kill) {
      let n = 0
      E.scene.traverse(o => {
        if (!o.isLight || o.isAmbientLight || o.isHemisphereLight) return
        if (kill === 'up' && !/\.up$/.test(o.name)) return
        if (kill === 'fill' && !/\.fill$/.test(o.name)) return
        o.visible = false; n++
      })
      return n
    }
  }
})

await page.evaluate(v => { window.__NOPARTS = v }, process.env.NOPARTS === '1')
await page.evaluate(n => window.__CECIL__.goto(n), SHOT)
// 노출을 고정하지 않으면 변형마다 자동노출이 상쇄해 A/B 델타가 무효가 된다.
console.log('EV FROZEN:', await page.evaluate(force => {
  const p = window.__ENGINE__.get('pipeline')
  const lk = (p.ctx.look.exposure ?? 1)
  const cur = force > 0 ? force : p.composite.exposure
  p.expo.measure = () => cur / lk
  return +cur.toFixed(4)
}, Number(process.env.FREEZE_EV || 0)))
console.log('SHAFTS:', JSON.stringify(await page.evaluate(() => window.__P.dumpShafts())))
console.log('POINTS:', await page.evaluate(() => window.__P.parts(true)))
console.log('VOLLIGHTS:', JSON.stringify(await page.evaluate(() => window.__P.volLights())))
console.log('STATS:', JSON.stringify(await page.evaluate(() => window.__CECIL__.stats())))

const variants = JSON.parse(process.env.VARIANTS || '["base"]')
for (const v of variants) {
  await page.evaluate(name => {
    const P = window.__P
    const bare = name.startsWith('bare')
    P.hal(name === 'halon' ? 0.32 : 0)
    P.setShafts(name !== 'noshell' && !bare)
    P.vol(name !== 'novol' && !bare)
    P.parts(name !== 'noparts' && !bare && !window.__NOPARTS)
    if (name === 'volnoshadow' || name === 'base2') P.volShadow(name !== 'volnoshadow')
    // u:uBeamWarp=6 · 마치 셰이더 유니폼 직접 오버라이드. _upload 는 광원 배열만 쓰므로 유지된다.
    const ux = name.indexOf('u:')
    if (ux >= 0) {
      const v = window.__ENGINE__.get('pipeline').effects.volumetric
      for (const kv of name.slice(ux + 2).split('+')) {
        const [k, val] = kv.split('=')
        if (v.mMarch.uniforms[k]) v.mMarch.uniforms[k].value = Number(val)
      }
    }
    // atmosphere.update() 가 매 프레임 uShadowOn 을 되쓰므로 단순 대입은 즉시 덮인다.
    if (name === 'noshadow') {
      for (const s of P.shafts()) {
        Object.defineProperty(s.material.uniforms.uShadowOn, 'value', { get: () => 0, set: () => {}, configurable: true })
      }
    }
    const ix = name.indexOf('-off:')
    if (ix >= 0) console.log('    dropped:', P.drop(name.slice(ix + 5).split('+')).join(','))
    const lx = name.indexOf('-nolight:')
    if (lx >= 0) console.log('    lights off:', P.lights(name.slice(lx + 9)))
  }, v)
  // goto 의 advanceTo 는 Math.max(t, time) 이라 시간을 되감지 않는다. 변형마다 엔진 시간이
  // 0.8초씩 앞으로 가고, 광원 플리커(±5%)가 프레임 밝기를 4~6 레벨 흔들어 A/B 델타를 삼킨다
  // (실측: 동일 변형 2회의 바닥 평균차 -4.15). 촬영 직전에 시간을 샷 기준값으로 되감아 고정한다.
  await page.evaluate(n => { window.__ENGINE__.time = window.__CECIL__.shots[n].time ?? 10 }, SHOT)
  await page.evaluate(n => window.__CECIL__.goto(n), SHOT)
  // preserveDrawingBuffer 가 꺼져 있어 스크린샷이 마지막 프레임인지 그 직전 프레임인지 보장되지
  // 않는다. 광원 플리커가 프레임마다 ±5% 흔들리므로 어느 쪽이 잡히느냐에 따라 영역 평균이
  // 최대 25 레벨 튄다(실측: 동일 설정 5회에서 -25.6 / +25.3). 시간을 상수로 묶어 마지막 몇
  // 프레임을 서로 동일하게 만들면 어느 프레임이 잡혀도 같은 그림이다.
  await page.evaluate(() => {
    const E = window.__ENGINE__
    const t = E.time
    Object.defineProperty(E, 'time', { get: () => t, set: () => {}, configurable: true })
    // 12프레임은 볼류메트릭 시간 누적(uFeedback 0.84)이 수렴하지 못한다. 잔차가 변형 순서마다
    // 다르게 남아, 완전히 동일한 설정 4회가 콘 박스 평균 116.0 / 121.4 / 90.9 / 120.2 (스프레드
    // 30레벨)로 나왔다 — 지금까지의 A/B "효과"가 사실 이 자리표였다. 0.84^96 = 5e-8 이면 수렴한다.
    window.__CECIL__.settle(96)
  })
  await page.screenshot({ path: `${OUT}/${v}.png`, timeout: 120000 })
  await page.evaluate(() => { const E = window.__ENGINE__; const t = E.time; delete E.time; E.time = t })
  const st = await page.evaluate(() => {
    const p = window.__ENGINE__.get('pipeline')
    const c = window.__ENGINE__.camera.userData || {}
    return {
      ev: +Number(p.composite.exposure).toFixed(4),
      hdr: +Number(p.expo.stats.avg).toExponential(3),
      focus: +Number(c.focus ?? 0).toFixed(3),
      time: +window.__ENGINE__.time.toFixed(3)
    }
  })
  console.log(`  ✓ ${v}`, JSON.stringify(st))
}
console.log('CONSOLE:', JSON.stringify([...new Set(logs)].slice(0, 20)))
await browser.close()
release(); kill()
process.exit(0)

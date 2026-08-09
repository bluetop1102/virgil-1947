// JUDGE 검증 프로브 공용 드라이버 — judge-plan-2026-08-09 발주 세션(S-A~S-D)과 게이트(S-F)가 쓴다.
// 조건: headless Chromium, ANGLE Metal, 1600×900. 이동·상호작용·선택은 실제 키 입력,
// 마우스룩만 yawT/pitchT 등가 입력(2차 판정·JUDGE 판정과 동일 조건).
//
// 사용: PROBE_URL=http://127.0.0.1:57XX/ PROBE_OUT=shots/judge-sa node tools/judge-probes/probe-audio.mjs
//   PROBE_URL 미지정 시 배포본을 찌른다. 로컬 검증은 자기 포트의 vite를 띄우고 PROBE_URL로.
//   PROBE_OUT 기본은 shots/judge-verify — 병렬 세션은 반드시 자기 디렉터리를 지정해라.
// 주의: GPU를 쓴다. 자기 수정이 끝난 뒤 실행하고, shoot.mjs 전체 샷과 동시 실행은 피해라.
//
// 낡은 판 PASS 함정(S-A 실측 2026-08-09): SHOT=1 로 띄운 vite 는 파일 워처가 꺼져 있어
// **소스를 고쳐도 옛 변환 결과를 계속 서빙한다** — 그 상태의 PASS 는 수정 전 코드의 PASS 다.
// 규칙: ①소스를 고쳤으면 프로브 전에 vite 를 재시작한다 ②의심되면 서빙되는 판을 먼저 확인:
//   curl -s http://127.0.0.1:<port>/src/<파일> | grep -c <새로 넣은 심볼>
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

export { sleep }
export const URL_ = process.env.PROBE_URL || 'https://bluetop1102.github.io/virgil-1947/'
export const OUT = resolve(process.env.PROBE_OUT || 'shots/judge-verify')
const GPU_ARGS = [
  '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb',
  '--autoplay-policy=no-user-gesture-required'
]

export async function boot () {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  const issues = []
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', e => issues.push(`pageerror: ${e.message}`))
  await page.goto(URL_, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => window.__CECIL__?.ready, null, { timeout: 240000 })
  await page.waitForFunction(() => {
    const t = window.__ENGINE__?.get('title')
    return t && t.active === 'title'
  }, null, { timeout: 120000 }).catch(() => {})
  return { browser, page, issues }
}

// 마스터 버스 Analyser 탭(측정 전용 — 신호 경로 무변경). ctx는 첫 제스처 후 생기므로 폴링 대기.
export async function armAudioTap (page) {
  await page.evaluate(() => {
    const tick = () => {
      const a = window.__ENGINE__?.get('audio')
      if (!a?.ctx || !a.master || window.__TAP__) { if (!window.__TAP__ && !a?.ctx) setTimeout(tick, 300); return }
      const an = a.ctx.createAnalyser()
      an.fftSize = 2048
      a.master.connect(an)
      window.__TAP__ = { an, buf: new Float32Array(an.fftSize) }
      setTimeout(tick, 300)
    }
    tick()
  })
}

// 페이지 상주 샘플러 — 250ms 간격 RMS(dBFS)·musicOn·radio. 프로브 끝에 fetchAudioLog.
export async function startAudioLog (page) {
  await page.evaluate(() => {
    window.__AUDLOG__ = []
    setInterval(() => {
      const E = window.__ENGINE__
      const a = E?.get('audio')
      let rms = null
      if (window.__TAP__) {
        const { an, buf } = window.__TAP__
        an.getFloatTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
        const r = Math.sqrt(s / buf.length)
        rms = r > 1e-7 ? +(20 * Math.log10(r)).toFixed(1) : -160
      }
      window.__AUDLOG__.push({
        t: E ? +E.time.toFixed(2) : null,
        ctx: a?.ctx?.state ?? null,
        rms,
        musicOn: a?.musicOn ?? null,
        radio: !!a?.radio
      })
      if (window.__AUDLOG__.length > 6000) window.__AUDLOG__.shift()
    }, 250)
  })
}

export async function fetchAudioLog (page) {
  return page.evaluate(() => window.__AUDLOG__ ?? [])
}

// 버스 이벤트 타임라인 — 입력↔응답 채널 계수용.
export async function startEventLog (page) {
  await page.evaluate(() => {
    window.__EVTLOG__ = []
    const E = window.__ENGINE__
    const tap = (ev) => E.bus.on(ev, (p) => window.__EVTLOG__.push({
      t: +E.time.toFixed(2),
      ev,
      p: p && typeof p === 'object'
        ? JSON.parse(JSON.stringify({ id: p.id, targetId: p.targetId, sid: p.sid, choice: p.choice, on: p.on, act: p.act, phase: p.phase }))
        : p
    }))
    for (const ev of ['player:interact', 'evidence:collected', 'ui:open', 'ui:close',
      'interrogation:prompt', 'interrogation:choose', 'interrogation:left', 'cinematic:start',
      'cinematic:end', 'game:pause', 'title:proceed', 'act:phase']) tap(ev)
  })
}

export async function fetchEventLog (page) {
  return page.evaluate(() => window.__EVTLOG__ ?? [])
}

export async function stats (page) {
  return page.evaluate(() => {
    const E = window.__ENGINE__
    const p = E.get('player')
    const pl = E.modules.get('pipeline')
    const ig = E.get('interrogation')
    return {
      t: +E.time.toFixed(1),
      expo: pl?.expo?.value != null ? +(+pl.expo.value).toFixed(2) : null,
      pos: p?.pos ? [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)] : null,
      phase: ig?.phase ?? null,
      focus: p?.focus?.id ?? null
    }
  })
}

// 지금 화면에 보이는 안내 텍스트 전부 — "신선 플레이어가 무엇을 읽을 수 있는가"의 실측.
export async function visibleText (page) {
  return page.evaluate(() => {
    const out = []
    const walk = (el) => {
      if (!(el instanceof HTMLElement)) return
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim())
        else walk(n)
      }
    }
    walk(document.body)
    return out.filter(t => t.length > 0)
  })
}

// 스크린샷 + 순흑 비율·평균 휘도. 반환 {shot, pct, mean, ...stats}
export async function shot (page, name, log) {
  const file = join(OUT, `${name}.jpg`)
  const buf = await page.screenshot({ type: 'jpeg', quality: 84 })
  writeFileSync(file, buf)
  const px = await page.evaluate(async b64 => {
    const img = new Image()
    img.src = `data:image/jpeg;base64,${b64}`
    await img.decode()
    const cv = document.createElement('canvas')
    cv.width = img.naturalWidth; cv.height = img.naturalHeight
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data
    let black = 0, sum = 0
    const n = cv.width * cv.height
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      if (l < 4) black++
      sum += l
    }
    return { pct: +(black * 100 / n).toFixed(2), mean: +(sum / n).toFixed(1) }
  }, buf.toString('base64'))
  const s = await stats(page)
  const row = { shot: name, ...px, ...s }
  if (log) log.push(row)
  console.log(JSON.stringify(row))
  return row
}

export async function aim (page, x, y, z) {
  await page.evaluate(([tx, ty, tz]) => {
    const E = window.__ENGINE__
    const p = E.get('player')
    const c = E.camera
    const dx = tx - c.position.x, dy = ty - c.position.y, dz = tz - c.position.z
    p.yawT = Math.atan2(-dx, -dz)
    p.pitchT = Math.max(-1.48, Math.min(1.48, Math.atan2(dy, Math.hypot(dx, dz))))
  }, [x, y, z])
}

export async function findTarget (page, id) {
  return page.evaluate(tid => {
    const E = window.__ENGINE__
    let hit = null
    E.scene.traverse(o => {
      if (hit) return
      if (o.userData?.qaId === tid || o.userData?.interact?.id === tid) hit = o
    })
    if (!hit) return null
    const v = new hit.position.constructor()
    hit.getWorldPosition(v)
    return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]
  }, id)
}

export async function walkTo (page, x, z, { tol = 1.0, timeout = 30000 } = {}) {
  const t0 = Date.now()
  let last = null, stuck = 0
  await page.keyboard.down('w')
  try {
    while (Date.now() - t0 < timeout) {
      const s = await stats(page)
      const [px, , pz] = s.pos
      const dx = x - px, dz = z - pz
      if (Math.hypot(dx, dz) <= tol) return true
      const eye = await page.evaluate(() => window.__ENGINE__.camera.position.y)
      await aim(page, x, eye, z)
      if (last && Math.hypot(px - last[0], pz - last[1]) < 0.04) {
        stuck++
        if (stuck >= 3) {
          const side = stuck % 2 ? 'a' : 'd'
          await page.keyboard.down(side)
          await sleep(600)
          await page.keyboard.up(side)
          stuck = 0
        }
      } else stuck = 0
      last = [px, pz]
      await sleep(250)
    }
    return false
  } finally {
    await page.keyboard.up('w')
  }
}

export function saveLog (name, log) {
  const file = join(OUT, `${name}.json`)
  writeFileSync(file, JSON.stringify(log, null, 1))
  console.log(`log → ${file}`)
}

// PASS/FAIL 집계 출력 — 각 프로브가 마지막에 부른다. 실패 시 exit 1.
export function verdict (checks) {
  let fail = 0
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
    if (!ok) fail++
  }
  console.log(fail === 0 ? '== VERDICT: PASS ==' : `== VERDICT: FAIL (${fail}건) ==`)
  process.exitCode = fail === 0 ? 0 : 1
}

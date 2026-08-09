// [AUDIO] 절차 합성 자체검증. OfflineAudioContext로 실제 렌더한 표본만 근거로 판정한다.
//   node tools/test-audio.mjs
//   node tools/test-audio.mjs --png [디렉터리]   파형·감쇠곡선·스펙트로그램 PNG 를 떠서 눈으로 본다
// 검사: NaN/Inf 부재, 피크·RMS 합리 범위, 방별 RT60(E7 §3 사양)·서열, 룸톤 루프 이음매 연속성,
//       **발화되는 sfx id 가 전부 실재 스펙으로 해소되는가**(미등록이 ui.tick 으로 흡수되던 결함).
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const PNG_FLAG = process.argv.indexOf('--png')
const PNG_DIR = PNG_FLAG >= 0 ? (process.argv[PNG_FLAG + 1]?.startsWith('--') ? null : process.argv[PNG_FLAG + 1]) ?? 'shots/audio' : null

// 소스에서 실제로 발화되는 sfx id 를 긁는다. 오디오 모듈이 아니라 게임 쪽이 진실원이다.
function emittedIds (dir, out = new Set(), dyn = new Set()) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) { emittedIds(p, out, dyn); continue }
    if (extname(p) !== '.js') continue
    const src = readFileSync(p, 'utf8')
    for (const m of src.matchAll(/emit\(\s*['"]sfx['"]\s*,\s*\{[^}]*?id:\s*(['"`])([^'"`]*)\1/g)) {
      if (m[1] === '`' && /\$\{/.test(src.slice(m.index, m.index + 120))) { dyn.add(`${p}: ${m[2]}…`); continue }
      out.add(m[2])
    }
  }
  return { ids: [...out], dynamic: [...dyn] }
}

// 동적 id 의 전개는 기계가 못 편다. 여기에 손으로 등재하고, 등재 밖 동적 id 가 나오면 실패로 센다.
const DYNAMIC_EXPANSION = ['evidence:pickup', 'evidence:observe', 'evidence:photos']
const DYNAMIC_REGISTERED = 1   // src/gameplay/evidence.js 의 `evidence:${def.mode}` 1건
// 루프 소스라 원샷 스펙이 없다. engine.js 가 _radio() 로 가로챈다.
const LOOP_IDS = new Set(['radio:lobby-loop'])

const PORT = Number(process.env.AUDIO_TEST_PORT || 5411)
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
process.on('exit', () => { try { server.kill('SIGKILL') } catch {} })

async function waitPort (ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) return } catch {}
    await sleep(250)
  }
  throw new Error('vite did not start')
}

let fail = 0
try {
  await waitPort()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const logs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
  await page.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })

  const scan = emittedIds('src')
  const emitted = { ids: scan.ids.filter(id => !LOOP_IDS.has(id)), expansion: DYNAMIC_EXPANSION }
  const res = await page.evaluate(async (input) => {
    const SR = 48000
    const dsp = await import('/src/audio/dsp.js')
    const ir = await import('/src/audio/ir.js')

    const stat = (ch) => {
      let peak = 0, sum = 0, bad = 0, dc = 0
      for (const d of ch) {
        for (let i = 0; i < d.length; i++) {
          const v = d[i]
          if (!Number.isFinite(v)) { bad++; continue }
          const a = Math.abs(v)
          if (a > peak) peak = a
          sum += v * v
          dc += v
        }
      }
      const n = ch.length * ch[0].length
      return { peak, rms: Math.sqrt(sum / n), bad, dc: dc / n }
    }

    // 실제 오디오 그래프를 통과시킨 결과만 신뢰한다 — 배열 계산만으로는 노드 연결 오류가 안 잡힌다.
    const through = async (data) => {
      const n = data[0].length
      const oc = new OfflineAudioContext({ numberOfChannels: data.length, length: n, sampleRate: SR })
      const b = oc.createBuffer(data.length, n, SR)
      data.forEach((d, i) => b.copyToChannel(d, i))
      const s = oc.createBufferSource()
      s.buffer = b
      s.connect(oc.destination)
      s.start()
      const out = await oc.startRendering()
      return Array.from({ length: data.length }, (_, i) => out.getChannelData(i))
    }

    const out = { foot: [], sfx: [], bed: [], ir: [], water: null, errors: [] }

    for (const m of Object.keys(dsp.FOOT)) {
      const variants = []
      for (let v = 0; v < 3; v++) variants.push(dsp.footBuffer(m, v, SR))
      const s = stat(await through([variants[0]]))
      // 변주가 실제로 다른가 — 같은 버퍼를 돌려쓰면 발소리가 기계로 들린다
      let diff = 0
      for (let i = 0; i < variants[0].length; i++) diff += Math.abs(variants[0][i] - variants[1][i])
      out.foot.push({ id: m, ...s, dur: +(variants[0].length / SR).toFixed(3), diff: +(diff / variants[0].length).toFixed(5) })
    }

    for (const id of Object.keys(dsp.SFX)) {
      const s = stat(await through([dsp.sfxBuffer(id, 0, SR)]))
      out.sfx.push({ id, ...s })
    }

    const rooms = ['lobby', 'corridor', 'room', 'bath', 'roof', 'elevator']
    for (const r of rooms) {
      const bed = ir.renderBed(r, SR)
      const ch = await through(bed.ch)
      const s = stat(ch)
      // 루프 이음매: 마지막→처음 점프가 내부 인접 샘플 변화보다 크게 튀면 클릭이 들린다
      const d = ch[0]
      let local = 0
      for (let i = 1; i < d.length; i++) local += Math.abs(d[i] - d[i - 1])
      local /= d.length - 1
      out.bed.push({ id: r, ...s, dur: bed.dur, seam: +(Math.abs(d[0] - d[d.length - 1]) / Math.max(local, 1e-9)).toFixed(2) })
    }

    // IR은 컨볼버에 실제로 물려 임펄스를 통과시킨 뒤 슈뢰더 적분으로 RT60을 역산한다.
    for (const r of rooms) {
      const [L, R] = ir.renderIR(r, SR)
      const n = L.length + Math.round(SR * 0.2)
      const oc = new OfflineAudioContext({ numberOfChannels: 2, length: n, sampleRate: SR })
      const irb = oc.createBuffer(2, L.length, SR)
      irb.copyToChannel(L, 0)
      irb.copyToChannel(R, 1)
      const conv = oc.createConvolver()
      conv.normalize = false
      conv.buffer = irb
      const imp = oc.createBuffer(1, 8, SR)
      imp.getChannelData(0)[0] = 1
      const s = oc.createBufferSource()
      s.buffer = imp
      s.connect(conv)
      conv.connect(oc.destination)
      s.start()
      const rendered = await oc.startRendering()
      const d = rendered.getChannelData(0)
      const st = stat([d, rendered.getChannelData(1)])
      let e = 0
      const sch = new Float64Array(d.length)
      for (let i = d.length - 1; i >= 0; i--) { e += d[i] * d[i]; sch[i] = e }
      const ref = sch[0]
      const cross = (db) => {
        const target = ref * Math.pow(10, db / 10)
        for (let i = 0; i < sch.length; i++) if (sch[i] <= target) return i / SR
        return sch.length / SR
      }
      const t5 = cross(-5), t25 = cross(-25)
      out.ir.push({ id: r, ...st, len: +(L.length / SR).toFixed(3), rt60: +(3 * (t25 - t5)).toFixed(3) })
    }

    const w = ir.renderWaterSource(SR)
    out.water = { ...stat(w.ch), dur: w.dur }
    const rd = ir.renderRadioSource(SR)
    out.radio = { ...stat(await through(rd.ch)), dur: rd.dur }

    // 발화 id 해소 — undefined 면 ui.tick 으로 흡수돼 "전부 같은 딸깍"이 된다
    out.resolve = input.ids.concat(input.expansion).map(id => {
      const k = dsp.sfxKey(id)
      return { id, key: k === undefined ? '(미등록)' : k === null ? '(무음)' : k, ok: k === undefined ? 2 : k === null ? 1 : 0 }
    })

    // ── 살아있는 그래프 ──────────────────────────────────────────────
    // 버퍼만 재면 노드 배선 오류가 안 잡힌다. 모듈을 실제 OfflineAudioContext에 물려 렌더한다.
    const mod = (await import('/src/audio/engine.js')).default
    const { musicCue } = await import('/src/audio/music.js')
    const { EventBus } = await import('/src/core/bus.js')
    const cam = { matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.7, 0, 1] } }
    const live = async (room, act, o = {}) => {
      const dur = o.dur ?? 4
      const oc = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(dur * SR), sampleRate: SR })
      const inst = Object.create(mod)
      await inst.init({ qa: false, bus: new EventBus(), state: { act, room }, camera: cam, time: 0 })
      inst._open(oc)
      if (o.radio) inst._radio(true, { pos: [0, 0.9, -1.85], gain: 0.38 })
      inst.toneBus.gain.value = o.tone ?? 0
      inst._levels(0.01)
      if (o.silence) inst.silence(1.2)
      if (o.music) musicCue(inst, o.music)
      if (o.breaking) inst._setBreaking(true, 0.01)
      if (o.pause) inst._pause(true)
      if (o.foot) for (let i = 0; i < 6; i++) inst.play('foot:marble', { gain: 1, delay: i * 0.25 })
      const r = await oc.startRendering()
      const ch = [r.getChannelData(0), r.getChannelData(1)]
      const win = (a, b) => stat(ch.map(d => d.subarray(Math.round(a * SR), Math.round(b * SR))))
      return { all: stat(ch), head: win(0.2, 1.0), tail: win(dur - 1.2, dur - 0.1) }
    }
    out.live = {
      lobbyAct1: await live('lobby', 1),
      bathAct3: await live('bathroom', 3),
      roofAct3: await live('rooftop', 3),
      silenced: await live('bathroom', 3, { silence: true }),
      loud: await live('lobby', 3, { foot: true, tone: 1 }),
      radioOn: await live('lobby', 1, { radio: true }),
      radioSilent: await live('lobby', 1, { radio: true, silence: true }),
      paused: await live('lobby', 1, { pause: true }),
      base6: await live('lobby', 1, { dur: 6 }),
      droneIntro: await live('lobby', 1, { music: 'intro', dur: 6 }),
      droneBroken: await live('lobby', 1, { music: 'intro', breaking: true, dur: 6 })
    }
    return out
  }, emitted)

  const rows = [
    ...res.foot.map(r => ({ group: 'foot', ...r })),
    ...res.sfx.map(r => ({ group: 'sfx', ...r })),
    ...res.bed.map(r => ({ group: 'bed', ...r })),
    ...res.ir.map(r => ({ group: 'ir', ...r })),
    { group: 'water', id: 'pipe-source', ...res.water },
    { group: 'water', id: 'radio-source', ...res.radio }
  ]

  // IR은 에너지 정규화된 응답이라 피크가 원래 낮다. 원샷·룸톤과 같은 기준으로 재면 안 된다.
  const MINPEAK = { ir: 0.002, bed: 0.02, foot: 0.2, sfx: 0.2, water: 0.2 }
  const bad = []
  for (const r of rows) {
    if (r.bad > 0) bad.push(`${r.group}/${r.id}: ${r.bad} non-finite samples`)
    if (!(r.peak > MINPEAK[r.group])) bad.push(`${r.group}/${r.id}: peak ${r.peak.toFixed(4)} — 사실상 무음`)
    if (r.peak > 1.0001) bad.push(`${r.group}/${r.id}: peak ${r.peak.toFixed(4)} > 1.0 — 클리핑`)
    if (!(r.rms > 1e-4)) bad.push(`${r.group}/${r.id}: rms ${r.rms.toExponential(2)} — 너무 조용`)
    if (Math.abs(r.dc) > 0.02) bad.push(`${r.group}/${r.id}: DC ${r.dc.toFixed(4)}`)
  }
  for (const r of res.foot) if (!(r.diff > 1e-4)) bad.push(`foot/${r.id}: 변주가 동일하다 (diff ${r.diff})`)
  for (const r of res.bed) if (r.seam > 40) bad.push(`bed/${r.id}: 루프 이음매 불연속 (${r.seam}x)`)

  const L = res.live
  console.log('\nlive graph (룸톤 제외, 물+험만):')
  for (const [k, v] of Object.entries(L)) console.log(`  ${String(k).padEnd(11)} peak ${v.all.peak.toFixed(4)}  rms ${v.all.rms.toFixed(5)}  head ${v.head.rms.toFixed(5)}`)
  for (const [k, v] of Object.entries(L)) {
    if (v.all.bad > 0) bad.push(`live/${k}: ${v.all.bad} non-finite samples`)
    if (v.all.peak > 1.0001) bad.push(`live/${k}: peak ${v.all.peak.toFixed(4)} — 리미터가 클리핑을 못 막았다`)
  }
  // 물은 층이 올라갈수록·막이 진행될수록 커져야 한다(3막 최대).
  // 게인 차 15배가 RMS 2배로 줄어드는 건 글루 컴프가 의도대로 먹은 결과다. 1.6배를 하한으로 둔다 —
  // LFO를 게인 파라미터에 직접 물려 방·막 레벨이 덮이면 이 비가 1.2배 근처로 무너진다.
  const wr = (x) => +(x.all.rms / L.lobbyAct1.all.rms).toFixed(2)
  console.log(`  물 레벨 비: bath/3 ${wr(L.bathAct3)}x · roof/3 ${wr(L.roofAct3)}x (기준 lobby/1)`)
  if (!(L.bathAct3.all.rms > L.lobbyAct1.all.rms * 1.6)) bad.push(`live: 물 레벨이 공간·막에 반응하지 않는다 (${wr(L.bathAct3)}x)`)
  if (!(L.roofAct3.all.rms > L.lobbyAct1.all.rms * 1.6)) bad.push(`live: 옥상 3막 물 레벨 미달 (${wr(L.roofAct3)}x)`)
  // 침묵은 완전해야 한다 — 이 게임에서 가장 강한 도구다
  if (!(L.silenced.head.rms < L.bathAct3.head.rms * 0.02)) bad.push(`live/silence: 침묵이 완전하지 않다 (${L.silenced.head.rms.toExponential(2)} vs ${L.bathAct3.head.rms.toExponential(2)})`)
  if (!(L.silenced.tail.rms > L.silenced.head.rms * 10)) bad.push('live/silence: 침묵 후 복귀가 안 된다')
  if (!(L.loud.all.rms > 0.01)) bad.push(`live/loud: 발소리+룸톤이 마스터에 도달하지 않는다 (${L.loud.all.rms.toFixed(5)})`)
  // 라디오는 디제틱 루프다 — 들려야 하고, 마스터 체인(=침묵 연출) 안에 있어야 한다
  const radioRatio = +(L.radioOn.all.rms / L.lobbyAct1.all.rms).toFixed(2)
  console.log(`  라디오 기여: ${radioRatio}x (기준 lobby/1 무라디오) · 일시정지 ${+(L.paused.all.rms / L.lobbyAct1.all.rms).toFixed(2)}x`)
  if (!(L.radioOn.all.rms > L.lobbyAct1.all.rms * 1.25)) bad.push(`live/radio: 로비 라디오가 안 들린다 (${radioRatio}x)`)
  if (!(L.radioSilent.head.rms < L.radioOn.head.rms * 0.05)) bad.push('live/radio: 라디오가 침묵 연출 밖에 있다')
  if (!(L.paused.all.rms < L.lobbyAct1.all.rms * 0.6)) bad.push('live/pause: 일시정지 디제틱 감쇠가 안 먹는다')
  // 1막 드론 — 비디제틱 BGM 이 아니라 물의 리트모티프의 음정 진술(music.js). 붕괴 중엔 0 이어야 한다.
  const droneRatio = +(L.droneIntro.tail.rms / L.base6.tail.rms).toFixed(2)
  console.log(`  인트로 드론: ${droneRatio}x · 붕괴 중 ${+(L.droneBroken.tail.rms / L.base6.tail.rms).toFixed(2)}x (기준 무드론)`)
  if (!(L.droneIntro.tail.rms > L.base6.tail.rms * 1.3)) bad.push(`live/music: 인트로 드론이 들리지 않는다 (${droneRatio}x)`)
  if (!(L.droneBroken.tail.rms < L.droneIntro.tail.rms * 0.85)) bad.push('live/music: 붕괴(breaking) 중 음악 버스가 0 이 아니다')

  // ── 발화 id 해소 ────────────────────────────────────────────────────
  const unresolved = res.resolve.filter(r => r.ok === 2)
  console.log(`\nsfx id 해소 (${res.resolve.length}건, 루프 ${LOOP_IDS.size}건 제외):`)
  for (const r of res.resolve) console.log(`  ${r.ok === 0 ? '·' : r.ok === 1 ? '○' : '✗'} ${String(r.id).padEnd(22)}→ ${r.key}`)
  for (const r of unresolved) bad.push(`sfx/${r.id}: SFX 미등록 — ui.tick 으로 흡수된다(dsp.js SFX 또는 SFX_ALIAS 에 등재)`)
  if (scan.dynamic.length !== DYNAMIC_REGISTERED) {
    bad.push(`sfx: 동적 id 발화가 ${scan.dynamic.length}건 — 등재 ${DYNAMIC_REGISTERED}건과 다르다. DYNAMIC_EXPANSION 갱신 필요 (${scan.dynamic.join(' · ')})`)
  }

  const rt = Object.fromEntries(res.ir.map(r => [r.id, r.rt60]))
  // E7 §3 사양. 욕실은 사양이 없다 — 타일·도기라 카펫 복도보다 길게 우는 것이 물리적으로 옳고,
  // 그래서 서열은 lobby > bath > corridor 다(구판은 corridor > bath 로 잡혀 있었다).
  const SPEC = { lobby: 1.6, corridor: 0.9, room: 0.5, elevator: 0.3 }
  const order = ['lobby', 'bath', 'corridor', 'room', 'elevator', 'roof']
  for (let i = 1; i < order.length; i++) {
    if (!(rt[order[i - 1]] > rt[order[i]])) bad.push(`ir: RT60 서열 위반 ${order[i - 1]}(${rt[order[i - 1]]}) <= ${order[i]}(${rt[order[i]]})`)
  }
  for (const [room, want] of Object.entries(SPEC)) {
    const tol = Math.max(0.12, want * 0.18)
    if (Math.abs(rt[room] - want) > tol) bad.push(`ir/${room}: RT60 ${rt[room]}s — E7 §3 사양 ${want}s ±${tol.toFixed(2)} 이탈`)
  }
  if (!(rt.roof < 0.35)) bad.push(`ir/roof: RT60 ${rt.roof}s — 옥상은 잔향이 없어야 한다`)

  const pad = (s, n) => String(s).padEnd(n)
  console.log(`\n${pad('group', 7)}${pad('id', 16)}${pad('peak', 9)}${pad('rms', 10)}${pad('dc', 10)}extra`)
  for (const r of rows) {
    const extra = r.rt60 !== undefined ? `rt60 ${r.rt60}s` : r.seam !== undefined ? `seam ${r.seam}x  ${r.dur}s` : r.diff !== undefined ? `diff ${r.diff}  ${r.dur}s` : ''
    console.log(`${pad(r.group, 7)}${pad(r.id, 16)}${pad(r.peak.toFixed(4), 9)}${pad(r.rms.toFixed(5), 10)}${pad(r.dc.toFixed(5), 10)}${extra}`)
  }
  // 다른 소유자의 모듈이 내는 경고까지 이 테스트가 책임지지 않는다. 오디오 관련만 실패로 센다.
  const mine = logs.filter(l => /audio|AudioContext|OfflineAudio|dsp\.js|ir\.js/i.test(l))
  const other = logs.filter(l => !mine.includes(l))
  if (mine.length) { console.log(`\naudio console (${mine.length}):`); mine.forEach(l => console.log('  ✗ ' + l)); fail += mine.length }
  if (other.length) { console.log(`\nunrelated console (${other.length}) — 다른 모듈 소유:`); other.slice(0, 8).forEach(l => console.log('  · ' + l)) }
  if (bad.length) { console.log(`\nFAIL (${bad.length}):`); bad.forEach(b => console.log('  ✗ ' + b)); fail += bad.length } else console.log('\n✓ all audio checks passed')

  // ── 볼 수 있는 증거 ─────────────────────────────────────────────────
  // 소리는 헤드리스로 판정할 수 없다. 파형·감쇠곡선·스펙트로그램을 떠서 눈으로 보는 것이
  // 청감을 대신하지는 못하지만, "무엇을 들어야 하는가"를 사람에게 넘기기 전의 최소 근거다.
  if (PNG_DIR) {
    mkdirSync(PNG_DIR, { recursive: true })
    const sheets = await page.evaluate(async () => {
      const SR = 48000
      const dsp = await import('/src/audio/dsp.js')
      const ir = await import('/src/audio/ir.js')
      const INK = '#12100c', PAPER = '#e8e2d2', LINE = '#8a2f22', GRID = '#bcb3a0'
      const sheet = (w, h) => {
        const cv = document.createElement('canvas')
        cv.width = w; cv.height = h
        const g = cv.getContext('2d')
        g.fillStyle = PAPER; g.fillRect(0, 0, w, h)
        g.font = '13px ui-monospace, monospace'
        return { cv, g }
      }
      const wave = (g, d, x, y, w, h, label) => {
        g.strokeStyle = GRID; g.lineWidth = 1
        g.strokeRect(x, y, w, h)
        g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke()
        g.strokeStyle = LINE; g.beginPath()
        const step = Math.max(1, Math.floor(d.length / w))
        for (let px = 0; px < w; px++) {
          let lo = 0, hi = 0
          for (let i = px * step; i < (px + 1) * step && i < d.length; i++) { if (d[i] < lo) lo = d[i]; if (d[i] > hi) hi = d[i] }
          g.moveTo(x + px, y + h / 2 - hi * h / 2)
          g.lineTo(x + px, y + h / 2 - lo * h / 2)
        }
        g.stroke()
        g.fillStyle = INK; g.fillText(label, x + 5, y + 15)
      }
      // 로그 스펙트럼 — DFT 를 옥타브 밴드로 접어 32칸 막대로 만든다(FFT 없이 충분한 해상도)
      const spectrum = (g, d, x, y, w, h) => {
        const N = 4096
        const bands = new Float64Array(32)
        for (let b = 0; b < 32; b++) {
          const f = 25 * Math.pow(2, b * 0.32)
          if (f > SR * 0.45) break
          let re = 0, im = 0
          for (let i = 0; i < Math.min(N, d.length); i++) {
            const a = 2 * Math.PI * f * i / SR
            re += d[i] * Math.cos(a); im += d[i] * Math.sin(a)
          }
          bands[b] = Math.sqrt(re * re + im * im) / Math.min(N, d.length)
        }
        let max = 1e-9
        for (const v of bands) if (v > max) max = v
        g.strokeStyle = GRID; g.strokeRect(x, y, w, h)
        g.fillStyle = LINE
        for (let b = 0; b < 32; b++) {
          const db = 20 * Math.log10(Math.max(bands[b], 1e-6) / max)
          const bh = Math.max(0, (1 + db / 60)) * (h - 4)
          g.fillRect(x + 2 + b * (w - 4) / 32, y + h - 2 - bh, (w - 4) / 32 - 1, bh)
        }
        g.fillStyle = INK
        g.fillText('25Hz', x + 3, y + h - 5)
        g.fillText('16kHz', x + w - 46, y + h - 5)
      }

      const out = {}

      // 1. 신설·수정 원샷 — 파형과 스펙트럼
      const ids = ['desk.bell', 'gate.slide', 'drawer.pull', 'radio.dial', 'note.scribble',
        'note.strikeout', 'photo.sleeve', 'cloth.rustle', 'ui.tick']
      {
        const cols = 3, cw = 460, ch = 190
        const { cv, g } = sheet(cols * cw + 20, Math.ceil(ids.length / cols) * ch + 44)
        g.fillStyle = INK; g.font = '15px ui-monospace, monospace'
        g.fillText('sfx — 파형(상) · 로그 스펙트럼(하)   ui.tick 은 대조군(구판은 전부 이 소리로 흡수됐다)', 12, 24)
        g.font = '13px ui-monospace, monospace'
        ids.forEach((id, i) => {
          const d = dsp.sfxBuffer(id, 0, SR)
          const x = 10 + (i % cols) * cw, y = 36 + Math.floor(i / cols) * ch
          wave(g, d, x, y, cw - 14, 108, `${id}  ${(d.length / SR).toFixed(2)}s`)
          spectrum(g, d, x, y + 114, cw - 14, 62)
        })
        out.sfx = cv.toDataURL('image/png')
      }

      // 2. 방별 에너지 감쇠 곡선 — RT60 을 눈으로 본다
      {
        const rooms = ['lobby', 'corridor', 'bath', 'room', 'elevator', 'roof']
        const SPEC = { lobby: 1.6, corridor: 0.9, room: 0.5, elevator: 0.3 }
        const cw = 460, ch = 190
        const { cv, g } = sheet(3 * cw + 20, 2 * ch + 44)
        g.fillStyle = INK; g.font = '15px ui-monospace, monospace'
        g.fillText('공간별 슈뢰더 에너지 감쇠 (세로 0~-60dB · 가로 0~2.5s · 점선 = E7 §3 사양 RT60)', 12, 24)
        g.font = '13px ui-monospace, monospace'
        rooms.forEach((r, i) => {
          const [L] = ir.renderIR(r, SR)
          const sch = new Float64Array(L.length)
          let e = 0
          for (let k = L.length - 1; k >= 0; k--) { e += L[k] * L[k]; sch[k] = e }
          const ref = sch[0]
          const x = 10 + (i % 3) * cw, y = 36 + Math.floor(i / 3) * ch, w = cw - 14, h = 140
          g.strokeStyle = GRID; g.strokeRect(x, y, w, h)
          for (let db = 10; db < 60; db += 10) {
            const yy = y + h * db / 60
            g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke()
          }
          if (SPEC[r]) {
            g.strokeStyle = '#3c6b4a'; g.setLineDash([5, 4])
            const xx = x + w * Math.min(SPEC[r] / 2.5, 1)
            g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke()
            g.setLineDash([])
          }
          g.strokeStyle = LINE; g.beginPath()
          for (let px = 0; px < w; px++) {
            const t = px / w * 2.5
            const idx = Math.min(L.length - 1, Math.round(t * SR))
            const db = 10 * Math.log10(Math.max(sch[idx], 1e-12) / ref)
            g.lineTo(x + px, y + Math.min(h, h * -db / 60))
          }
          g.stroke()
          g.fillStyle = INK
          g.fillText(`${r}${SPEC[r] ? `  사양 ${SPEC[r]}s` : '  (사양 없음)'}`, x + 6, y + 16)
        })
        out.rooms = cv.toDataURL('image/png')
      }

      // 3. 라디오 루프 — 7초 파형과 스펙트로그램. 음절 덩어리가 보이면 방송으로 들린다.
      {
        const rad = ir.renderRadioSource(SR).ch[0]
        const w = 1380, h = 300
        const { cv, g } = sheet(w + 20, h + 60)
        g.fillStyle = INK; g.font = '15px ui-monospace, monospace'
        g.fillText('로비 라디오 디제틱 루프 7초 — 파형(상) · 스펙트로그램(하, 0~5kHz). 덩어리 = 음절, 어절 사이 침묵', 12, 24)
        g.font = '13px ui-monospace, monospace'
        wave(g, rad, 10, 36, w, 110, '')
        const gy = 156, gh = 160
        const cols2 = w, rows = 60
        const img = g.createImageData(cols2, rows)
        for (let px = 0; px < cols2; px++) {
          const start = Math.floor(px / cols2 * (rad.length - 1024))
          for (let b = 0; b < rows; b++) {
            const f = 60 * Math.pow(5000 / 60, b / rows)
            let re = 0, im = 0
            for (let i = 0; i < 1024; i++) {
              const a = 2 * Math.PI * f * i / SR
              re += rad[start + i] * Math.cos(a); im += rad[start + i] * Math.sin(a)
            }
            const mag = Math.sqrt(re * re + im * im) / 1024
            const v = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(mag, 1e-6)) + 62) / 52))
            const o = ((rows - 1 - b) * cols2 + px) * 4
            img.data[o] = 232 - v * 200; img.data[o + 1] = 226 - v * 205; img.data[o + 2] = 210 - v * 190; img.data[o + 3] = 255
          }
        }
        const tmp = document.createElement('canvas')
        tmp.width = cols2; tmp.height = rows
        tmp.getContext('2d').putImageData(img, 0, 0)
        g.imageSmoothingEnabled = false
        g.drawImage(tmp, 10, gy, w, gh)
        g.strokeStyle = GRID; g.strokeRect(10, gy, w, gh)
        out.radio = cv.toDataURL('image/png')
      }
      return out
    })
    for (const [name, url] of Object.entries(sheets)) {
      const file = join(PNG_DIR, `audio-${name}.png`)
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'))
      console.log(`  PNG ${file}`)
    }
  }

  await browser.close()
} finally {
  try { server.kill('SIGKILL') } catch {}
}
process.exit(fail ? 1 : 0)

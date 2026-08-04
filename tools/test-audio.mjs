// [AUDIO] 절차 합성 자체검증. OfflineAudioContext로 실제 렌더한 표본만 근거로 판정한다.
//   node tools/test-audio.mjs
// 검사: NaN/Inf 부재, 피크·RMS 합리 범위, 방별 RT60 서열, 룸톤 루프 이음매 연속성.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

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

  const res = await page.evaluate(async () => {
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

    // ── 살아있는 그래프 ──────────────────────────────────────────────
    // 버퍼만 재면 노드 배선 오류가 안 잡힌다. 모듈을 실제 OfflineAudioContext에 물려 렌더한다.
    const mod = (await import('/src/audio/engine.js')).default
    const { EventBus } = await import('/src/core/bus.js')
    const cam = { matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.7, 0, 1] } }
    const live = async (room, act, o = {}) => {
      const dur = o.dur ?? 4
      const oc = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(dur * SR), sampleRate: SR })
      const inst = Object.create(mod)
      await inst.init({ qa: false, bus: new EventBus(), state: { act, room }, camera: cam, time: 0 })
      inst._open(oc)
      inst.toneBus.gain.value = o.tone ?? 0   // 룸톤을 끄면 물·험 레벨만 남는다
      inst._levels(0.01)
      if (o.silence) inst.silence(1.2)
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
      loud: await live('lobby', 3, { foot: true, tone: 1 })
    }
    return out
  })

  const rows = [
    ...res.foot.map(r => ({ group: 'foot', ...r })),
    ...res.sfx.map(r => ({ group: 'sfx', ...r })),
    ...res.bed.map(r => ({ group: 'bed', ...r })),
    ...res.ir.map(r => ({ group: 'ir', ...r })),
    { group: 'water', id: 'pipe-source', ...res.water }
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

  const rt = Object.fromEntries(res.ir.map(r => [r.id, r.rt60]))
  const order = ['lobby', 'corridor', 'bath', 'room', 'elevator', 'roof']
  for (let i = 1; i < order.length; i++) {
    if (!(rt[order[i - 1]] > rt[order[i]])) bad.push(`ir: RT60 서열 위반 ${order[i - 1]}(${rt[order[i - 1]]}) <= ${order[i]}(${rt[order[i]]})`)
  }
  if (!(rt.lobby > 1.6 && rt.lobby < 3.2)) bad.push(`ir/lobby: RT60 ${rt.lobby}s — 목표 2.4s 이탈`)
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
  await browser.close()
} finally {
  try { server.kill('SIGKILL') } catch {}
}
process.exit(fail ? 1 : 0)

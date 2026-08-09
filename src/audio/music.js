// [AUDIO] 음악층. audio/engine.js 소유의 분권 파일이다(graph.js·ir.js·dsp.js 와 같은 위치).
//
// 이 게임의 계약은 "비디제틱 BGM 0, 예외는 엔딩뿐"이다(E7 §3). 그래서 여기서 만드는 것은 곡이
// 아니라 **물의 리트모티프를 음정화한 저역**이다. 배관·보일러는 실제로 41Hz 근처에서 공진하고,
// 같은 음이 3막에서 콘트라베이스로 되돌아온다 — 1막의 드론은 그 음의 첫 진술이지 반주가 아니다.
//
// 타이틀에는 음악을 넣을 수 없다. 브라우저 자동재생 정책상 첫 제스처 전에는 어떤 소리도 낼 수
// 없고(제스처 전 AudioContext 생성 = 콘솔 경고 = 루브릭 실격), 이 게임의 첫 제스처가 곧 벨을
// 누르는 진행 입력이다. 그래서 타이틀의 자리는 음악이 아니라 **벨 자신**이고, 그 벨이 인트로의
// 드론을 연다(cues.js).

import { rng } from '../core/util.js'

const E1 = 41.2      // 물의 리트모티프 기음. 2·3막이 같은 음으로 되돌아온다
const D1 = 36.71     // 엔딩 — 온음 하강. 고조가 아니라 물이 빠지는 소리다(E2 V4)

// sub = 정현파 드론(악기로 들리면 안 된다) · bass = 콘트라베이스 한 음(3막·엔딩 전용)
const CUES = {
  // 인트로 30초. 수압 파열음(0~4초) 아래로 4초에 걸쳐 올라와, 크로스헤어가 뜨기 전에 빠진다.
  intro: { kind: 'sub', root: E1, peak: 0.085, at: 4.2, hold: 16, rel: 5.5 },
  // 도일이 렌치를 들고 로비를 지나간다(7:00, E2 V1 "이 게임은 무르지 않는다"). 같은 음이 짧게 되돌아온다.
  phase: { kind: 'sub', root: E1, peak: 0.10, at: 2.6, hold: 4.5, rel: 4.0 },
  act3: { kind: 'bass', root: E1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 },
  ending: { kind: 'bass', root: D1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 }
}

export function musicCue (a, kind) {
  const spec = CUES[kind]
  const c = a.ctx
  if (!spec || a.silent || a.musicOn) return false
  // `cinematic:start`(cin-intro)는 첫 제스처와 **같은 프레임**에 온다. 그 제스처가 AudioContext를
  // 만드는 제스처이기도 해서, 리스너 등록 순서가 뒤집히면 인트로 드론이 통째로 버려졌다
  // (판정 대상 배포본에서 musicOn 0/339 실측). 벨의 playOrDefer와 같은 계약으로 접전을 없앤다 —
  // 제스처 전에 ctx를 만드는 것은 여전히 금지(콘솔 자동재생 경고 = 실격)이므로 지연이 유일한 답이다.
  if (!c) { if (!a.pendingMusic) a.pendingMusic = kind; return true }
  a.musicOn = true
  const now = c.currentTime
  const total = spec.at + spec.hold + spec.rel
  const nodes = []
  const done = () => {
    for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } }
    a.musicOn = false
  }
  const env = (g, peak) => {
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(peak, now + spec.at)
    g.gain.setValueAtTime(peak, now + spec.at + spec.hold)
    g.gain.exponentialRampToValueAtTime(0.0001, now + total)
  }

  if (spec.kind === 'sub') {
    // 기음 + 완전5도. 배음이 둘뿐이라 음정은 서되 선율로 뭉치지 않는다.
    ;[[spec.root, 1], [spec.root * 1.5, 0.28], [spec.root * 2, 0.16]].forEach(([f, rel], i) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = c.createGain()
      g.gain.value = 0.0001
      o.connect(g)
      g.connect(a.musicBus)
      env(g, spec.peak * rel)
      // 완전히 고정된 사인은 합성으로 들린다. 아주 얕게 흔든다(맥놀이 0.07~0.11Hz).
      const lfo = c.createOscillator()
      lfo.frequency.value = 0.07 + i * 0.021
      const lg = c.createGain()
      lg.gain.value = f * 0.0016
      lfo.connect(lg)
      lg.connect(o.frequency)
      o.start(now)
      lfo.start(now)
      o.stop(now + total + 0.3)
      lfo.stop(now + total + 0.3)
      nodes.push(o, g, lfo, lg)
      if (i === 0) o.onended = done
    })
    return true
  }

  // 콘트라베이스 한 음과 현의 하모닉스.
  const bass = c.createOscillator()
  bass.type = 'sawtooth'
  bass.frequency.value = spec.root
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 210
  lp.Q.value = 0.8
  const body = c.createBiquadFilter()
  body.type = 'peaking'
  body.frequency.value = spec.root * 3
  body.Q.value = 3
  body.gain.value = 7
  const bg = c.createGain()
  bg.gain.value = 0.0001
  bass.connect(lp); lp.connect(body); body.connect(bg); bg.connect(a.musicBus)
  env(bg, spec.peak)
  bass.start(now)
  bass.stop(now + total + 0.4)
  nodes.push(bass, lp, body, bg)
  ;[[spec.root * 8, 0.03, 2.6], [spec.root * 12, 0.018, 5.2]].forEach(([f, g, at]) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const og = c.createGain()
    og.gain.value = 0.0001
    o.connect(og)
    og.connect(a.musicBus)
    og.gain.setValueAtTime(0.0001, now)
    og.gain.exponentialRampToValueAtTime(g, now + at + 2)
    og.gain.exponentialRampToValueAtTime(0.0001, now + total - 0.4)
    o.start(now + at)
    o.stop(now + total)
    nodes.push(o, og)
  })
  bass.onended = done
  return true
}

export const MUSIC_CUES = CUES

// ── 심문 긴장층 ───────────────────────────────────────────────────────────
// 발주 근거: 심문이 게임에서 **가장 조용한 구간**이었다(lines 평균 -42.7dB vs 배회 -34.5dB 실측).
// 감쇠 0.42가 환경을 낮추는데 그 자리를 채우는 소리가 없어서, 긴장이 올라야 할 순간에 소리가
// 내려갔다. 여기서 채우는 것은 곡이 아니다 — 인트로 드론과 **같은 목소리(E1 41.2Hz의 부분음)**를
// 심문의 시간축으로 늘린 지속층이고, 위에 얹히는 것도 선율이 아니라 한 번의 압력 상승이다.
//
// **진위를 소리로 새지 않는다.** `interrogation:statement`는 `truth`를, `perf:state`는 그 파생인
// 연기 상태를 실어 나르지만 긴장층은 둘 다 구독하지 않는다. 음악이 정답을 알려주면 심문이
// 무너진다(E5 진위 비노출). 구동은 전부 **플레이어의 행동과 구조적 비트**다 —
// 진입 · 선택 요구 · 증거 겨눔 · 판정 결과 · 종료.
const TENSION = {
  enter: 0.68,   // 진입 — 방이 닫히고 바닥이 생긴다
  prompt: 0.80,  // 선택을 요구받은 자리(진실/거짓 대칭 — 진위 무관)
  aim: 1.0,      // 증거를 겨누는 동안. 되돌릴 수 없는 순간의 압력(E7 §1 LIE 행)
  ease: 0.42,    // 판정 직후 해소
  dip: 0.14      // 소각 — 방이 물러날 때 같이 물러난다(E7 §3 침묵의 사용)
}
const T_PEAK = 0.052   // 기음 진폭 @ level 1.0. 인트로 드론(0.085)보다 낮다 — 바닥이지 진술이 아니다
// [배수, 상대 진폭, 맥놀이 Hz]. 인트로 드론의 배열(기음·5도·옥타브)에 12도를 더했다 —
// 41Hz는 노트북 스피커에서 재생되지 않는다(judge-plan §5-2). 123.6Hz가 그 대역의 대리인이다.
const T_PARTIALS = [[1, 1, 0.061], [1.5, 0.39, 0.083], [2, 0.5, 0.047], [3, 0.17, 0.104]]

// 압력층용 노이즈. 6초 루프, 끝 120ms를 앞머리와 교차 페이드해 이음매를 지운다.
function pressureNoise (c, seed) {
  const n = Math.round(c.sampleRate * 6)
  const d = new Float32Array(n)
  const r = rng(seed)
  let lp = 0
  for (let i = 0; i < n; i++) {
    lp += 0.19 * ((r() * 2 - 1) - lp)
    d[i] = lp * 3.4
  }
  const x = Math.round(c.sampleRate * 0.12)
  for (let i = 0; i < x; i++) {
    const k = i / x
    d[n - x + i] = d[n - x + i] * (1 - k) + d[i] * k
  }
  const b = c.createBuffer(1, n - x, c.sampleRate)
  b.copyToChannel(d.subarray(0, n - x), 0)
  return b
}

export function tensionStart (a) {
  const c = a.ctx
  if (!c || a.silent || a.tension || !a.tensionBus) return false
  const now = c.currentTime
  const nodes = []

  const out = c.createGain()        // 상태 게인 — set()이 여기만 움직인다
  out.gain.value = 0.0001
  out.connect(a.tensionBus)
  // 요동은 전용 전단에 건다. LFO를 out.gain에 직접 물리면 상태 램프와 합산돼 값이 뒤집힌다
  // (graph.js 험이 같은 함정을 밟았다).
  const mix = c.createGain()
  mix.gain.value = 1
  mix.connect(out)
  nodes.push(out, mix)

  let root = null
  for (const [mul, rel, beat] of T_PARTIALS) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = E1 * mul
    if (!root) root = o
    const g = c.createGain()
    g.gain.value = T_PEAK * rel
    o.connect(g); g.connect(mix)
    const lfo = c.createOscillator()   // 맥놀이 — 고정 사인은 합성으로 들린다
    lfo.frequency.value = beat
    const lg = c.createGain()
    lg.gain.value = E1 * mul * 0.0018
    lfo.connect(lg); lg.connect(o.frequency)
    o.start(now); lfo.start(now)
    nodes.push(o, g, lfo, lg)
  }

  // 배관이 잠긴 방의 공기. 저역 덩어리 하나와 그 위 얇은 숨 하나 — 톤이 아니라 질감이다.
  for (const [f, q, g0, seed] of [[132, 1.3, 0.016, 90210], [640, 0.9, 0.0042, 90211]]) {
    const s = c.createBufferSource()
    s.buffer = pressureNoise(c, seed)
    s.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = q
    const g = c.createGain()
    g.gain.value = g0
    s.connect(bp); bp.connect(g); g.connect(mix)
    s.start(now)
    nodes.push(s, bp, g)
  }

  // 0.27Hz — 심박이 아니라 건물이 숨쉬는 속도다. 심박으로 들리면 장르 상투가 된다.
  const trem = c.createOscillator()
  trem.frequency.value = 0.27
  const tg = c.createGain()
  tg.gain.value = 0.17
  trem.connect(tg); tg.connect(mix.gain)
  trem.start(now)
  nodes.push(trem, tg)

  const t = {
    level: 0,
    set (key, dur = 1.6) {
      const to = TENSION[key] ?? key
      if (!(to >= 0)) return
      t.level = to
      const n = c.currentTime
      const p = out.gain
      p.cancelScheduledValues(n)
      p.setValueAtTime(Math.max(p.value, 0.0001), n)
      p.exponentialRampToValueAtTime(Math.max(to, 0.0001), n + Math.max(dur, 0.05))
    },
    // 판정 직후 한 번 풀었다가 바닥으로 되돌린다. 심문은 아직 끝나지 않았다.
    release (ok) {
      t.set(ok ? 'ease' : 'dip', ok ? 1.1 : 0.35)
      const n = c.currentTime
      const p = out.gain
      p.setValueAtTime(Math.max(ok ? TENSION.ease : TENSION.dip, 0.0001), n + (ok ? 1.1 : 3.0))
      p.exponentialRampToValueAtTime(TENSION.enter, n + (ok ? 4.2 : 6.0))
      t.level = TENSION.enter
    },
    stop (dur = 3.2) {
      const n = c.currentTime
      const p = out.gain
      p.cancelScheduledValues(n)
      p.setValueAtTime(Math.max(p.value, 0.0001), n)
      p.exponentialRampToValueAtTime(0.0001, n + dur)
      for (const node of nodes) {
        try { node.stop?.(n + dur + 0.2) } catch (e) { /* 이미 정지 */ }
      }
      // 노드 해제는 소리가 멎은 뒤 한 번만. 기음 오실레이터를 대표로 삼는다.
      root.onended = () => { for (const node of nodes) { try { node.disconnect() } catch (e) { /* 이미 해제 */ } } }
      a.tension = null
    }
  }
  a.tension = t
  t.set('enter', 3.4)
  return true
}

// 증거를 겨누는 순간의 스팅어. 되돌릴 수 없다는 신호이지 정답 신호가 아니다 —
// 진실 진술에 겨눠도 똑같이 울린다. 활로 켠 저현 한 번: 낮은 톱니가 필터를 열며 올라온다.
export function tensionStinger (a) {
  const c = a.ctx
  if (!c || a.silent || !a.tensionBus) return false
  const now = c.currentTime
  const dur = 3.6
  const nodes = []
  const bow = c.createOscillator()
  bow.type = 'sawtooth'
  bow.frequency.value = E1 * 2
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(96, now)
  lp.frequency.linearRampToValueAtTime(430, now + 1.15)
  lp.frequency.linearRampToValueAtTime(150, now + dur)
  lp.Q.value = 3.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.05, now + 0.85)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  bow.connect(lp); lp.connect(g); g.connect(a.tensionBus)
  bow.start(now); bow.stop(now + dur + 0.1)
  nodes.push(bow, lp, g)
  // 5도 위 하모닉스가 뒤늦게 스며든다 — 화음이 아니라 같은 현의 배음이다.
  const h = c.createOscillator()
  h.type = 'sine'
  h.frequency.value = E1 * 6
  const hg = c.createGain()
  hg.gain.setValueAtTime(0.0001, now)
  hg.gain.exponentialRampToValueAtTime(0.011, now + 1.6)
  hg.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  h.connect(hg); hg.connect(a.tensionBus)
  h.start(now + 0.35); h.stop(now + dur + 0.1)
  nodes.push(h, hg)
  bow.onended = () => { for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } } }
  return true
}

export function tensionStop (a, dur) {
  a.tension?.stop(dur)
}

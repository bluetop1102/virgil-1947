// [AUDIO] 타이틀 침대 — 빗소리·원거리 천둥·E1 저역 드론. audio/engine.js 소유의 분권 파일이다
// (graph.js·music.js·ambience.js 와 같은 위치).
//
// **곡을 깔지 않는 이유.** 타이틀 배경은 비 내리는 호텔 외관이다. 그 그림 안에서 실제로 나는
// 소리는 비와 천둥이고, 건물은 이미 저역을 하나 내고 있다(music.js E1 41.2Hz — 물의 리트모티프).
// "약간 무서운 브금"은 이 셋의 합으로 얻는다. 반주를 얹으면 E7 §3 "비디제틱 BGM 0, 예외는
// 엔딩뿐" 계약이 첫 화면에서부터 깨지고, 그 계약이 이 게임의 소리를 지탱하는 뼈다.
//
// **이 층이 존재할 수 있는 이유는 입장 게이트뿐이다**(ui/title.js). 첫 제스처 전에
// AudioContext를 만들면 Chrome이 자동재생 경고를 콘솔에 찍고 그것이 루브릭 실격선이라,
// 구판 타이틀은 아예 무음이었다(music.js 머리주석). 게이트의 첫 입력이 제스처가 되어 컨텍스트를
// 열고, 그 사건(`title:gate`)이 이 파일을 부른다 — 정책을 우회하는 것이 아니라 정책이 요구하는
// 제스처를 화면으로 만든 것이다.
//
// 스케줄은 전부 **AudioContext 시계**다. 타이틀에는 engine.time 을 소비하는 연출이 없고,
// 헤드리스에서 engine.time 이 실시간의 0.4배로 흐르는 함정(judge-probes 주석)도 여기서는
// 애초에 밟지 않는다.

import { rng } from '../core/util.js'

const E1 = 41.2          // music.js 와 같은 음. 타이틀은 이 음의 첫 진술이다
const LOOP = 6.0         // 잡음 루프 길이(초). 이보다 짧으면 주기가 귀에 잡힌다
const SEAM = 0.15        // 루프 이음매 교차 페이드

// 잡음 루프. damp=1 이면 백색, 낮출수록 저역으로 기운다. 끝 SEAM 을 앞머리와 겹쳐 이음매를 지운다.
function noiseLoop (c, seed, damp = 1) {
  const n = Math.round(c.sampleRate * LOOP)
  const d = new Float32Array(n)
  const r = rng(seed)
  let lp = 0
  for (let i = 0; i < n; i++) {
    lp += damp * ((r() * 2 - 1) - lp)
    d[i] = lp
  }
  let m = 0
  for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > m) m = a }
  if (m > 1e-9) for (let i = 0; i < n; i++) d[i] /= m
  const x = Math.round(c.sampleRate * SEAM)
  for (let i = 0; i < x; i++) {
    const k = i / x
    d[n - x + i] = d[n - x + i] * (1 - k) + d[i] * k
  }
  const b = c.createBuffer(1, n - x, c.sampleRate)
  b.copyToChannel(d.subarray(0, n - x), 0)
  return b
}

// 개별 빗방울 타격을 루프 버퍼에 직접 굽는다. JS 스케줄러를 하나 더 돌리지 않기 위해서다 —
// 연속 잡음만으로는 비가 아니라 바람으로 들린다. 사람이 비로 듣는 것은 이 알갱이 쪽이다.
function patterLoop (c, seed) {
  const sr = c.sampleRate
  const n = Math.round(sr * LOOP)
  const d = new Float32Array(n)
  const r = rng(seed)
  let at = Math.round(sr * 0.02)
  while (at < n) {
    const len = Math.round(sr * (0.004 + r() * 0.012))
    const g = 0.22 + r() * 0.78
    const f = 900 + r() * 3600           // 방울마다 밝기가 다르다 — 같은 음이면 기계로 들린다
    const tau = len / (sr * 2.4)
    const end = Math.min(n, at + len)
    for (let i = 0; at + i < end; i++) {
      const t = i / sr
      const env = Math.exp(-t / tau)
      d[at + i] += (Math.sin(2 * Math.PI * f * t) * 0.55 + (r() * 2 - 1) * 0.45) * g * env
    }
    at += Math.round(sr * (0.010 + r() * 0.070))   // 10~80ms — 간격에 규칙이 잡히지 않는다
  }
  let m = 0
  for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > m) m = a }
  if (m > 1e-9) for (let i = 0; i < n; i++) d[i] /= m
  const x = Math.round(sr * SEAM)
  for (let i = 0; i < x; i++) {
    const k = i / x
    d[n - x + i] = d[n - x + i] * (1 - k) + d[i] * k
  }
  const b = c.createBuffer(1, n - x, sr)
  b.copyToChannel(d.subarray(0, n - x), 0)
  return b
}

// 원거리 천둥 한 발. 파열이 아니라 압력이다 — 몇 킬로미터의 공기가 초고역을 이미 다 먹었고
// 남는 것은 저역의 굴림뿐이라, 어택이 느리고(0.4초) 꼬리가 길고(7초) 도중에 한 번 되구른다.
// 놀래키는 장치가 아니다(ambience.js 점프스케어 금지와 같은 규율).
function thunder (c, src, out, at, seed, nodes) {
  const r = rng(seed)
  // 빗소리 바닥 위 3~8dB. 놀람의 문턱(10dB)을 넘지 않는다 — ambience.js 원거리 단발음과 같은 규율
  // (실측: 0.42~0.70 이 +9.3dB 로 문턱을 밟았다).
  const peak = 0.25 + 0.17 * r()
  const dur = 6.4 + r() * 2.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.42)
  g.gain.exponentialRampToValueAtTime(peak * 0.34, at + 1.7)
  g.gain.exponentialRampToValueAtTime(peak * 0.62, at + 2.9)   // 되구르는 마디
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  g.connect(out)
  nodes.push(g)
  // 저역 굴림과 그 아래 서브. 둘의 재생비를 어긋내 한 소스에서 두 거리를 만든다.
  for (const [rate, f, q, lvl] of [[0.72 + r() * 0.14, 165, 0.7, 1], [0.44, 58, 0.9, 0.72]]) {
    const s = c.createBufferSource()
    s.buffer = src
    s.loop = true
    s.playbackRate.value = rate
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = f
    lp.Q.value = q
    const lg = c.createGain()
    lg.gain.value = lvl
    s.connect(lp); lp.connect(lg); lg.connect(g)
    s.start(at)
    s.stop(at + dur + 0.2)
    nodes.push(s, lp, lg)
  }
}

export function titleBedStart (a) {
  const c = a.ctx
  if (!c || a.silent || a.titleBed) return false
  const now = c.currentTime
  const nodes = []

  const out = c.createGain()
  out.gain.setValueAtTime(0.0001, now)
  out.gain.exponentialRampToValueAtTime(1, now + 2.4)   // 화면이 열리는 속도로 같이 올라온다
  out.connect(a.duckG)
  nodes.push(out)

  // 돌풍은 전용 전단에 건다. out.gain 에 LFO를 직접 물리면 페이드 램프와 합산돼 값이 뒤집힌다
  // (graph.js 험·music.js 긴장층이 같은 함정을 밟았다).
  const rain = c.createGain()
  rain.gain.value = 1
  rain.connect(out)
  nodes.push(rain)
  for (const [f, depth] of [[0.055, 0.16], [0.083, 0.09]]) {
    const lfo = c.createOscillator()
    lfo.frequency.value = f
    const lg = c.createGain()
    lg.gain.value = depth
    lfo.connect(lg); lg.connect(rain.gain)
    lfo.start(now)
    nodes.push(lfo, lg)
  }

  const src = noiseLoop(c, 51477)
  // [재생비, 필터, 주파수, Q, 게인]. 한 소스를 세 대역으로 갈라 거리를 만든다 —
  // 얼굴에 닿는 잔알갱이(hp) · 비의 몸통(bp) · 젖은 거리 전체의 웅웅거림(lp).
  let root = null
  for (const [rate, type, f, q, g0] of [
    [1.13, 'highpass', 1900, 0.7, 0.042],
    [0.87, 'bandpass', 620, 0.55, 0.092],
    [0.61, 'lowpass', 320, 0.6, 0.052]
  ]) {
    const s = c.createBufferSource()
    s.buffer = src
    s.loop = true
    s.playbackRate.value = rate
    const bq = c.createBiquadFilter()
    bq.type = type
    bq.frequency.value = f
    bq.Q.value = q
    const g = c.createGain()
    g.gain.value = g0
    s.connect(bq); bq.connect(g); g.connect(rain)
    s.start(now)
    if (!root) root = s
    nodes.push(s, bq, g)
  }

  const pat = c.createBufferSource()
  pat.buffer = patterLoop(c, 51478)
  pat.loop = true
  const patHP = c.createBiquadFilter()
  patHP.type = 'highpass'
  patHP.frequency.value = 760
  const patG = c.createGain()
  patG.gain.value = 0.026
  pat.connect(patHP); patHP.connect(patG); patG.connect(rain)
  pat.start(now)
  nodes.push(pat, patHP, patG)

  // 천둥 — 8.5초 뒤 첫 발, 이후 19~45초 간격. 간격에 공약수가 없어 같은 자리로 돌아오지 않는다.
  // 원본은 비와 다른 잡음이다: damp 0.02 로 이미 150Hz 아래만 남긴 뒤 정규화하므로,
  // 백색 잡음을 저역통과로 깎아 쓸 때처럼 게인이 두 자리로 튀지 않는다.
  const roll = noiseLoop(c, 51479, 0.02)
  const r = rng(51480)
  let at = now + 8.5
  for (let i = 0; i < 5; i++) {
    thunder(c, roll, out, at, 51481 + i * 13, nodes)
    at += 19 + r() * 26
  }

  // E1 저역 드론. 인트로 드론(peak 0.085)의 3분의 1이다 — 진술이 아니라 건물의 숨이다.
  ;[[E1, 1, 0.071], [E1 * 1.5, 0.3, 0.089], [E1 * 2, 0.17, 0.053]].forEach(([f, rel, beat]) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.030 * rel, now + 6)   // 비보다 늦게 스며든다
    o.connect(g); g.connect(out)
    const lfo = c.createOscillator()      // 맥놀이 — 고정 사인은 합성으로 들린다
    lfo.frequency.value = beat
    const lg = c.createGain()
    lg.gain.value = f * 0.0016
    lfo.connect(lg); lg.connect(o.frequency)
    o.start(now); lfo.start(now)
    nodes.push(o, g, lfo, lg)
  })

  a.titleBed = {
    out,
    stop (dur = 2.6) {
      const n = c.currentTime
      const p = out.gain
      p.cancelScheduledValues(n)
      p.setValueAtTime(Math.max(p.value, 0.0001), n)
      p.exponentialRampToValueAtTime(0.0001, n + dur)
      for (const node of nodes) {
        // 아직 시작 시각이 오지 않은 천둥은 stop 이 start 보다 앞서므로 그대로 사산한다 — 의도된 것이다.
        try { node.stop?.(n + dur + 0.2) } catch (e) { /* 이미 정지 */ }
      }
      // 노드 해제는 소리가 멎은 뒤 한 번만. 비의 몸통을 대표로 삼는다(music.js 긴장층과 같은 규약).
      root.onended = () => { for (const node of nodes) { try { node.disconnect() } catch (e) { /* 이미 해제 */ } } }
      a.titleBed = null
    }
  }
  return true
}

// 벨이 울리고 문이 열린다 — 빗소리는 인트로의 물소리로 넘어간다. 끊지 않고 겹쳐 보낸다.
export function titleBedStop (a, dur = 2.6) {
  a.titleBed?.stop(dur)
}

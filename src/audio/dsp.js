// 절차 합성 DSP. 오디오 파일 로드는 전면 금지(루브릭 N7) — 모든 파형은 여기서 표본 단위로 만든다.
// 렌더 결과는 Float32Array(모노)다. AudioBuffer 포장은 audio/engine.js가 한다.

import { rng, clamp } from '../core/util.js'

const TAU = Math.PI * 2

// RBJ 쌍이차 필터. bp는 피크 게인 0dB 형(공진기로 그대로 쓴다).
export function biquad (type, f0, Q, sr) {
  const w0 = TAU * clamp(f0, 8, sr * 0.45) / sr
  const cw = Math.cos(w0), sw = Math.sin(w0)
  const al = sw / (2 * Math.max(Q, 0.05))
  let b0, b1, b2
  if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0 } else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al } else { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0 }
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al
  const n0 = b0 / a0, n1 = b1 / a0, n2 = b2 / a0, d1 = a1 / a0, d2 = a2 / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  return (x) => {
    const y = n0 * x + n1 * x1 + n2 * x2 - d1 * y1 - d2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}

// 계수를 매 샘플 바꿀 수 있는 1극 저역통과. 필터 스윕(젖은 발소리 등)에 쓴다.
export function sweepLP () {
  let y = 0
  return (x, a) => { y += a * (x - y); return y }
}

export const coefLP = (f, sr) => 1 - Math.exp(-TAU * clamp(f, 8, sr * 0.45) / sr)

export function normalize (buf, peak) {
  let m = 0
  for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > m) m = a }
  if (!(m > 1e-9)) return buf
  const g = peak / m
  for (let i = 0; i < buf.length; i++) buf[i] *= g
  return buf
}

// 버퍼 끝 3ms 페이드. 재생 종료 클릭 방지.
function tailFade (buf, sr) {
  const n = Math.min(buf.length, Math.round(sr * 0.003))
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n
}

// 레이어 스펙 → 파형. k:'n' 필터드 노이즈, k:'t' 톤(지수 글라이드 가능).
//   n: { ft:'lp'|'hp'|'bp', f, f2?(lp 스윕 목표), q, d(감쇠 τ), t(시작초), g, at?(어택초) }
//   t: { f, f2?, d, g, t?, sh?:'sin'|'tri' }
export function renderSpec (spec, seed, sr) {
  const n = Math.max(16, Math.round(spec.dur * sr))
  const out = new Float32Array(n)
  spec.layers.forEach((L, li) => {
    const r = rng(seed * 131 + li * 7919 + 17)
    const off = Math.round((L.t ?? 0) * sr)
    const tau = Math.max(L.d, 1e-4)
    const at = Math.max(L.at ?? 0.0008, 1e-5)
    const len = Math.min(n - off, Math.ceil(tau * 7 * sr) + 8)
    if (len <= 0) return
    const g = L.g ?? 1
    if (L.k === 't') {
      const glide = L.f2 ? Math.log(L.f2 / L.f) : 0
      let ph = 0
      for (let i = 0; i < len; i++) {
        const t = i / sr
        const f = L.f * Math.exp(glide * Math.min(t / tau, 1))
        ph += f / sr
        const s = L.sh === 'tri' ? 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1 : Math.sin(TAU * ph)
        out[off + i] += s * g * Math.exp(-t / tau) * (1 - Math.exp(-t / at))
      }
      return
    }
    const sweep = L.ft === 'lp' && L.f2
    const f = sweep ? sweepLP() : biquad(L.ft ?? 'bp', L.f, L.q ?? 1, sr)
    const glide = sweep ? Math.log(L.f2 / L.f) : 0
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const x = r() * 2 - 1
      const y = sweep ? f(x, coefLP(L.f * Math.exp(glide * Math.min(t / tau, 1)), sr)) : f(x)
      out[off + i] += y * g * Math.exp(-t / tau) * (1 - Math.exp(-t / at))
    }
  })
  normalize(out, spec.peak ?? 0.7)
  tailFade(out, sr)
  return out
}

// ── 발소리 ────────────────────────────────────────────────────────────
// 재질별 음색 대비가 이 시스템의 판정 지점이다(N7). 음량 대비를 죽이지 않도록 peak를 재질마다 다르게 둔다.
export const FOOT = {
  marble: {
    dur: 0.52, peak: 0.78, layers: [
      { k: 'n', ft: 'bp', f: 3400, q: 5, d: 0.006, g: 0.9 },
      { k: 'n', ft: 'bp', f: 1150, q: 2.2, d: 0.028, g: 0.55 },
      { k: 'n', ft: 'lp', f: 430, d: 0.045, g: 0.35 },
      { k: 'n', ft: 'hp', f: 2600, d: 0.2, g: 0.1 }
    ]
  },
  carpet: {
    dur: 0.3, peak: 0.44, layers: [
      { k: 't', f: 88, f2: 52, d: 0.055, g: 0.75, at: 0.002 },
      { k: 'n', ft: 'lp', f: 430, d: 0.035, g: 0.4 },
      { k: 'n', ft: 'lp', f: 1500, d: 0.008, g: 0.12 }
    ]
  },
  tile: {
    dur: 0.44, peak: 0.8, layers: [
      { k: 'n', ft: 'bp', f: 5400, q: 7, d: 0.0035, g: 1.0 },
      { k: 'n', ft: 'bp', f: 2700, q: 9, d: 0.05, g: 0.42 },
      { k: 'n', ft: 'bp', f: 1200, q: 3, d: 0.02, g: 0.35 },
      { k: 't', f: 140, d: 0.03, g: 0.3 },
      { k: 'n', ft: 'hp', f: 3000, d: 0.12, g: 0.08 }
    ]
  },
  wood: {
    dur: 0.42, peak: 0.62, layers: [
      { k: 'n', ft: 'bp', f: 186, q: 13, d: 0.13, g: 0.55 },
      { k: 'n', ft: 'bp', f: 332, q: 11, d: 0.09, g: 0.4 },
      { k: 'n', ft: 'bp', f: 548, q: 9, d: 0.055, g: 0.3 },
      { k: 'n', ft: 'bp', f: 2300, q: 3, d: 0.006, g: 0.5 }
    ]
  },
  wet: {
    dur: 0.42, peak: 0.6, layers: [
      { k: 'n', ft: 'lp', f: 4200, f2: 520, d: 0.03, g: 0.8 },
      { k: 't', f: 1050, f2: 1750, d: 0.02, g: 0.2, t: 0.028 },
      { k: 't', f: 820, f2: 1420, d: 0.016, g: 0.15, t: 0.062 },
      { k: 'n', ft: 'lp', f: 300, d: 0.05, g: 0.35 },
      { k: 'n', ft: 'hp', f: 2200, d: 0.09, g: 0.07 }
    ]
  },
  metal: {
    dur: 1.0, peak: 0.7, layers: [
      { k: 'n', ft: 'bp', f: 624, q: 26, d: 0.42, g: 0.5 },
      { k: 'n', ft: 'bp', f: 942, q: 22, d: 0.3, g: 0.36 },
      { k: 'n', ft: 'bp', f: 1460, q: 20, d: 0.22, g: 0.28 },
      { k: 'n', ft: 'bp', f: 1953, q: 18, d: 0.14, g: 0.2 },
      { k: 'n', ft: 'bp', f: 2977, q: 15, d: 0.08, g: 0.14 },
      { k: 'n', ft: 'bp', f: 4300, q: 4, d: 0.004, g: 0.6 }
    ]
  }
}

// 방 이름을 그대로 넘겨도 동작해야 한다 — GAMEPLAY가 재질을 아직 안 붙였을 때의 폴백 경로다.
const FOOT_ALIAS = {
  marble: 'marble', stone: 'marble', lobby: 'marble', elevator: 'marble', floor: 'marble',
  carpet: 'carpet', rug: 'carpet', corridor: 'carpet', cloth: 'carpet',
  tile: 'tile', hex: 'tile', bath: 'tile', bathroom: 'tile', ceramic: 'tile',
  wood: 'wood', parquet: 'wood', plank: 'wood', stair: 'wood', room: 'wood',
  wet: 'wet', water: 'wet', puddle: 'wet', concrete: 'wet', rooftop: 'wet', roof: 'wet',
  metal: 'metal', steel: 'metal', ladder: 'metal', catwalk: 'metal', grate: 'metal'
}

export function footKey (name) {
  const s = String(name ?? '').toLowerCase()
  if (FOOT_ALIAS[s]) return FOOT_ALIAS[s]
  for (const k in FOOT_ALIAS) if (s.includes(k)) return FOOT_ALIAS[k]
  return 'marble'
}

// ── 원샷 효과음 ───────────────────────────────────────────────────────
export const SFX = {
  'door.open': {
    dur: 1.2,
    layers: [
      { k: 'n', ft: 'bp', f: 380, q: 9, d: 0.05, g: 0.5, t: 0.02 },
      { k: 'n', ft: 'bp', f: 520, q: 12, d: 0.04, g: 0.42, t: 0.17 },
      { k: 'n', ft: 'bp', f: 445, q: 14, d: 0.05, g: 0.46, t: 0.33 },
      { k: 'n', ft: 'bp', f: 610, q: 11, d: 0.04, g: 0.36, t: 0.52 },
      { k: 'n', ft: 'bp', f: 350, q: 10, d: 0.06, g: 0.3, t: 0.71 },
      { k: 't', f: 92, d: 0.12, g: 0.35 }
    ]
  },
  'door.close': {
    dur: 0.8,
    layers: [
      { k: 'n', ft: 'bp', f: 2600, q: 5, d: 0.012, g: 0.5 },
      { k: 't', f: 72, f2: 54, d: 0.09, g: 0.9, at: 0.001 },
      { k: 'n', ft: 'lp', f: 300, d: 0.06, g: 0.5 },
      { k: 'n', ft: 'bp', f: 780, q: 8, d: 0.09, g: 0.2, t: 0.02 }
    ]
  },
  'key.jingle': {
    dur: 1.0,
    layers: [
      { k: 'n', ft: 'bp', f: 2140, q: 22, d: 0.11, g: 0.5 },
      { k: 'n', ft: 'bp', f: 3310, q: 20, d: 0.09, g: 0.4, t: 0.035 },
      { k: 'n', ft: 'bp', f: 4720, q: 18, d: 0.07, g: 0.34, t: 0.09 },
      { k: 'n', ft: 'bp', f: 2870, q: 21, d: 0.1, g: 0.36, t: 0.16 },
      { k: 'n', ft: 'bp', f: 5930, q: 16, d: 0.05, g: 0.24, t: 0.24 }
    ]
  },
  'paper.pickup': {
    dur: 0.55, peak: 0.5,
    layers: [
      { k: 'n', ft: 'hp', f: 2600, d: 0.02, g: 0.6 },
      { k: 'n', ft: 'hp', f: 3100, d: 0.015, g: 0.5, t: 0.06 },
      { k: 'n', ft: 'hp', f: 2200, d: 0.025, g: 0.45, t: 0.13 },
      { k: 'n', ft: 'bp', f: 900, q: 2, d: 0.03, g: 0.2, t: 0.02 }
    ]
  },
  'photo.flip': {
    dur: 0.4, peak: 0.5,
    layers: [
      { k: 'n', ft: 'lp', f: 5200, f2: 900, d: 0.05, g: 0.6 },
      { k: 'n', ft: 'bp', f: 1400, q: 3, d: 0.018, g: 0.3, t: 0.07 }
    ]
  },
  'notebook.open': {
    dur: 0.9, peak: 0.55,
    layers: [
      { k: 'n', ft: 'lp', f: 900, d: 0.09, g: 0.5 },
      { k: 'n', ft: 'hp', f: 2400, d: 0.03, g: 0.4, t: 0.05 },
      { k: 'n', ft: 'hp', f: 2900, d: 0.02, g: 0.3, t: 0.19 },
      { k: 't', f: 110, d: 0.08, g: 0.25 }
    ]
  },
  'notebook.close': {
    dur: 0.7, peak: 0.55,
    layers: [
      { k: 'n', ft: 'hp', f: 2100, d: 0.03, g: 0.45 },
      { k: 'n', ft: 'lp', f: 640, d: 0.07, g: 0.6, t: 0.04 },
      { k: 't', f: 96, d: 0.06, g: 0.3, t: 0.04 }
    ]
  },
  'elevator.ding': {
    dur: 2.6,
    layers: [
      { k: 'n', ft: 'bp', f: 4200, q: 4, d: 0.004, g: 0.4 },
      { k: 't', f: 1046, d: 0.85, g: 0.6, at: 0.002 },
      { k: 't', f: 1571, d: 0.5, g: 0.3, at: 0.002 },
      { k: 't', f: 2093, d: 0.28, g: 0.16, at: 0.002 },
      { k: 't', f: 3140, d: 0.12, g: 0.08, at: 0.002 }
    ]
  },
  'elevator.motor': {
    dur: 2.2, peak: 0.5,
    layers: [
      { k: 't', f: 46, d: 1.3, g: 0.8, at: 0.25 },
      { k: 'n', ft: 'lp', f: 180, d: 1.1, g: 0.6, at: 0.2 },
      { k: 'n', ft: 'bp', f: 620, q: 3, d: 0.9, g: 0.12, at: 0.3 },
      { k: 'n', ft: 'bp', f: 1750, q: 6, d: 0.5, g: 0.05, at: 0.35 }
    ]
  },
  'light.buzz': {
    dur: 0.7, peak: 0.4,
    layers: [
      { k: 't', f: 120, sh: 'tri', d: 0.35, g: 0.7, at: 0.01 },
      { k: 't', f: 240, sh: 'tri', d: 0.2, g: 0.2, at: 0.01 },
      { k: 'n', ft: 'bp', f: 3600, q: 2, d: 0.3, g: 0.08 }
    ]
  },
  'water.drip': {
    dur: 0.55, peak: 0.45,
    layers: [
      { k: 'n', ft: 'bp', f: 3000, q: 3, d: 0.005, g: 0.35 },
      { k: 't', f: 880, f2: 1960, d: 0.035, g: 0.8, at: 0.0006 },
      { k: 'n', ft: 'bp', f: 620, q: 6, d: 0.03, g: 0.15 }
    ]
  },
  'pipe.knock': {
    dur: 1.1,
    layers: [
      { k: 'n', ft: 'bp', f: 208, q: 20, d: 0.32, g: 0.6 },
      { k: 'n', ft: 'bp', f: 472, q: 16, d: 0.18, g: 0.4 },
      { k: 'n', ft: 'bp', f: 1490, q: 8, d: 0.04, g: 0.28 },
      { k: 'n', ft: 'lp', f: 3000, d: 0.003, g: 0.4 }
    ]
  },
  'radiator.tick': {
    dur: 0.3, peak: 0.42,
    layers: [
      { k: 'n', ft: 'bp', f: 1720, q: 14, d: 0.045, g: 0.6 },
      { k: 'n', ft: 'bp', f: 3640, q: 10, d: 0.015, g: 0.4 },
      { k: 'n', ft: 'bp', f: 640, q: 8, d: 0.02, g: 0.2 }
    ]
  },
  'wrench.clank': {
    dur: 1.4,
    layers: [
      { k: 'n', ft: 'bp', f: 718, q: 22, d: 0.45, g: 0.5 },
      { k: 'n', ft: 'bp', f: 1493, q: 18, d: 0.3, g: 0.35 },
      { k: 'n', ft: 'bp', f: 3070, q: 14, d: 0.12, g: 0.22 },
      { k: 'n', ft: 'bp', f: 5300, q: 9, d: 0.05, g: 0.12 },
      { k: 'n', ft: 'hp', f: 5000, d: 0.008, g: 0.4 }
    ]
  },
  'tank.hollow': {
    dur: 2.4,
    layers: [
      { k: 't', f: 58, d: 1.2, g: 0.9, at: 0.004 },
      { k: 'n', ft: 'bp', f: 92, q: 9, d: 1.4, g: 0.5 },
      { k: 'n', ft: 'bp', f: 214, q: 6, d: 0.6, g: 0.3 },
      { k: 'n', ft: 'bp', f: 1100, q: 4, d: 0.03, g: 0.2 }
    ]
  },
  'match.strike': {
    dur: 1.0, peak: 0.5,
    layers: [
      { k: 'n', ft: 'hp', f: 3200, d: 0.02, g: 0.7 },
      { k: 'n', ft: 'hp', f: 2800, d: 0.03, g: 0.6, t: 0.035 },
      { k: 'n', ft: 'lp', f: 1400, d: 0.45, g: 0.22, at: 0.02, t: 0.07 }
    ]
  },
  shutter: {
    dur: 0.3, peak: 0.55,
    layers: [
      { k: 'n', ft: 'bp', f: 2600, q: 6, d: 0.008, g: 0.7 },
      { k: 'n', ft: 'hp', f: 5000, d: 0.004, g: 0.4 },
      { k: 'n', ft: 'bp', f: 2200, q: 6, d: 0.01, g: 0.6, t: 0.058 }
    ]
  },
  'ui.tick': {
    dur: 0.14, peak: 0.3,
    layers: [
      { k: 'n', ft: 'bp', f: 2200, q: 5, d: 0.009, g: 0.6 },
      { k: 'n', ft: 'bp', f: 700, q: 4, d: 0.012, g: 0.25 }
    ]
  },
  // 게임의 첫 소리. "프런트 벨을 누르십시오"라고 써 놓고 벨이 울리지 않았다.
  // 누름종 돔은 배음이 정수배가 아니다 — 2093 위에 1.52배·2.6배·4.25배를 얹어 종으로 들리게 한다.
  'desk.bell': {
    dur: 2.8, peak: 0.82,
    layers: [
      { k: 'n', ft: 'bp', f: 6200, q: 5, d: 0.0025, g: 0.5 },
      { k: 't', f: 2093, d: 1.45, g: 0.8, at: 0.0015 },
      { k: 't', f: 3181, d: 1.05, g: 0.24, at: 0.0018 },
      { k: 't', f: 5440, d: 0.8, g: 0.3, at: 0.0015 },
      { k: 't', f: 8900, d: 0.4, g: 0.13, at: 0.0012 },
      { k: 'n', ft: 'bp', f: 420, q: 6, d: 0.02, g: 0.26 }
    ]
  },
  // 엘리베이터 아코디언 격자문. 살이 접히며 지나가는 금속 딱딱임 4회 → 걸쇠 울림.
  'gate.slide': {
    dur: 1.7, peak: 0.72,
    layers: [
      { k: 'n', ft: 'bp', f: 1250, q: 2, d: 0.45, g: 1.0, at: 0.05 },
      { k: 'n', ft: 'bp', f: 2900, q: 8, d: 0.02, g: 0.55, t: 0.09 },
      { k: 'n', ft: 'bp', f: 3350, q: 9, d: 0.018, g: 0.5, t: 0.23 },
      { k: 'n', ft: 'bp', f: 2740, q: 8, d: 0.02, g: 0.46, t: 0.38 },
      { k: 'n', ft: 'bp', f: 3120, q: 9, d: 0.017, g: 0.42, t: 0.54 },
      { k: 'n', ft: 'bp', f: 690, q: 18, d: 0.24, g: 0.3, t: 0.78 },
      { k: 'n', ft: 'bp', f: 1580, q: 14, d: 0.14, g: 0.22, t: 0.78 },
      { k: 't', f: 88, d: 0.09, g: 0.16, t: 0.78 }
    ]
  },
  'drawer.pull': {
    dur: 0.75, peak: 0.58,
    layers: [
      { k: 'n', ft: 'bp', f: 260, q: 1.6, d: 0.26, g: 1.0, at: 0.03 },
      { k: 'n', ft: 'bp', f: 1400, q: 2.2, d: 0.2, g: 0.24, at: 0.04 },
      { k: 't', f: 74, d: 0.045, g: 0.34, t: 0.3 },
      { k: 'n', ft: 'lp', f: 520, d: 0.05, g: 0.3, t: 0.3 }
    ]
  },
  // 다이얼 디텐트 4클릭 + 동조가 올라오며 밝아지는 반송 잡음.
  'radio.dial': {
    dur: 0.6, peak: 0.55,
    layers: [
      { k: 'n', ft: 'lp', f: 900, f2: 3200, d: 0.2, g: 0.22, at: 0.01 },
      { k: 'n', ft: 'bp', f: 1900, q: 12, d: 0.006, g: 0.5 },
      { k: 'n', ft: 'bp', f: 2050, q: 12, d: 0.006, g: 0.44, t: 0.055 },
      { k: 'n', ft: 'bp', f: 1830, q: 12, d: 0.006, g: 0.4, t: 0.118 },
      { k: 'n', ft: 'bp', f: 1980, q: 12, d: 0.006, g: 0.36, t: 0.186 }
    ]
  },
  // 관찰형 증거는 집히지 않는다 — 물건 소리가 아니라 노트에 적히는 소리가 맞다.
  'note.scribble': {
    dur: 0.5, peak: 0.4,
    layers: [
      { k: 'n', ft: 'bp', f: 2600, q: 1.5, d: 0.045, g: 0.5, at: 0.006 },
      { k: 'n', ft: 'bp', f: 3400, q: 1.8, d: 0.035, g: 0.4, at: 0.005, t: 0.11 },
      { k: 'n', ft: 'bp', f: 2200, q: 1.4, d: 0.04, g: 0.35, at: 0.006, t: 0.21 },
      { k: 'n', ft: 'lp', f: 600, d: 0.05, g: 0.12 }
    ]
  },
  // 소각. 불이 아니라 줄이다 — 방에 불은 없다(E7 물질 원점). 한 획 긋고, 아래가 꺼진다.
  'note.strikeout': {
    dur: 1.1, peak: 0.62,
    layers: [
      { k: 'n', ft: 'bp', f: 1750, q: 1.2, d: 0.09, g: 1.0, at: 0.004 },
      { k: 'n', ft: 'lp', f: 420, d: 0.12, g: 0.34, at: 0.006 },
      { k: 't', f: 64, d: 0.16, g: 0.26, t: 0.14, at: 0.002 },
      { k: 'n', ft: 'hp', f: 2400, d: 0.05, g: 0.2, t: 0.2 }
    ]
  },
  'photo.sleeve': {
    dur: 0.6, peak: 0.5,
    layers: [
      { k: 'n', ft: 'lp', f: 3600, f2: 1200, d: 0.11, g: 0.55, at: 0.01 },
      { k: 'n', ft: 'bp', f: 1100, q: 2, d: 0.03, g: 0.2, t: 0.05 },
      { k: 'n', ft: 'hp', f: 2800, d: 0.02, g: 0.4, t: 0.16 }
    ]
  },
  'cloth.rustle': {
    dur: 0.55, peak: 0.38,
    layers: [
      { k: 'n', ft: 'bp', f: 1800, q: 0.9, d: 0.08, g: 0.5, at: 0.02 },
      { k: 'n', ft: 'bp', f: 3400, q: 1.1, d: 0.05, g: 0.3, at: 0.015, t: 0.09 },
      { k: 'n', ft: 'lp', f: 500, d: 0.09, g: 0.18 }
    ]
  }
}

// 다른 모듈이 발화하는 sfx id 는 이 표의 키와 형식이 다르다(콜론·모드 접미). 폴백으로 흡수하면
// 라디오도 소각도 사진도 전부 ui.tick 딸깍 하나로 들린다 — 실제로 그랬다. 여기서 명시 해소한다.
// 값 null = 의도적 무음(다른 경로가 이미 소리를 낸다).
export const SFX_ALIAS = {
  'interrogation-burn': 'note.strikeout',
  'lobby:wrench-pass': 'wrench.clank',
  'photo:open': 'photo.sleeve',
  'photo:close': 'notebook.close',
  'photo:flip': 'photo.flip',
  'evidence:pickup': 'paper.pickup',
  'evidence:photos': 'photo.sleeve',
  'evidence:observe': null   // 관찰은 손을 대지 않는다. evidence:collected 의 필기음만 남는다
}

// 해소 결과: 실재 스펙 키 · null(무음) · undefined(미등록 — 호출부가 폴백을 정한다)
export function sfxKey (id) {
  const s = String(id ?? '')
  if (SFX[s]) return s
  if (s in SFX_ALIAS) return SFX_ALIAS[s]
  return undefined
}

export function footBuffer (material, variant, sr) {
  return renderSpec(FOOT[footKey(material)], 1000 + variant * 37, sr)
}

export function sfxBuffer (id, variant, sr) {
  return renderSpec(SFX[id] ?? SFX['ui.tick'], 2000 + variant * 53, sr)
}

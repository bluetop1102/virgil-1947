// 공간별 임펄스 응답과 룸톤 베드를 절차 생성한다. 외부 IR 파일·앰비언스 파일을 쓰지 않는다(루브릭 N7).
// 방마다 잔향의 성격이 달라야 판정이 선다: 로비=길고 초기반사 뚜렷, 복도=플러터, 객실=죽은 음향,
// 욕실=금속성 링잉, 옥상=잔향 없음, 엘리베이터=답답한 박스.

import { rng, clamp } from '../core/util.js'
import { biquad } from './dsp.js'

const TAU = Math.PI * 2

export const ROOM_ALIAS = {
  lobby: 'lobby', 'lobby-night': 'lobby', frontdesk: 'lobby', desk: 'lobby', testbed: 'lobby',
  corridor: 'corridor', 'corridor-night': 'corridor', hall: 'corridor', hallway: 'corridor', floor9: 'corridor',
  room: 'room', room942: 'room', room944: 'room', '942': 'room', '944': 'room', guestroom: 'room', 'room-dusk': 'room',
  bath: 'bath', bathroom: 'bath', washroom: 'bath',
  roof: 'roof', rooftop: 'roof', 'rooftop-rain': 'roof', tank: 'roof', catwalk: 'roof',
  elevator: 'elevator', lift: 'elevator', elev: 'elevator', cab: 'elevator'
}

export function roomKey (name) {
  const s = String(name ?? '').toLowerCase().trim()
  if (ROOM_ALIAS[s]) return ROOM_ALIAS[s]
  for (const k in ROOM_ALIAS) if (s.includes(k)) return ROOM_ALIAS[k]
  return 'lobby'
}

// wet=리버브 센드, tone=룸톤 레벨, hum=형광등 험, water=배관 수위, drip=낙수 빈도
export const ROOM_MIX = {
  lobby: { wet: 0.30, tone: 0.50, hum: 0.16, water: 0.16, drip: 0.05 },
  corridor: { wet: 0.34, tone: 0.55, hum: 0.30, water: 0.34, drip: 0.14 },
  room: { wet: 0.14, tone: 0.42, hum: 0.05, water: 0.50, drip: 0.30 },
  bath: { wet: 0.46, tone: 0.50, hum: 0.10, water: 0.85, drip: 0.85 },
  roof: { wet: 0.05, tone: 0.78, hum: 0.02, water: 1.00, drip: 0.18 },
  elevator: { wet: 0.26, tone: 0.60, hum: 0.22, water: 0.30, drip: 0.06 }
}

const IR = {
  lobby: {
    rt60: 2.4, pre: 0.019, damp: 5200, hp: 90,
    taps: [[0.011, 0.62], [0.019, 0.5], [0.027, 0.41], [0.038, 0.33], [0.052, 0.27], [0.071, 0.2], [0.094, 0.15]]
  },
  corridor: {
    rt60: 1.5, pre: 0.008, damp: 3400, hp: 120,
    taps: [[0.006, 0.7], [0.013, 0.52], [0.021, 0.38]],
    flutter: { p: 0.0212, n: 40, g: 0.55 }
  },
  room: {
    rt60: 0.4, pre: 0.005, damp: 1700, hp: 110,
    taps: [[0.004, 0.4], [0.009, 0.26], [0.015, 0.16]]
  },
  bath: {
    rt60: 1.1, pre: 0.004, damp: 9000, hp: 170,
    taps: [[0.003, 0.8], [0.007, 0.66], [0.011, 0.55], [0.016, 0.42]],
    // 링잉은 성격이지 잔향이 아니다. τ를 꼬리보다 훨씬 짧게 둬야 RT60이 꼬리에서 결정된다.
    ring: [[2870, 0.5, 0.14], [4130, 0.36, 0.1], [5610, 0.26, 0.07], [7420, 0.16, 0.05]]
  },
  roof: {
    rt60: 0.12, pre: 0.0, damp: 2600, hp: 220,
    taps: [[0.004, 0.16], [0.011, 0.09]]
  },
  elevator: {
    rt60: 0.33, pre: 0.002, damp: 2200, hp: 150,
    taps: [[0.0022, 0.85], [0.0041, 0.7], [0.0063, 0.55]],
    flutter: { p: 0.0034, n: 26, g: 0.6 }
  }
}

// 컨볼버는 normalize=false로 쓴다. 에너지를 여기서 고정해야 방 전환의 음량이 튀지 않는다.
const IR_ENERGY = 0.22

function renderIRChannel (spec, seed, sr) {
  const n = Math.round((spec.pre + spec.rt60 + 0.05) * sr)
  const out = new Float32Array(n)
  const r = rng(seed)
  const pre = Math.round(spec.pre * sr)
  const lp = biquad('lp', spec.damp, 0.7, sr)
  const hp = biquad('hp', spec.hp, 0.7, sr)
  const k = 6.9078 / spec.rt60

  // 확산 꼬리
  for (let i = pre; i < n; i++) {
    const t = (i - pre) / sr
    const build = 1 - Math.exp(-t / 0.006)
    out[i] += hp(lp(r() * 2 - 1)) * Math.exp(-k * t) * build
  }
  // 초기 반사 — 방의 크기를 귀에 알려주는 것은 꼬리가 아니라 이 탭들이다
  for (const [tt, gg] of spec.taps) {
    const off = pre + Math.round(tt * sr * (0.94 + r() * 0.12))
    const len = Math.min(n - off, Math.round(sr * 0.004))
    const f = biquad('lp', spec.damp * 0.8, 0.7, sr)
    for (let i = 0; i < len; i++) out[off + i] += f(r() * 2 - 1) * gg * Math.exp(-i / (sr * 0.0008))
  }
  if (spec.flutter) {
    const { p, n: cnt, g } = spec.flutter
    for (let j = 1; j <= cnt; j++) {
      const off = pre + Math.round(p * j * sr * (0.995 + r() * 0.01))
      if (off >= n - 4) break
      const len = Math.min(n - off, Math.round(sr * 0.0025))
      const f = biquad('bp', 1400 + r() * 900, 1.4, sr)
      const a = g * Math.pow(0.86, j)
      for (let i = 0; i < len; i++) out[off + i] += f(r() * 2 - 1) * a * Math.exp(-i / (sr * 0.0005))
    }
  }
  if (spec.ring) {
    for (const [f, g, tau] of spec.ring) {
      const ph0 = r() * TAU
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr
        out[i] += Math.sin(TAU * f * t + ph0) * g * Math.exp(-t / tau) * (1 - Math.exp(-t / 0.001))
      }
    }
  }
  let e = 0
  for (let i = 0; i < n; i++) e += out[i] * out[i]
  const gain = IR_ENERGY / Math.sqrt(Math.max(e, 1e-12))
  for (let i = 0; i < n; i++) out[i] *= gain
  return out
}

export function renderIR (room, sr) {
  const spec = IR[roomKey(room)]
  return [renderIRChannel(spec, 7717, sr), renderIRChannel(spec, 991, sr)]
}

// ── 룸톤 베드 (심리스 루프) ──────────────────────────────────────────
const BED = {
  lobby: {
    dur: 8, layers: [
      { ft: 'lp', f: 110, q: 0.7, g: 0.55, lfo: 0.06, dep: 0.25 },
      { ft: 'lp', f: 760, q: 0.7, g: 0.11, lfo: 0.09, dep: 0.4 },
      { ft: 'bp', f: 2400, q: 0.8, g: 0.022, lfo: 0.13, dep: 0.5 }
    ]
  },
  corridor: {
    dur: 8, layers: [
      { ft: 'lp', f: 95, q: 0.7, g: 0.45, lfo: 0.05, dep: 0.3 },
      { ft: 'bp', f: 1250, q: 0.9, g: 0.07, lfo: 0.13, dep: 0.5 },
      { ft: 'bp', f: 420, q: 1.4, g: 0.05, lfo: 0.21, dep: 0.35 }
    ]
  },
  room: {
    dur: 8, layers: [
      { ft: 'lp', f: 240, q: 0.7, g: 0.24, lfo: 0.04, dep: 0.2 },
      { ft: 'bp', f: 640, q: 1.1, g: 0.035, lfo: 0.08, dep: 0.5 },
      { ft: 'lp', f: 1600, q: 0.7, g: 0.014, lfo: 0.11, dep: 0.6 }
    ]
  },
  bath: {
    dur: 8, layers: [
      { ft: 'bp', f: 700, q: 1.3, g: 0.12, lfo: 0.17, dep: 0.35 },
      { ft: 'lp', f: 130, q: 0.7, g: 0.22 },
      { ft: 'bp', f: 2900, q: 1.8, g: 0.02, lfo: 0.29, dep: 0.6 }
    ]
  },
  roof: {
    dur: 8, drops: 110, layers: [
      { ft: 'hp', f: 520, q: 0.7, g: 0.5, lfo: 0.29, dep: 0.22 },
      { ft: 'lp', f: 210, q: 0.7, g: 0.42, lfo: 0.11, dep: 0.45 },
      { ft: 'bp', f: 2600, q: 0.7, g: 0.17, lfo: 0.19, dep: 0.3 }
    ]
  },
  elevator: {
    dur: 6, layers: [
      { ft: 'bp', f: 88, q: 1.6, g: 0.5, lfo: 0.09, dep: 0.2 },
      { ft: 'lp', f: 900, q: 0.7, g: 0.05, lfo: 0.16, dep: 0.4 },
      { ft: 'bp', f: 2100, q: 2.0, g: 0.022, lfo: 0.33, dep: 0.5 }
    ]
  }
}

function renderBedChannel (spec, seed, sr) {
  const n = Math.round(spec.dur * sr)
  const xf = Math.round(0.5 * sr)
  const raw = new Float32Array(n + xf)
  spec.layers.forEach((L, li) => {
    const r = rng(seed + li * 4703)
    const f = biquad(L.ft, L.f, L.q ?? 0.7, sr)
    // LFO는 루프 길이의 정수배 주파수로 양자화해야 이음매에서 위상이 튀지 않는다
    const hz = L.lfo ? Math.max(1, Math.round(L.lfo * spec.dur)) / spec.dur : 0
    const dep = L.dep ?? 0
    const ph = r() * TAU
    for (let i = 0; i < n + xf; i++) {
      const m = hz ? 1 - dep * 0.5 * (1 - Math.cos(TAU * hz * i / sr + ph)) : 1
      raw[i] += f(r() * 2 - 1) * L.g * m
    }
  })
  if (spec.drops) {
    const r = rng(seed + 88651)
    for (let d = 0; d < spec.drops; d++) {
      const off = Math.round(r() * (n - sr * 0.08))
      const f = biquad('bp', 2600 + r() * 4200, 5 + r() * 6, sr)
      const g = 0.05 + r() * 0.16
      const len = Math.round(sr * 0.02)
      for (let i = 0; i < len; i++) raw[off + i] += f(r() * 2 - 1) * g * Math.exp(-i / (sr * 0.0025))
    }
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = raw[i]
  for (let i = 0; i < xf; i++) {
    const w = i / xf
    out[i] = raw[i] * w + raw[n + i] * (1 - w)
  }
  for (let i = 0; i < n; i++) out[i] = clamp(out[i], -1, 1)
  return out
}

export function renderBed (room, sr) {
  const spec = BED[roomKey(room)]
  return { dur: spec.dur, ch: [renderBedChannel(spec, 3319, sr), renderBedChannel(spec, 5477, sr)] }
}

// 배관 흐름·공기 혼입용 광대역 소스. 루프 소스로 한 번만 만들고 필터로 성격을 바꾼다.
export function renderWaterSource (sr, dur = 4) {
  const n = Math.round(dur * sr)
  const xf = Math.round(0.4 * sr)
  const raw = new Float32Array(n + xf)
  const r = rng(60611)
  const lp = biquad('lp', 5200, 0.7, sr)
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < n + xf; i++) {
    const w = r() * 2 - 1
    // 핑크 근사 — 백색 노이즈만 쓰면 물이 아니라 히스로 들린다
    b0 = 0.99765 * b0 + w * 0.0990460
    b1 = 0.96300 * b1 + w * 0.2965164
    b2 = 0.57000 * b2 + w * 1.0526913
    raw[i] = lp((b0 + b1 + b2 + w * 0.1848) * 0.22)
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = raw[i]
  for (let i = 0; i < xf; i++) { const w = i / xf; out[i] = raw[i] * w + raw[n + i] * (1 - w) }
  for (let i = 0; i < n; i++) out[i] = clamp(out[i], -1, 1)
  return { dur, ch: [out] }
}

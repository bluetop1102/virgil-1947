import { clamp } from '../../core/util.js'

// 광도 → 렌더 단위 정규화. 실제 촉광(cd)을 그대로 넣으면 LOOK.exposure를 1/30로 내려야 한다.
// 상대 광량(2400lm 샹들리에 : 420lm 벽등)은 물리적으로 보존되고, 절대 스케일만 1947년
// 고감도 필름 노출에 해당하는 상수 하나로 눌러 다른 에이전트가 exposure≈1로 작업할 수 있게 한다.
export const PHOTOMETRIC = 0.035
// 광축 셸 전역 게인. 종류별 shaft 값은 상대비만 담고, 절대 세기는 여기 하나로 조인다.
// 0.30에서는 셸이 프레임 HDR 총량의 4.3배를 혼자 만들어(실측 hdrAvg 0.0258 vs 셸 숨김 0.0049)
// 자동노출을 끌어내리고 화면 전체가 우유빛 베일이 됐다. 셸은 볼류메트릭이 마치하지 못하는
// 광원의 보조 광축이지 주 광량원이 아니다 — 프레임 총량의 20~30%가 상한이다.
export const SHAFT_GAIN = 0.055
// 셸 세기를 광도에 물릴 때의 기준 광도(복도 벽등 ≈ 25). 여기서 배율 1이 되도록 잡아
// 기존 룩을 기준선으로 유지하고, 다른 기구는 이 값 대비로만 오르내린다.
export const SHAFT_CD_REF = 25

export const KINDS = {
  // up(천장 스필)은 천장 광량의 82%다(끄면 패널 66→12). 반자틀 사이 명암이 톤커브 아래쪽에 몰려 안 읽혔다.
  // 0.34 → 0.80. 반자틀 줄무늬가 안 읽히는 곳은 그림자가 아니라 **좌측 천장 대역의 노출**이었다
  // (x150–450 평균 19.7 = 톤커브 바닥. 낙차 68% 가 있어도 눈에 안 남는다. 중앙 대역은 이미 92%).
  // 노출 고정 A/B(scratchpad/lit2/fin W4): up ×2.35 에서 좌측 낙차 68.4% → 84.1%.
  sconce: { type: 'spot', kelvin: 2700, lumens: 420, radius: 5.2, angle: 1.15, penumbra: 0.78, flick: 'incandescent', shaft: 0.18, shadow: true, dir: [0, -0.55, 0.4], prio: 1.0, hot: 2.6, fill: 0.014, up: 0.80, upAngle: 1.30, upRadius: 3.6 },
  chandelier: { type: 'point', kelvin: 2550, lumens: 2400, radius: 12.0, flick: 'incandescent', shaft: 0, shadow: false, prio: 1.5, hot: 2.8 },
  desk: { type: 'spot', kelvin: 2700, lumens: 560, radius: 4.2, angle: 0.98, penumbra: 0.55, flick: 'incandescent', shaft: 0.14, shadow: true, dir: [0, -1, 0], prio: 1.1, hot: 2.4 },
  ceiling: { type: 'spot', kelvin: 4500, lumens: 2200, radius: 8.5, angle: 1.32, penumbra: 0.62, flick: 'fluorescent', shaft: 0.15, shadow: true, dir: [0, -1, 0], prio: 1.2, hot: 3.2, up: 0.17, upAngle: 1.36, upRadius: 4.6, upY: -0.32, spd: [0.930, 1.053, 1.012] },
  neon: { type: 'point', kelvin: 6200, lumens: 460, radius: 5.5, flick: 'neon', shaft: 0, shadow: false, prio: 0.85, hot: 5.0 },
  moon: { type: 'dir', kelvin: 8000, lux: 15, shadow: true, flick: 'none', dir: [0.42, -0.60, -0.68], prio: 4.0, hot: 0 },
  street: { type: 'spot', kelvin: 2050, lumens: 12000, radius: 30.0, angle: 0.90, penumbra: 0.42, flick: 'sodium', shaft: 0.50, shadow: true, dir: [0, -1, 0], prio: 1.8, hot: 0 },
  'bare-bulb': { type: 'point', kelvin: 2400, lumens: 280, radius: 4.2, flick: 'voltage', shaft: 0, shadow: false, prio: 0.9, hot: 4.0 },
  elevator: { type: 'spot', kelvin: 3200, lumens: 780, radius: 4.8, angle: 1.24, penumbra: 0.86, flick: 'hum', shaft: 0.22, shadow: true, dir: [0, -1, 0], prio: 1.05, hot: 2.8 }
}

// 형광등은 흑체가 아니다. 1947년 할로포스페이트 관은 수은 546nm 스파이크 때문에 같은 색온도의
// 흑체보다 색도가 플랑크 궤적 **위**(녹색 쪽, Duv > 0)에 놓이고 심적색이 빈다. core/util.js 의
// kelvin() 은 궤적 위의 점만 낼 수 있고 그 파일은 잠겨 있으므로, 궤적을 벗어나는 벡터를 여기서
// 곱한다. 이게 없으면 2700K 백열과 4500K 형광이 "같은 램프의 온도 차"로만 읽혀 광원 종류가
// 구분되지 않는다(G1 6점 = 색온도 균일).
// spd 는 선형 RGB 이득이고, **휘도는 보존한다** — 색만 갈라야 이 변경의 diff 가 밝기가 아니라
// 색으로 귀속된다. ceiling 의 [0.930, 1.053, 1.012] 는 4500K sRGB (255,217,187) 를
// (247,223,189) 로 미는 값이다: R-B -8, 그린 +6.
const LUMA = [0.2126, 0.7152, 0.0722]
export function offLocus (col, spd) {
  if (!spd) return col
  const out = [col[0] * spd[0], col[1] * spd[1], col[2] * spd[2]]
  const y0 = LUMA[0] * col[0] + LUMA[1] * col[1] + LUMA[2] * col[2]
  const y1 = LUMA[0] * out[0] + LUMA[1] * out[1] + LUMA[2] * out[2]
  const k = y1 > 1e-6 ? y0 / y1 : 1
  return [out[0] * k, out[1] * k, out[2] * k]
}

const h1 = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

// 종류별 시간 함수. 백열등은 열관성 때문에 느리게 출렁이고, 형광등은 점등 스트라이크가 튄다.
export function flicker (shape, t, seed, amt) {
  if (!amt || shape === 'none') return 1
  const p = seed * 6.2831
  if (shape === 'incandescent') {
    const v = 0.55 * Math.sin(t * 0.63 + p) + 0.30 * Math.sin(t * 1.87 + p * 2.1) + 0.15 * Math.sin(t * 4.31 + p * 3.7)
    return 1 + amt * v
  }
  if (shape === 'voltage') {
    const v = 0.5 * Math.sin(t * 0.9 + p) + 0.5 * Math.sin(t * 2.7 + p * 1.7)
    const dip = h1(Math.floor(t * 2.3 + seed * 31)) < 0.09 ? -1.9 : 0
    return clamp(1 + amt * (v + dip * (0.5 + 0.5 * Math.sin(t * 19 + p))), 0.05, 1.6)
  }
  if (shape === 'fluorescent') {
    // 120Hz 리플은 60fps 샘플링에서 앨리어싱된다 — 셔터와의 비트 주파수로 모델링한다
    const beat = 0.5 + 0.5 * Math.sin(t * 45.9 + p)
    const cell = Math.floor(t * 9 + seed * 53)
    const g = h1(cell)
    const strike = g < 0.055 ? 0.18 + 0.55 * h1(cell + 7) : 1
    const warm = g > 0.985 ? 0.62 : 1
    return clamp((1 - amt * 0.55 * beat) * strike * warm, 0.03, 1.3)
  }
  if (shape === 'neon') {
    const buzz = 0.5 + 0.5 * Math.sin(t * 81.7 + p)
    const cell = Math.floor(t * 1.7 + seed * 17)
    const out = h1(cell) < 0.05 ? 0.10 : 1
    return clamp((1 - amt * 0.4 * buzz) * out, 0.02, 1.2)
  }
  if (shape === 'sodium') return 1 + amt * 0.35 * Math.sin(t * 0.31 + p)
  if (shape === 'hum') return 1 + amt * (0.6 * Math.sin(t * 7.3 + p) + 0.4 * Math.sin(t * 2.1 + p * 3))
  return 1
}

export function candela (kind, lumens, angle) {
  if (kind.type === 'dir') return lumens
  if (kind.type === 'spot') return lumens / (2 * Math.PI * (1 - Math.cos(angle)))
  return lumens / (4 * Math.PI)
}

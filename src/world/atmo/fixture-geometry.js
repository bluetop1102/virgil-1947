import * as THREE from 'three'

export function bulbGeo (s) {
  const pts = [[0, 0], [0.030, 0.005], [0.038, 0.022], [0.031, 0.044], [0.021, 0.058],
    [0.028, 0.076], [0.032, 0.096], [0.026, 0.114], [0.012, 0.126], [0, 0.130]]
  return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0] * s, p[1] * s)), 20)
}

export function stemGeo (r, h) {
  const pts = [[r * 1.9, 0], [r, h * 0.10], [r * 0.82, h * 0.5], [r, h * 0.90], [r * 1.6, h]]
  return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 12)
}

// 아르데코 계단 갤러리. 유리 사발의 림을 무는 놋쇠 테를 단일 선반(lathe)으로 뽑는다 —
// 단마다 모따기를 둬야 하이라이트가 모서리를 타고 흐른다. 하드 에지는 스침각에서
// "잘라낸 종이"로 읽힌다(루브릭 G10). 발광이 아니라 PBR 금속이므로 안쪽 광원에 비춰져
// 단의 윗면과 아랫면에 밝기 차가 생긴다(G3).
export function galleryGeo (r, h) {
  const c = 0.0016
  const pts = []
  let y = 0
  for (const k of [1.0, 0.93, 0.86]) {
    const rr = r * k
    pts.push(new THREE.Vector2(rr, y), new THREE.Vector2(rr, y + h * 0.28 - c))
    y += h * 0.28
    pts.push(new THREE.Vector2(rr - c, y), new THREE.Vector2(rr - r * 0.07 + c, y))
  }
  pts.push(new THREE.Vector2(r * 0.79, y + h * 0.16))
  return new THREE.LatheGeometry(pts, 30)
}

export function domeGeo (r, cut) {
  const pts = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * cut
    pts.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r * 0.78))
  }
  pts.push(new THREE.Vector2(Math.sin(cut) * r * 0.97, Math.cos(cut) * r * 0.78 - 0.012))
  return new THREE.LatheGeometry(pts, 28)
}

// 같은 기구가 여러 개 걸릴 때 전부 똑같으면 즉시 가짜로 읽힌다(계약 §8 / 루브릭 G10).
// 시드를 밖에서 못 받으므로 광원 자체의 색온도·HDR 배수에서 결정론적으로 뽑는다 —
// 한 공간의 벽등은 켈빈이 서로 다르게 배선돼 있어 기구마다 다른 값이 나온다.
// 1947년 복도용 표면부착 형광등 채널. 이전 판은 순백 캡슐 두 개 + 돔 하나였다 —
// 하우징도 엔드캡도 소켓도 없어서 화면에서 "흰 알약"으로 읽혔고 루브릭 D4(플레이스홀더
// 지오메트리)에 그대로 걸렸다. 실물의 읽히는 요소는 넷이다: 접힌 강판 채널, 양끝
// 엔드플레이트와 텅스톤 소켓, 채널 안으로 들어간 관, 관을 가리는 유백유리 트로프.
// 단면(u=폭 반, v=높이). 상단이 천장에 붙고 아래로 내려오며 하단 립이 안쪽으로 말린다.
export const CHANNEL_PROF = [
  [-0.082, 0.000], [0.082, 0.000], [0.082, -0.052], [0.074, -0.062],
  [0.058, -0.066], [0.058, -0.056], [0.070, -0.052], [0.070, -0.006],
  [-0.070, -0.006], [-0.070, -0.052], [-0.058, -0.056], [-0.058, -0.066],
  [-0.074, -0.062], [-0.082, -0.052]
]
// 채널 안쪽 백색 에나멜 반사판. 관은 실광원이 아니라 무조명 이미터라, 반사판을 PBR로 두면
// 채널 속이 IBL만 받아 **차가운 청회색 평판**이 된다(1차 시도에서 그렇게 나왔다).
// 관 빛을 받아 빛나는 면이므로 셰이드(무조명 이미터)로 그린다 — 그래야 기구가 켜진 것으로 읽힌다.
export const REFLECTOR_PROF = [
  [-0.066, -0.004], [-0.062, -0.044], [-0.030, -0.056], [0.030, -0.056],
  [0.062, -0.044], [0.066, -0.004], [0.060, -0.004], [0.056, -0.042],
  [0.028, -0.051], [-0.028, -0.051], [-0.056, -0.042], [-0.060, -0.004]
]

export function fxHash (col, hot, salt) {
  const s = Math.sin(col[0] * 127.1 + col[1] * 311.7 + col[2] * 74.7 + hot * 45.3 + salt * 19.1) * 43758.5453
  return s - Math.floor(s)
}

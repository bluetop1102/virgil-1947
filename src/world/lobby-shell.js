// [LEVEL-LOBBY] 로비 셸·목공. ARCHITECTURE §11(파일당 500줄)로 lobby.js에서 분권했다.
// 여기 있는 것은 전부 체험 리뷰(2026-08-08)의 형태·표면 축 지적분이다 —
//   G10 "박스 방 + 가구 소수 · 벽-천장 접합이 단순 직각"   → 걸레받이·크라운·픽처레일·체어레일
//   G10 "엘리베이터 홀 개구부에 아치"                      → makeElevatorArch
//   G10 "기둥 2개를 시야 리듬에 들어오게 재배치"            → makeColumns
//   G6  "엘리베이터 홀 크래클 벽"                          → 네 벽 벽지 통일 + 웨인스코트
//   G5  "젖은/마른 구획 분리"                              → floorZones + FLOOR_PATCH
//   D4  "무텍스처 슬래브"(기둥 거울판)                     → boxUv + 리드 기둥

import * as THREE from 'three'
import { clamp, fbm, noise2D, smoothstep } from '../core/util.js'
import { bevelBox, group, groundContact, merge, mesh, profile, tube, xf } from './kit.js'
import { cloneMat, mat } from './kit-mat.js'
import { panelWainscot } from './props-corridor.js'

export const W = 14.8
export const D = 18.4
export const H = 4.15
export const BACK = -7.25
export const FRONT = 11.15

const DADO_Y = 1.06
const RAIL_Y = 2.92

// 몰딩 단면은 (u, v) 좌표다 — u = 벽면을 따라가는 높이 방향, v = 벽에서 나오는 깊이(kit.profile 규약).
// 옛 걸레받이(15×5.8cm)·크라운(19×15cm)은 천장 4.15m 방에서 바닥선·천장선이 각각 어두운 띠
// 하나로 뭉쳐 "박스 방 + 가구 소수"로 읽혔다(체험 리뷰 G10). 값 층이 셋 이상 서도록 단을 늘린다.
const BASE_PROFILE = [
  [0, 0], [0.215, 0], [0.215, 0.022], [0.198, 0.032], [0.196, 0.046],
  [0.176, 0.052], [0.170, 0.066], [0.155, 0.072], [0.150, 0.086],
  [0.020, 0.086], [0, 0.060]
]

const CROWN_PROFILE = [
  [0, 0], [0.335, 0], [0.335, 0.040], [0.318, 0.052], [0.312, 0.070],
  [0.276, 0.088], [0.232, 0.128], [0.180, 0.176], [0.128, 0.208],
  [0.086, 0.222], [0.078, 0.244], [0.052, 0.256], [0.046, 0.272],
  [0.020, 0.276], [0, 0.258]
]

// 픽처레일 — 벽지 레시피의 그을음 띠 하단(월드 2.95m)과 같은 높이다. 액자가 걸렸던 선을
// 텍스처가 아니라 실제 부재가 설명하게 만든다.
const RAIL_PROFILE = [
  [0, 0], [0.074, 0], [0.074, 0.026], [0.060, 0.040], [0.042, 0.046],
  [0.024, 0.042], [0.016, 0.028], [0, 0.021]
]

// 체어레일 — 웨인스코트 상단 캡
const DADO_PROFILE = [
  [0, 0], [0.118, 0], [0.118, 0.030], [0.102, 0.048], [0.086, 0.056],
  [0.062, 0.064], [0.040, 0.060], [0.026, 0.044], [0.020, 0.028], [0, 0.023]
]

// 지배 노멀 축으로 UV를 박스 투영한다. RoundedBox 기본 UV는 면마다 텍스처 전체(0..1)를
// 욱여넣으므로 0.6m 캐비닛에서는 나이테가 픽셀 노이즈로 뭉개지고(체험 리뷰 D4 라디오·서랍),
// 반대로 3.7m 기둥에서는 한 장이 늘어나 결 자체가 사라진다. tile = 텍스처 한 장이 덮을 거리(m).
// swap=true면 u/v를 바꿔 결을 90° 돌린다 — 기둥처럼 결이 세로로 흘러야 하는 부재용.
// bevelBox는 지오메트리를 캐시하므로 반드시 복제한 뒤 UV를 갈아끼운다.
export function boxUv (geo, tile, swap = false) {
  const g = geo.clone()
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i))
    let u, v
    if (nx >= ny && nx >= nz) { u = pos.getZ(i); v = pos.getY(i) }
    else if (ny >= nz) { u = pos.getX(i); v = pos.getZ(i) }
    else { u = pos.getX(i); v = pos.getY(i) }
    uv[i * 2] = (swap ? v : u) / tile
    uv[i * 2 + 1] = (swap ? u : v) / tile
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

export const bb = (w, h, d, bevel, seg, tile, swap) => boxUv(bevelBox(w, h, d, bevel, seg), tile, swap)

// 벽 4면을 도는 몰딩 런. dir<0이면 단면의 u가 아래로 향하고(크라운·레일), dir>0이면 위로 선다
// (걸레받이). up은 각 벽의 실내 방향 법선이고 kit.profile이 그 값으로 단면 프레임을 고정한다.
function trimRuns (y, dir) {
  const runs = [
    [[-W * 0.5, y, BACK], [W * 0.5, y, BACK], [0, 0, 1]],
    [[-W * 0.5, y, FRONT], [-W * 0.5, y, BACK], [1, 0, 0]],
    [[W * 0.5, y, BACK], [W * 0.5, y, FRONT], [-1, 0, 0]],
    [[W * 0.5, y, FRONT], [-W * 0.5, y, FRONT], [0, 0, -1]]
  ]
  return runs.map(([a, b, up]) => (dir < 0 ? [b, a, up] : [a, b, up]))
}

function trimSweep (y, dir, prof) {
  return trimRuns(y, dir).map(([a, b, up]) => profile(prof, [a, b], { up }))
}

// 젖은 구획 / 마모 구획. SSR이 러프니스 G버퍼를 그대로 소비하므로(RESUME) 러프니스만 갈라
// 놓으면 입구는 젖어 반사가 서고 데스크 앞은 죽는다 — 지오메트리도 재질도 새로 만들지 않는다
// (체험 리뷰 G5 "러프니스 맵만 나누면 된다").
// vColor.r 0.5가 중립 · 1.0이 젖음(러프니스 −) · 0.0이 마모(러프니스 +).
// three의 color_fragment는 지운다 — 이 정점 컬러는 색이 아니라 구획 마스크다.
const FLOOR_PATCH = sh => {
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <color_fragment>', '')
    .replace('float roughnessFactor = cecilRgh;', `
      float zWet = clamp((vColor.r - 0.5) * 2.0, 0.0, 1.0);
      float zRub = clamp((0.5 - vColor.r) * 2.0, 0.0, 1.0);
      float roughnessFactor = clamp(cecilRgh - zWet * 0.052 + zRub * 0.30, 0.012, 1.0);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.74, 0.78, 0.86), zWet);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.90, 0.88, 0.85), zRub);
    `)
}

function floorZones (geo, offZ) {
  const pos = geo.attributes.position
  const col = new Float32Array(pos.count * 3)
  const n = noise2D(77)
  for (let i = 0; i < pos.count; i++) {
    // PlaneGeometry는 -90° 회전 전이라 로컬 (x, y)가 월드 (x, offZ - y)다.
    const wx = pos.getX(i)
    const wz = offZ - pos.getY(i)
    const jit = fbm(n, wx * 0.55, wz * 0.55, 3) - 0.5
    // 정문에서 밀려 들어온 빗물. 경계가 직선이면 구획이 아니라 마스크로 읽힌다
    const wet = smoothstep(clamp((wz - 4.6 + jit * 2.6) / 4.2, 0, 1))
    // 근무대 앞 마모 매트 — 발이 서는 자리만 광택이 죽는다
    const dx = (wx + 2.40) / 2.95
    const dz = (wz + 2.35) / 1.15
    const rub = 1 - smoothstep(clamp((Math.sqrt(dx * dx + dz * dz) - 0.55 + jit * 0.30) / 0.45, 0, 1))
    // 엘리베이터 앞도 같은 이유로 닳는다
    const ex = (wx - 5.55) / 1.55
    const ez = (wz + 1.20) / 1.30
    const rub2 = 1 - smoothstep(clamp((Math.sqrt(ex * ex + ez * ez) - 0.50 + jit * 0.26) / 0.50, 0, 1))
    const v = clamp(0.5 + wet * 0.5 - Math.max(rub, rub2 * 0.82) * 0.5, 0, 1)
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}

let _floorMat = null
function floorMaterial () {
  if (_floorMat) return _floorMat
  const src = mat('marble.lobby.floor')
  const m = cloneMat(src, { patch: FLOOR_PATCH, key: 'lobby-floor-zone' })
  m.vertexColors = true
  // 렌더러가 잡히기 전이면 src는 map도 defines도 없는 껍데기다 — 그 상태를 캐시하면 이후
  // complete()가 원본만 채우고 이 클론은 영원히 빈 채로 남는다(kit-mat.wearMat과 같은 함정).
  if (!src.userData.pending) _floorMat = m
  return m
}

export function makeShell () {
  const root = group('lobby.shell')
  const floor = new THREE.Mesh(
    floorZones(new THREE.PlaneGeometry(W, D, 40, 50), (BACK + FRONT) * 0.5), floorMaterial())
  floor.position.set(0, 0, (BACK + FRONT) * 0.5)
  floor.rotation.x = -Math.PI / 2
  floor.castShadow = false
  floor.receiveShadow = true
  floor.userData.floor = 'marble'
  const ceiling = mesh(new THREE.PlaneGeometry(W, D, 8, 12), 'plaster.cracked', {
    pos: [0, H, (BACK + FRONT) * 0.5], rot: [Math.PI / 2, 0, 0], cast: false
  })
  root.add(floor, ceiling)

  // 네 벽을 벽지로 통일한다. 우측(엘리베이터 홀)·전면이 plaster.cracked 였을 때 확대해서
  // 나오는 것이 2차 디테일이 아니라 균열 노이즈였다(체험 리뷰 G6). 허리 아래는 웨인스코트가 덮는다.
  root.add(
    mesh(bevelBox(W, H, 0.22, 0.018, 2), 'wallpaper.damask.green', { pos: [0, H * 0.5, BACK - 0.11], cast: false }),
    mesh(bevelBox(0.22, H, D, 0.018, 2), 'wallpaper.damask.green', { pos: [-W * 0.5 - 0.11, H * 0.5, (BACK + FRONT) * 0.5], cast: false }),
    mesh(bevelBox(0.22, H, D, 0.018, 2), 'wallpaper.damask.green', { pos: [W * 0.5 + 0.11, H * 0.5, (BACK + FRONT) * 0.5], cast: false }),
    mesh(bevelBox(W, H, 0.22, 0.018, 2), 'wallpaper.damask.green', { pos: [0, H * 0.5, FRONT + 0.11], cast: false })
  )

  root.add(mesh(merge(trimSweep(0, 1, BASE_PROFILE)), 'wood.painted.white', { wear: 0.82, seed: 101 }))
  root.add(mesh(merge(trimSweep(H, -1, CROWN_PROFILE)), 'wood.painted.white', { wear: 0.62, seed: 102 }))
  root.add(mesh(merge(trimSweep(RAIL_Y, -1, RAIL_PROFILE)), 'wood.varnished.dark', { wear: 0.75, seed: 103 }))
  root.add(mesh(merge(trimSweep(DADO_Y, -1, DADO_PROFILE)), 'wood.varnished.dark', { wear: 0.85, seed: 104 }))

  const inlays = []
  for (const x of [-4.7, -1.55, 1.55, 4.7]) {
    inlays.push(mesh(bevelBox(0.018, 0.008, D - 0.8, 0.002, 1), 'brass.tarnished', {
      pos: [x, 0.007, (BACK + FRONT) * 0.5], cast: false
    }))
  }
  for (const z of [-4.4, -0.4, 3.6, 7.6]) {
    inlays.push(mesh(bevelBox(W - 0.8, 0.008, 0.018, 0.002, 1), 'brass.tarnished', {
      pos: [0, 0.007, z], cast: false
    }))
  }
  root.add(...inlays)
  return root
}

// 웨인스코트. panelWainscot은 +z를 보는 벽면용이라 벽마다 회전시켜 붙인다.
// 로비를 도는 허리선 하나가 생기면 4.15m 벽이 값 구획 둘로 갈린다(G10/G6).
export function makeWainscot () {
  const root = group('lobby.wainscot')
  const y0 = 0.26, y1 = DADO_Y - 0.08
  const walls = [
    [[[-5.0, 1.85], [-2.6, 1.85], [2.6, 1.85], [5.0, 1.85]], BACK + 0.006, 0, 511],
    [[[-4.4, 2.10], [-1.9, 2.10], [1.9, 2.10], [4.4, 2.10]], FRONT - 0.006, Math.PI, 512],
    // 우측 벽은 엘리베이터 아치(z −2.7~0.3)를 피해 베이를 끊는다
    [[[-5.6, 1.90], [1.6, 1.90], [4.0, 1.90], [6.4, 1.90]], W * 0.5 - 0.006, -Math.PI * 0.5, 513]
  ]
  for (const [bays, at, rot, seed] of walls) {
    const g = panelWainscot(bays, y0, y1, 0, seed, { field: 'wood.varnished.dark' })
    g.rotation.y = rot
    if (rot === 0 || rot === Math.PI) g.position.z = at
    else g.position.x = at
    root.add(g)
  }
  return root
}

export function makeCollisionShell () {
  const root = group('lobby.colliders')
  root.visible = false
  root.add(
    mesh(bevelBox(W, 0.10, D, 0.004, 1), 'marble.lobby.floor', { pos: [0, -0.05, (BACK + FRONT) * 0.5] }),
    mesh(bevelBox(W, H, 0.20, 0.004, 1), 'plaster.cracked', { pos: [0, H * 0.5, BACK - 0.1] }),
    mesh(bevelBox(W, H, 0.20, 0.004, 1), 'plaster.cracked', { pos: [0, H * 0.5, FRONT + 0.1] }),
    mesh(bevelBox(0.20, H, D, 0.004, 1), 'plaster.cracked', { pos: [-W * 0.5 - 0.1, H * 0.5, (BACK + FRONT) * 0.5] }),
    mesh(bevelBox(0.20, H, D, 0.004, 1), 'plaster.cracked', { pos: [W * 0.5 + 0.1, H * 0.5, (BACK + FRONT) * 0.5] })
  )
  return root
}

export function makeCoffers () {
  const root = group('lobby.coffers')
  const geos = []
  const mats = []
  for (const z of [-5.4, -1.7, 2.0, 5.7, 9.4]) {
    geos.push(bb(W - 0.5, 0.16, 0.20, 0.028, 2, 1.30))
    mats.push(xf([0, H - 0.09, z]))
  }
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) {
    geos.push(bb(0.20, 0.16, D - 0.5, 0.028, 2, 1.30))
    mats.push(xf([x, H - 0.09, (BACK + FRONT) * 0.5]))
  }
  root.add(mesh(merge(geos, mats), 'wood.varnished.dark', { wear: 0.52, seed: 119 }))
  return root
}

// 리드 기둥. 옛 판은 0.72×3.68 면에 텍스처 한 장을 통째로 욱여넣어 목재가 가로 얼룩 노이즈가
// 되고, 그 위 mirror.aged 판이 아무것도 비추지 않는 크림색 슬래브로 남았다 — 근접 D4다.
// 결을 세로로 세우고(swap), 거울판을 놋쇠 리드 열여덟 줄로 바꿔 스펙큘러 리듬을 만든다(G10).
export function makeColumns () {
  const root = group('lobby.columns')
  for (const [i, x] of [-1, 1].entries()) {
    const column = group(`lobby.column.${i}`)
    const reeds = []
    for (const s of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        reeds.push(tube([[-0.24 + k * 0.12, 0.52, s * 0.285], [-0.24 + k * 0.12, 3.48, s * 0.285]], 0.015, 2, 8))
      }
      for (let k = 0; k < 4; k++) {
        reeds.push(tube([[s * 0.355, 0.52, -0.18 + k * 0.12], [s * 0.355, 3.48, -0.18 + k * 0.12]], 0.015, 2, 8))
      }
    }
    column.add(
      mesh(bb(0.94, 0.26, 0.82, 0.020, 2, 1.20), 'wood.painted.white', { pos: [0, 0.13, 0], wear: 0.88, seed: 130 + i }),
      mesh(bb(0.84, 0.10, 0.72, 0.014, 2, 1.00), 'brass.tarnished', { pos: [0, 0.31, 0], wear: 0.45, seed: 134 + i }),
      mesh(bb(0.70, 3.28, 0.56, 0.030, 3, 1.10, true), 'wood.varnished.dark', { pos: [0, 2.00, 0], wear: 0.58, seed: 138 + i }),
      mesh(merge(reeds), 'brass.tarnished', { wear: 0.38, seed: 142 + i }),
      mesh(bb(0.76, 0.07, 0.62, 0.010, 2, 0.90), 'brass.tarnished', { pos: [0, 3.68, 0], wear: 0.50, seed: 146 + i }),
      mesh(bb(0.94, 0.20, 0.82, 0.024, 3, 1.20), 'wood.painted.white', { pos: [0, 3.82, 0], wear: 0.66, seed: 150 + i }),
      mesh(bb(1.04, 0.10, 0.92, 0.018, 2, 1.20), 'wood.painted.white', { pos: [0, 3.97, 0], wear: 0.58, seed: 154 + i })
    )
    groundContact(column, { radius: 0.60, radiusZ: 0.54, strength: 0.5 })
    // 시야 리듬. 옛 위치(±2.25, z=0.85)는 데스크 사선을 반쯤 가리면서도 화면 중앙에 뭉쳐
    // 깊이를 만들지 못했다. ±4.05는 반대로 화면 밖으로 밀려 구도에서 빠졌다(1차 실측) —
    // ±3.15 / z=1.45 가 데스크 사선을 비우면서 프레임 안에 남는 지점이다(G10/G9).
    column.position.set(x * 3.15, 0, 1.45)
    root.add(column)
  }
  return root
}

export function makeWindows () {
  const root = group('lobby.windows')
  for (const [i, z] of [1.0, 4.5, 8.0].entries()) {
    const pane = group(`lobby.window.${i}`)
    pane.add(mesh(bevelBox(0.035, 2.15, 2.45, 0.008, 2), 'glass.clear', { pos: [0, 2.25, 0], cast: false }))
    const bars = []
    const tx = []
    for (const y of [1.18, 2.25, 3.32]) {
      bars.push(bb(0.075, 0.065, 2.58, 0.012, 2, 0.70))
      tx.push(xf([0.02, y, 0]))
    }
    for (const dz of [-1.25, 0, 1.25]) {
      bars.push(bb(0.075, 2.25, 0.065, 0.012, 2, 0.70))
      tx.push(xf([0.02, 2.25, dz]))
    }
    pane.add(mesh(merge(bars, tx), 'wood.painted.white', { wear: 0.8, seed: 271 + i }))
    pane.position.set(-W * 0.5 + 0.07, 0, z)
    root.add(pane)
  }
  return root
}

// 엘리베이터 홀 아치. 우측 벽이 벽지 한 장으로 끝나면 개구부가 "벽에 붙인 문짝"이 된다
// (체험 리뷰 G10 "엘리베이터 홀 개구부에 아치"). 밑동 → 임포스트 → 홍예석 13 → 키스톤으로
// 실루엣을 세우고, 그 안쪽에만 광을 남겨 시선 유도를 만든다(G9).
export function makeElevatorArch () {
  const root = group('lobby.elevatorArch')
  const cx = W * 0.5 - 0.16
  const cz = -1.2
  const spring = 2.20
  const R = 1.26
  const N = 13
  const geos = [], mats = []
  for (let i = 0; i < N; i++) {
    const a = -Math.PI * 0.5 + (i + 0.5) / N * Math.PI
    const key = Math.abs(a) < Math.PI / (N * 1.4)
    geos.push(bb(0.32, key ? 0.46 : 0.34, 0.345, 0.012, 2, 0.55))
    mats.push(xf([cx, spring + Math.cos(a) * R, cz + Math.sin(a) * R], [a, 0, 0]))
  }
  root.add(mesh(merge(geos, mats), 'wood.painted.white', { wear: 0.70, seed: 311 }))
  for (const s of [-1, 1]) {
    root.add(
      // 밑동은 아치와 같은 도장면으로 간다. 바니시 목재를 세로결로 세우면 도관이 세로 대시
      // 격자가 되어 기둥 전체가 점무늬로 읽혔다(1차 실측).
      mesh(bb(0.30, 2.06, 0.34, 0.014, 2, 0.95), 'wood.painted.white',
        { pos: [cx, 1.10, cz + s * (R + 0.05)], wear: 0.72, seed: 313 + s }),
      mesh(bb(0.36, 0.14, 0.44, 0.012, 2, 0.55), 'wood.painted.white',
        { pos: [cx, 2.20, cz + s * (R + 0.05)], wear: 0.60, seed: 316 + s }),
      mesh(bb(0.36, 0.16, 0.44, 0.014, 2, 0.55), 'wood.painted.white',
        { pos: [cx, 0.08, cz + s * (R + 0.05)], wear: 0.90, seed: 319 + s })
    )
  }
  return root
}

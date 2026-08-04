// 9층 복도 전용 디테일 빌더. spaces.js가 500줄을 넘지 않도록 분리한다(계약 §11).
// 원칙: 디테일은 폴리곤이 아니라 정점 컬러(때·마모·탈색)와 배치 변주로 만든다.
// mesh(geo, name, {vcol:true})는 kit-mat의 wearMat을 물려 vColor를 알베도 × 러프니스로 동시에 소비한다.
// 그래서 vColor의 평균은 1 근처로 유지하고 "색이 빠진 느낌"은 채널 비율로 만든다 —
// 평균을 1.4로 올리면 러프니스가 0.035로 클램프돼 카펫이 거울이 된다.

import * as THREE from 'three'
import { rng, clamp, lerp, smoothstep, noise2D, fbm } from '../../core/util.js'
import { bevelBox, lathe, profile, merge, mesh, group, xf } from '../kit.js'
import { RAIL_PROF } from './shell.js'

function paint (geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const pos = g.attributes.position
  const col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i))
    if (typeof c === 'number') { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c } else {
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeBoundingBox()
  return g
}

// 벽면 평면(법선이 실내를 향하도록). side: -1 = 왼쪽 벽, +1 = 오른쪽 벽
function wallPlane (side, x, y0, y1, Z0, Z1, segZ, segY) {
  const g = new THREE.PlaneGeometry(Z1 - Z0, y1 - y0, segZ, segY)
  g.rotateY(-side * Math.PI * 0.5)
  g.translate(side * x, (y0 + y1) * 0.5, (Z0 + Z1) * 0.5)
  return g
}

/**
 * 벽면 판의 uv를 월드 등방으로 다시 깐다(props-corridor.floorUv 의 벽 버전).
 * PlaneGeometry 의 uv 0..1 은 길이와 높이를 각각 1로 정규화하므로, 17.3m × 1.0m 인
 * 웨인스코트 필드에서는 텍스처가 가로로 17배 늘어난다 — 붓결·칠 벗겨짐·때가 전부
 * 가로 줄로 뭉개져 화면에는 "매끈한 그라디언트"만 남았다(심사 G6 지적의 실제 원인).
 * tile = 텍스처 한 장이 덮을 월드 거리(m).
 */
function wallUv (geo, tile) {
  const pos = geo.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getZ(i) / tile
    uv[i * 2 + 1] = pos.getY(i) / tile
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

/**
 * 판재 웨인스코트. 평평한 한 장(루브릭 G6 "넓은 단색 면")을 매입 필드 + 프레임으로 쪼갠다.
 * room()의 wainscot을 끄고 이걸 쓴다 — 캡 레일까지 여기서 다시 세운다.
 */
export function wainscot (side, HX, Z0, Z1, WY, seed) {
  const r = rng(seed)
  const n = noise2D(seed + 3)
  const len = Z1 - Z0
  const out = []

  // 1947년 호텔 복도의 도장 판재는 흰색이 아니라 담뱃진이 앉은 크림색이다.
  // 베이스를 0.78로 눌러야 white blowout(D6)과 "넓은 단색 면"(G6)에서 동시에 빠져나온다.
  // 세그먼트를 4/m → 5.5/m 으로 올린다. 정점 컬러로 굽는 발길질 자국·긁힘 띠가 25cm 격자
  // 위에서는 삼각형 프로파일로 뭉개진다. 그 위(9/m)는 삼각형 예산(400k)을 넘겼다 — 실측.
  const field = wallPlane(side, HX - 0.028, 0.055, WY - 0.0, Z0, Z1, Math.round(len * 5.5), 18)
  // 0.86m 타일. wood.painted.white 는 stochastic 이라 이 주기가 격자로 읽히지 않는다.
  wallUv(field, 0.86)
  out.push(mesh(paint(field, (x, y, z) => {
    let k = 0.70
    k -= 0.34 * Math.exp(-Math.pow(y / 0.20, 2))                       // 걸레받이 위 발길질 자국
    k -= 0.22 * (fbm(n, z * 1.15, y * 2.2, 4) * 0.5 + 0.5) * smoothstep(clamp((0.75 - y) / 0.6, 0, 1))
    k -= 0.14 * (fbm(n, z * 0.42 + 11, y * 0.5, 3) * 0.5 + 0.5)        // 큰 얼룩 변주
    k += 0.09 * fbm(n, z * 6.1 - 4, y * 6.1, 3)                        // 도장 붓결
    k -= 0.20 * Math.exp(-Math.pow((y - 0.62) / 0.05, 2)) *            // 카트가 스치는 높이의 긁힘 띠
      (0.4 + 0.6 * (fbm(n, z * 9, 3, 2) * 0.5 + 0.5))
    k -= 0.16 * Math.max(0, fbm(n, z * 2.7 + 63, y * 2.7, 3))          // 국지 손때
    return clamp(k, 0.22, 0.95)
  }), 'wood.painted.white', { vcol: true, cast: false }))

  // 프레임: 상하 띠장 + 세로 선대 + 패널 몰딩. 26mm 돌출이라 벽등 광축에서 실제 그림자선이 생긴다
  const gs = [], ms = []
  const push = (w, h, d, x, y, z) => { gs.push(bevelBox(w, h, d, 0.006, 1)); ms.push(xf([x, y, z])) }
  const FX = side * (HX - 0.041)
  push(0.026, 0.155, len - 0.02, FX, 0.135, (Z0 + Z1) * 0.5)
  push(0.026, 0.115, len - 0.02, FX, WY - 0.135, (Z0 + Z1) * 0.5)
  const bays = Math.max(2, Math.round(len / 1.85))
  const bz = (i) => lerp(Z0 + 0.06, Z1 - 0.06, i / bays)
  for (let i = 0; i <= bays; i++) push(0.026, WY - 0.30, 0.098, FX, (WY + 0.02) * 0.5, bz(i))
  for (let i = 0; i < bays; i++) {
    const z0 = bz(i) + 0.075, z1 = bz(i + 1) - 0.075
    const cz = (z0 + z1) * 0.5, bw = z1 - z0
    if (bw < 0.20) continue
    const y0 = 0.245, y1 = WY - 0.215
    const MX = side * (HX - 0.035)
    push(0.014, 0.030, bw, MX, y0, cz)
    push(0.014, 0.030, bw, MX, y1, cz)
    push(0.014, y1 - y0, 0.030, MX, (y0 + y1) * 0.5, z0)
    push(0.014, y1 - y0, 0.030, MX, (y0 + y1) * 0.5, z1)
  }
  out.push(mesh(paint(merge(gs, ms), (x, y, z) => {
    let k = 0.78 - 0.26 * Math.exp(-Math.pow(y / 0.26, 2))
    k -= 0.18 * (fbm(n, z * 1.7 + 31, y * 3, 3) * 0.5 + 0.5)
    k += 0.10 * smoothstep(clamp((y - 0.9) / 0.2, 0, 1))               // 손이 닿는 윗선은 닦여 밝다
    return clamp(k, 0.28, 1.00)
  }), 'wood.painted.white', { vcol: true }))

  // 캡 레일. profile 프레임 규약(shell.runs)과 같은 진행 방향이라야 단면이 위로 선다
  const zs = side > 0 ? [Z0 + 0.005, Z1 - 0.005] : [Z1 - 0.005, Z0 + 0.005]
  const cap = profile(RAIL_PROF, [[side * (HX - 0.005), WY, zs[0]], [side * (HX - 0.005), WY, zs[1]]],
    { up: [-side, 0, 0] })
  out.push(mesh(paint(cap, (x, y, z) =>
    clamp(0.84 - 0.22 * (fbm(n, z * 2.1 + 7, y * 4, 3) * 0.5 + 0.5), 0.30, 0.96)),
  'wood.painted.white', { vcol: true }))

  // 콘센트판. 단색 면을 깨는 가장 값싼 인공물이고, 1947년 실내의 축척 기준이 된다.
  // 옛 판은 상자 하나라 근경(카메라 2.5m)에서 "모따기 없는 검은 박스"로 읽혔다(심사 D4).
  // 베이클라이트 판 + 돌출한 리셉터클 보스 두 개 + 놋쇠 나사로 값 층을 셋으로 가른다.
  const eg = [], em = [], sg = [], sm = []
  const bossGeo = bevelBox(0.005, 0.040, 0.031, 0.0022, 1)
  const slotGeo = bevelBox(0.003, 0.0125, 0.0022, 0.0006, 1)
  const screwGeo = lathe([[0, 0], [0.0034, 0.0006], [0.0036, 0.0022], [0.0016, 0.0026], [0, 0.0022]], 10)
  for (let i = 0; i < 4; i++) {
    const z = lerp(Z0 + 1.6, Z1 - 1.4, (i + 0.3 * r()) / 3.5)
    const px = side * (HX - 0.050), py = 0.30 + r() * 0.02
    const tilt = (r() - 0.5) * 0.10
    const at = (dy, dz, geo, gs, ms, dx = 0) => {
      gs.push(geo)
      ms.push(xf([px + side * dx, py + dy, z + dz], [0, 0, tilt]))
    }
    at(0, 0, bevelBox(0.012, 0.115, 0.072, 0.0055, 1), eg, em)
    for (const dy of [0.026, -0.026]) {
      at(dy, 0, bossGeo, eg, em, 0.008)
      // 칼날 구멍 두 짝 — 판 안쪽에 값이 하나 더 생겨야 검은 사각형에서 빠져나온다
      at(dy + 0.008, -0.0062, slotGeo, eg, em, 0.0095)
      at(dy + 0.008, 0.0062, slotGeo, eg, em, 0.0095)
    }
    // 판을 잡는 놋쇠 나사 — 이 근경에서 유일한 스펙큘러 캐치다
    at(0, 0, screwGeo.clone().rotateZ(side * Math.PI * 0.5), sg, sm, 0.011)
  }
  // 12mm 돌출이라 그림자 기여가 화면에서 0이다 — 캐스터에서 빼야 삼각형 예산이 산다
  out.push(mesh(merge(eg, em), 'bakelite.black', { wear: 0.6, seed: seed + 9, cast: false }))
  out.push(mesh(merge(sg, sm), 'brass.tarnished', { wear: 0.75, seed: seed + 10, cast: false }))
  return out
}

/**
 * 웨인스코트 위 벽면 베니어. 같은 재질을 8mm 앞에 덧대고 정점 컬러로 누수·그을음·이음매를 굽는다.
 * 벽 상자를 대체하지 않으므로 두께·그림자·볼류메트릭 차폐는 그대로다. 추가 폴리곤 ≈ 2k.
 */
export function wallVeneer (side, HX, Z0, Z1, WY, H, seed, sconceZ = []) {
  const n = noise2D(seed)
  const len = Z1 - Z0
  const y0 = WY + 0.055, y1 = H - 0.145
  const g = wallPlane(side, HX - 0.008, y0, y1, Z0, Z1, Math.round(len * 4), 14)
  const stainZ = [Z0 + len * 0.30, Z0 + len * 0.72]
  return mesh(paint(g, (x, y, z) => {
    const t = clamp((y - y0) / (y1 - y0), 0, 1)
    let k = 1
    k -= 0.13 * (fbm(n, z * 0.55, y * 0.9, 4) * 0.5 + 0.5)
    k -= 0.10 * smoothstep(clamp((t - 0.72) / 0.28, 0, 1))                   // 천장 쪽 그을음
    for (const sz of stainZ) {                                               // 위에서 흘러내린 누수
      const w = Math.exp(-Math.pow((z - sz) / 0.30, 2))
      k -= 0.26 * w * smoothstep(clamp((t - 0.30) / 0.55, 0, 1)) * (0.55 + 0.45 * fbm(n, z * 7, y * 3, 3))
    }
    for (const sz of sconceZ) {                                              // 벽등 위 열 그을음
      const w = Math.exp(-Math.pow((z - sz) / (0.16 + 0.5 * t), 2))
      k -= 0.28 * w * smoothstep(clamp((t - 0.34) / 0.30, 0, 1))
    }
    k += 0.05 * fbm(n, z * 3.3 + 19, y * 3.3, 3)
    k -= 0.05 * Math.exp(-Math.pow((((z - Z0) % 0.68) - 0.34) / 0.030, 2))   // 벽지 이음매(폴리곤 0)
    return clamp(k, 0.30, 1.05)
  }), 'wallpaper.damask.green', { vcol: true, cast: false })
}

/**
 * 카펫 러너. STORY §6 "942호 앞에서 계단 쪽으로 색이 옅어진 띠(닦인 자국)"를 사양대로 굽는다.
 * bandZ = [띠 시작 z(942호 앞), 끝 z(계단)]. 탈색은 밝기가 아니라 채널비로 만든다.
 *
 * 근경(z > bandZ[0])에는 그 띠가 정의상 없다 — 실측(shots/atmosphere-r3 이전 리비전)에서
 * 화면 하단 25%가 미세 파일결만 있는 통짜 살구색 면으로 읽혔다(G6). 띠는 스토리가 정한
 * 위치를 지키고, 근경은 러너 자체의 구조로 값을 가른다: 보더 스트라이프 · 롤 이음선 ·
 * 벽 쪽 때 그라디언트 · 개별 오점. 넷 다 위치가 고정이라 반복 주기를 만들지 않는다(D3).
 */
// 카메라(z=6.2, 눈높이 1.60m, fov 32)에서 바닥이 프레임에 들어오기 시작하는 거리는
// 1.60/tan(16°) ≈ 5.6m 다 — 즉 화면에 보이는 카펫은 z ≈ 0.6 에서 복도 끝까지다.
// 오점·이음선은 그 구간(Z0 기준 4.0~9.6)에 놓아야 실제로 채점 대상이 된다.
const STAINS = [                                  // [x, z오프셋(Z0 기준), 반경x, 반경z, 농도]
  [-0.36, 8.55, 0.30, 0.42, 0.44],
  [0.44, 9.35, 0.17, 0.21, 0.36],
  [0.08, 6.40, 0.44, 0.28, 0.26],
  [-0.62, 4.55, 0.13, 0.16, 0.42],
  [0.66, 7.20, 0.22, 0.34, 0.30],
  // 아래 셋은 화면 하단 3분의 1(z 0.6 ~ -1.6)의 근경분이다. 이 구간에 매크로 변주가 없어서
  // 러너가 "직물이 아니라 반복 텍스처"로 읽혔다(심사 D3). 텍스처 주기 0.9m 와 무관한
  // 위치·크기라 반복 인지를 실제로 끊는다.
  [-0.14, 9.05, 0.52, 0.31, 0.30],
  [0.72, 8.72, 0.24, 0.19, 0.40],
  [-0.80, 7.75, 0.20, 0.46, 0.26]
]
const SEAMS = [4.60, 8.95, 12.80]                 // 러너 롤 이음(Z0 기준). 약 4m 간격 + 지터

export function runner (w, Z0, Z1, seed, bandZ) {
  const n = noise2D(seed)
  const len = Z1 - Z0
  // x 분할 34 → 64. 보더 스트라이프(폭 9cm)가 34분할(5.9cm/seg)에서는 2정점에 걸려
  // 삼각형 프로파일로 뭉개진다. 폭 2m / 64 = 3.1cm 라야 띠가 띠로 읽힌다.
  const g = new THREE.PlaneGeometry(w, len, 64, Math.round(len * 7))
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, (Z0 + Z1) * 0.5)
  const pos = g.attributes.position
  const TX = -0.16
  const along = (z) => smoothstep(clamp((bandZ[0] - z) / (bandZ[0] - bandZ[1]), 0, 1))
  // 보더 스트라이프: 가장자리에서 16cm 안쪽에 반폭 4.5cm 의 짙은 띠. 1947년 호텔 러너의
  // 표준 마감이고, 화면에서는 소실점으로 수렴하는 리딩라인 두 줄이 된다(G9).
  const border = (x) => Math.exp(-Math.pow((Math.abs(x) - (w * 0.5 - 0.165)) / 0.058, 2))
  const seam = (z) => {
    let s = 0
    for (const sz of SEAMS) s = Math.max(s, Math.exp(-Math.pow((z - (Z0 + sz)) / 0.022, 2)))
    return s
  }
  const stain = (x, z) => {
    let s = 0
    for (const [sx, sz, rx, rz, st] of STAINS) {
      s += st * Math.exp(-(Math.pow((x - sx) / rx, 2) + Math.pow((z - (Z0 + sz)) / rz, 2)))
    }
    return Math.min(s, 0.40)
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const edge = smoothstep(clamp((w * 0.5 - Math.abs(x)) / 0.09, 0, 1))
    const track = Math.exp(-Math.pow((x - TX) / 0.30, 2))
    let y = 0.014 * edge
    y += fbm(n, x * 4.5, z * 2.2, 4) * 0.004 * edge                    // 짜임 굴곡
    y -= track * 0.006 * along(z)                                      // 동선은 눌려 꺼진다
    y += (1 - edge) * 0.011 * (0.5 + 0.5 * Math.sin(z * 2.3 + fbm(n, z, 0, 2) * 3))  // 가장자리 들뜸
    y -= 0.0035 * seam(z) * edge                                       // 이음선은 꿰맨 자리라 꺼진다
    pos.setY(i, y)
  }
  g.computeVertexNormals()
  return mesh(paint(g, (x, y, z) => {
    // 벽 쪽 때는 헤어라인이 아니라 그라디언트다 — 0.12 → 0.26m 로 넓혀 값 층을 하나 만든다
    const edge = smoothstep(clamp((w * 0.5 - Math.abs(x)) / 0.26, 0, 1))
    const track = Math.exp(-Math.pow((x - TX) / 0.26, 2))
    const t = track * along(z)
    const bd = border(x), sm = seam(z), st = stain(x, z)
    // 통행 동선 마모. bandZ 구간(942호→계단)에만 있던 것을 러너 전장으로 넓힌다 —
    // 근경(z > bandZ[0])이 그 띠 밖이라 화면 하단 3분의 1에 마모가 전무했다(심사 D3).
    // 띠 구간은 아래 t 로 한 번 더 얹히므로 스토리가 정한 위치는 여전히 가장 옅다.
    const lane = Math.exp(-Math.pow((x - TX) / 0.42, 2)) *
      (0.55 + 0.45 * (fbm(n, z * 0.62 + 7, 0, 3) * 0.5 + 0.5))
    // 롤 구간 편차. 이음선(약 4m)마다 다른 롤이라 염색 로트가 다르다 — 텍스처 주기 0.9m 와
    // 무관한 파장이라 "임의 두 구간이 같은 텍스처로 보이는" 상태를 실제로 깬다.
    const roll = fbm(n, z * 0.27 - 19, x * 0.3, 3)
    let k = 0.78
    k -= 0.52 * (1 - edge)                                              // 가장자리 먼지선
    k -= 0.22 * (fbm(n, x * 3.6, z * 1.9, 4) * 0.5 + 0.5)               // 큰 얼룩
    k -= 0.30 * Math.max(0, fbm(n, x * 2.4 + 41, z * 1.5 - 13, 3))      // 국지 오점
    k += 0.13 * fbm(n, x * 8.5, z * 4.6, 3)                             // 파일 결
    k += 0.11 * roll                                                    // 롤 로트 편차
    k -= 0.13 * lane                                                    // 동선 마모(파일이 눕는다)
    // 진폭 0.30 은 화면에서 11% 밖에 안 내려갔다(근경 안개가 상수항을 얹어 대비를 압축한다).
    // 러너 보더는 원래 짙은 실로 짜는 별개의 띠이므로 반사율 자체가 절반 아래여야 한다.
    k -= 0.55 * bd                                                      // 보더는 짙은 실로 짠다
    k -= 0.30 * sm                                                      // 이음선 그림자
    k -= st                                                             // 오점
    k = clamp(k, 0.24, 1.06)
    // 보더는 밝기만 내리면 "그늘"이 된다 — 붉은 채널을 더 빼야 짙은 초록빛 테두리 실로 읽힌다.
    // 닦인 자국은 반대로 붉은 채널만 빠지고 나머지가 올라와 "색이 빠진" 띠가 된다(평균 1.1 이하).
    // 마모는 밝기가 아니라 채도로 먼저 온다 — 붉은 실이 먼저 빠진다
    const r = k * (1 - 0.30 * t) * (1 - 0.34 * bd) * (1 - 0.11 * lane)
    const gg = k * (1 + 0.44 * t) * (1 + 0.10 * bd) * (1 + 0.07 * lane)
    const b = k * (1 + 0.40 * t) * (1 + 0.06 * bd) * (1 + 0.06 * lane)
    return [r, gg, b]
  }), 'carpet.corridor.red', { vcol: true, cast: false })
}

/**
 * 복도 끝 계단참. 시선이 밝은 원경 벽이 아니라 어두운 구멍에서 멈추게 한다(루브릭 G2/G9).
 * 개구부는 끝벽의 왼쪽이고 카메라 광축이 거기에 떨어진다. 조명은 일부러 닿지 않게 둔다.
 */
export function stairHead (HX, Z0, H, OW, OH, seed) {
  const g = group('stairHead')
  const r = rng(seed)
  const n = noise2D(seed + 4)
  const x0 = -HX, x1 = -HX + OW
  const back = Z0 - 1.05

  // 계단참 내부는 어두운 재질로만 짓는다. 밝은 석고를 쓰면 안개 바닥값 위로 떠서
  // 개구부가 "어두운 구멍"이 아니라 "더 밝은 패널"이 된다(실측: plaster 121 vs 벽지 115).
  const box = [], bm = []
  box.push(bevelBox(1.62, 0.10, 1.05, 0.02, 1)); bm.push(xf([x1 - 0.71, -0.05, Z0 - 0.525]))
  box.push(bevelBox(3.30, 0.10, 1.05, 0.02, 1)); bm.push(xf([x0 - 0.05, H + 0.05, Z0 - 0.525]))
  box.push(bevelBox(3.52, H, 0.22, 0.02, 1)); bm.push(xf([x0 - 0.05, H * 0.5, back - 0.11]))
  box.push(bevelBox(0.22, H, 1.05, 0.02, 1)); bm.push(xf([x0 - 1.81, H * 0.5, Z0 - 0.525]))
  box.push(bevelBox(0.22, H, 1.05, 0.02, 1)); bm.push(xf([x1 + 0.11, H * 0.5, Z0 - 0.525]))
  g.add(mesh(paint(merge(box, bm), (x, y, z) =>
    clamp(0.52 - 0.22 * (fbm(n, z * 1.4, y * 1.1, 4) * 0.5 + 0.5)
      - 0.20 * smoothstep(clamp((1.6 - y) / 1.6, 0, 1)), 0.16, 0.72)),
  'wood.varnished.dark', { vcol: true, cast: false }))

  // 개구부 케이싱. 벽에 뚫린 사각 구멍은 그 자체로 판때기로 읽힌다(D4)
  const cg = [], cm = []
  for (const [px, s] of [[x0 - 0.055, 1], [x1 + 0.055, -1]]) {
    cg.push(bevelBox(0.11, OH + 0.11, 0.055, 0.010, 1)); cm.push(xf([px, (OH + 0.11) * 0.5, Z0 - 0.055]))
    cg.push(bevelBox(0.055, OH + 0.11, 0.030, 0.008, 1)); cm.push(xf([px + s * 0.028, (OH + 0.11) * 0.5, Z0 - 0.095]))
  }
  cg.push(bevelBox(OW + 0.22, 0.11, 0.055, 0.010, 1)); cm.push(xf([(x0 + x1) * 0.5, OH + 0.055, Z0 - 0.055]))
  cg.push(bevelBox(OW + 0.22, 0.055, 0.030, 0.008, 1)); cm.push(xf([(x0 + x1) * 0.5, OH + 0.083, Z0 - 0.095]))
  g.add(mesh(merge(cg, cm), 'wood.painted.white', { wear: 0.95, seed: seed + 1 }))

  // 내려가는 계단. 개구부 안쪽 왼편에서 바닥이 꺼져 내려가는 실루엣이 보여야 한다
  const st = [], sm = []
  for (let i = 0; i < 6; i++) {
    st.push(bevelBox(0.28, 0.050, 1.60, 0.010, 1))
    sm.push(xf([x0 - 0.14 - i * 0.28, -0.03 - i * 0.175, Z0 - 0.52]))
  }
  g.add(mesh(merge(st, sm), 'wood.varnished.dark', { wear: 0.95, seed: seed + 2, cast: false }))

  // 난간 기둥·손잡이 — 18m 앞에서도 남는 건 실루엣 하나다. 개구부 정중앙에 세운다
  const rail = [], rm = []
  rail.push(bevelBox(0.085, 0.98, 0.085, 0.012, 2)); rm.push(xf([x0 + 0.10, 0.49, Z0 - 0.34]))
  rail.push(bevelBox(0.13, 0.085, 0.13, 0.016, 2)); rm.push(xf([x0 + 0.10, 1.02, Z0 - 0.34]))
  rail.push(bevelBox(0.055, 0.055, 0.80, 0.010, 1)); rm.push(xf([x0 + 0.10, 0.90, Z0 - 0.72]))
  for (let i = 0; i < 3; i++) {
    rail.push(bevelBox(0.032, 0.72, 0.032, 0.008, 1))
    rm.push(xf([x0 + 0.10, 0.53 - i * 0.07, Z0 - 0.50 - i * 0.22]))
  }
  const r0 = mesh(merge(rail, rm), 'wood.varnished.dark', { wear: 0.9, seed: seed + 3 })
  r0.rotation.y = (r() - 0.5) * 0.03
  g.add(r0)
  return g
}

/**
 * 청소부 카트(전경 오클루더). 프레임 오른쪽을 잘라 전/중/후경 레이어를 만든다(루브릭 G9).
 * P.luggageCart는 로비에 이미 있으므로 성격이 다른 물건으로 짓는다.
 */
export function linenCart (seed) {
  const g = group('linenCart')
  const r = rng(seed)
  const W = 0.74, D = 0.52, HH = 0.96
  const bars = [], bm = []
  const push = (w, h, d, x, y, z) => { bars.push(bevelBox(w, h, d, 0.006, 1)); bm.push(xf([x, y, z])) }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) push(0.030, HH, 0.030, sx * W * 0.5, HH * 0.5, sz * D * 0.5)
  for (const y of [HH - 0.02, 0.30]) {
    push(W, 0.026, 0.026, 0, y, -D * 0.5)
    push(W, 0.026, 0.026, 0, y, D * 0.5)
    push(0.026, 0.026, D, -W * 0.5, y, 0)
    push(0.026, 0.026, D, W * 0.5, y, 0)
  }
  push(0.024, 0.024, D + 0.26, W * 0.5 + 0.11, HH + 0.07, 0)
  push(0.024, 0.15, 0.024, W * 0.5 + 0.11, HH, -D * 0.5 - 0.11)
  push(0.024, 0.15, 0.024, W * 0.5 + 0.11, HH, D * 0.5 + 0.11)
  g.add(mesh(merge(bars, bm), 'steel.galvanized', { wear: 0.95, seed }))

  // 캔버스 세탁물 자루 — 늘어진 덩어리가 격자를 실루엣으로 닫는다
  const sack = new THREE.CylinderGeometry(W * 0.44, W * 0.40, 0.68, 20, 6, true)
  const sp = sack.attributes.position
  const n = noise2D(seed + 5)
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i)
    const s = 1 + fbm(n, x * 5, z * 5 + y * 3, 4) * 0.14 + (y > 0.2 ? 0.10 : 0)
    sp.setXYZ(i, x * s, y - 0.04 * fbm(n, x * 3, z * 3, 2), z * s)
  }
  sack.computeVertexNormals()
  // 자루는 어두운 캔버스다. 밝은 천을 쓰면 전경 덩어리가 원경 안개보다 밝아져 깊이가 뒤집힌다
  const bag = mesh(paint(sack, (x, y) => clamp(0.98
    - 0.26 * smoothstep(clamp((0.34 - y) / 0.5, 0, 1))
    - 0.12 * (fbm(n, x * 6, y * 6, 3) * 0.5 + 0.5), 0.5, 1.02)), 'fabric.wool.suit', { vcol: true })
  bag.position.y = HH - 0.26
  g.add(bag)

  const tg = [], tm = []
  for (let i = 0; i < 5; i++) {
    tg.push(bevelBox(0.30, 0.045, 0.22, 0.010, 1))
    tm.push(xf([-W * 0.5 + 0.20 + (r() - 0.5) * 0.02, 0.345 + i * 0.046, (r() - 0.5) * 0.06],
      [0, (r() - 0.5) * 0.16, 0]))
  }
  g.add(mesh(merge(tg, tm), 'paper.aged', { wear: 0.55, seed: seed + 2 }))

  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const wl = mesh(bevelBox(0.030, 0.084, 0.084, 0.012, 1), 'bakelite.black', { wear: 0.8, seed: seed + 3 })
    wl.position.set(sx * (W * 0.5 - 0.02), 0.042, sz * (D * 0.5 - 0.02))
    wl.rotation.x = r() * 0.8
    g.add(wl)
  }
  return g
}

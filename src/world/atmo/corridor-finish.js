// 9층 복도 아트 마감. corridor-detail.js(구조 디테일)와 파일을 나눠 두 작업이 서로를 덮지 않게 한다.
// 여기 있는 것은 전부 "이미 선 벽·바닥에 덧대는 것"이다 — 셸·웨인스코트·기구 자체는 건드리지 않는다.
//
// 세 가지 문제만 다룬다.
//   1) 복도 끝이 값 차이가 없어 개구부·벽지·판재가 한 장의 납작한 쿼드로 읽힌다(G6/D4)
//   2) 벽지 오지 격자가 변주 없이 세로로 반복된다(D3 실격)
//   3) 벽/바닥 접합·걸레받이 하단·라디에이터 접지에 컨택트 섀도가 없어 면이 서로 떠 있다(G4/D5)
//
// 값 규약은 corridor-detail.js와 같다: 정점 컬러의 평균은 1 근처로 두고 "색이 빠진 느낌"은
// 채널비로 만든다. 평균을 1.4로 올리면 wearMat이 러프니스를 0.035로 클램프해 벽지가 거울이 된다.

import * as THREE from 'three'
import { rng, clamp, smoothstep, noise2D, fbm } from '../../core/util.js'
import { bevelBox, profile, merge, mesh, group, xf, groundContact } from '../kit.js'
import { RAIL_PROF } from './shell.js'
import * as P from '../props.js'

function tint (geo, fn) {
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

/**
 * 곱연산 컨택트 데칼(kit.groundContact)을 벽면·바닥 접합부에도 그대로 쓴다.
 * 기본 방향은 수평(법선 +Y)이고, rot을 주면 벽면 얼룩·접합선 AO가 된다.
 * radius가 로컬 X(수평 데칼에선 월드 X, 벽 데칼에선 월드 Z), radiusZ가 로컬 Y를 잡는다.
 */
function decal (parent, o) {
  const m = groundContact(parent, o)
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2])
  return m
}

/**
 * 복도 끝벽 마감. 지금은 개구부·벽지·판재의 출력값이 서로 붙어 15m 앞이 한 장의 쿼드로 읽힌다.
 * 캡레일·패널 몰딩·액자로 가로선을 넣어 값 층을 세 개로 가른다.
 * OW 오른쪽(x = -HX+OW ~ HX)만 다룬다 — 왼쪽은 계단참 개구부다.
 */
export function endWall (HX, Z0, WY, H, OW, seed) {
  const g = group('corridor.endWall')
  const r = rng(seed)
  const n = noise2D(seed + 2)
  const x0 = -HX + OW, x1 = HX
  const cx = (x0 + x1) * 0.5, w = x1 - x0
  const FZ = Z0 + 0.062                       // 판재 앞면(Z0+0.0555)보다 조금 앞

  // 끝벽 베니어. 화면에서 가장 큰 단일 면인데 벽지 무늬도 얼룩도 없는 균질 청회색이라
  // 이 영역 하나가 G6를 무너뜨린다(심사 지적). 측벽 wallVeneer 와 같은 수법으로 벽지를
  // 12mm 앞에 덧대고, 끝벽 전용 매크로 변주를 정점 컬러로 굽는다.
  // uv 0..1 이 1.66m × 1.93m 를 덮으므로 종횡비가 거의 1이다 — 측벽처럼 늘어나지 않는다.
  {
    const vy0 = WY + 0.06, vy1 = H - 0.02
    const vg = new THREE.PlaneGeometry(w - 0.02, vy1 - vy0, 26, 30)
    vg.translate(cx, (vy0 + vy1) * 0.5, Z0 + 0.012)
    // 액자 자국 — 오래 걸려 있던 자리만 벽지가 덜 바래 밝고, 둘레에 먼지선이 남는다
    const gx = x0 + 1.02, gy = 2.50, gw = 0.28, gh = 0.34
    // 위에서 흘러내린 누수 두 줄기. 천장에서 시작해 아래로 갈수록 퍼지고 옅어진다
    const drips = [[x0 + 0.30, 0.34], [x0 + 0.92, 0.20]]
    g.add(mesh(tint(vg, (x, y) => {
      // 15m 앞이라 안개 인스캐터가 상수항을 얹어 대비를 절반으로 압축한다 — 1차 시도의
      // 진폭(0.10~0.30)은 화면에서 거의 사라졌다. 실측 후 1.5배로 올린 값이다.
      let k = 1
      k -= 0.17 * (fbm(n, x * 0.9 + 5, y * 0.8, 4) * 0.5 + 0.5)              // 저주파 얼룩 구획
      k -= 0.19 * smoothstep(clamp((y - (H - 0.65)) / 0.6, 0, 1))            // 천장 쪽 그을음
      k -= 0.30 * Math.exp(-Math.pow((y - (WY + 0.10)) / 0.13, 2))           // 캡레일 위 때 띠
      for (const [dx, ds] of drips) {                                         // 습기 얼룩
        const spread = (0.09 + 0.16 * clamp((H - y) / (H - WY), 0, 1)) * ds * 3.4
        const wgt = Math.exp(-Math.pow((x - dx) / spread, 2)) *
          smoothstep(clamp((y - (WY + 0.35)) / 1.1, 0, 1))
        k -= 0.46 * wgt * (0.55 + 0.45 * (fbm(n, x * 9 + 3, y * 3.5, 3) * 0.5 + 0.5))
      }
      const inG = Math.max(Math.abs(x - gx) / gw, Math.abs(y - gy) / gh)
      k += 0.24 * (1 - smoothstep(0.94, 1.02, inG))                          // 덜 바랜 사각형
      k -= 0.30 * Math.exp(-Math.pow((inG - 1.01) / 0.05, 2))                // 둘레 먼지선
      k -= 0.13 * Math.max(0, fbm(n, x * 4.4 + 27, y * 4.4, 3))              // 벽지 균열·들뜸
      k = clamp(k, 0.34, 1.22)
      // 습기가 든 자리는 밝기만이 아니라 색이 빠진다 — 초록 벽지가 누렇게 죽는다
      const damp = clamp((1 - k) * 1.4, 0, 0.5)
      return [k * (1 + 0.14 * damp), k * (1 - 0.06 * damp), k * (1 - 0.20 * damp)]
    }), 'wallpaper.damask.green', { vcol: true, cast: false }))
    // 자국을 남긴 못 — 사각형 자국만 있고 못이 없으면 얼룩으로 읽힌다(N6)
    const nail = mesh(bevelBox(0.010, 0.008, 0.012, 0.0025, 1), 'steel.rusted',
      { pos: [gx, gy + gh + 0.03, Z0 + 0.020], wear: 0.9, seed: seed + 7, cast: false })
    g.add(nail)
  }

  // 캡레일. 측벽 캡레일과 같은 단면이라 끝벽에서 선이 끊기지 않고 이어진다
  g.add(mesh(tint(profile(RAIL_PROF, [[x0 - 0.02, WY, Z0 + 0.012], [x1, WY, Z0 + 0.012]], { up: [0, 0, 1] }),
    (x, y) => clamp(0.86 - 0.20 * (fbm(n, x * 2.4, y * 5, 3) * 0.5 + 0.5), 0.34, 0.98)),
  'wood.painted.white', { vcol: true }))

  // 판재 위 매입 패널 몰딩 두 짝. 넓은 단색 면(G6)을 가로·세로로 자른다
  const pg = [], pm = []
  const push = (pw, ph, pd, px, py) => { pg.push(bevelBox(pw, ph, pd, 0.005, 1)); pm.push(xf([px, py, FZ])) }
  for (const [bx, bw] of [[x0 + 0.42, 0.70], [x0 + 1.24, 0.62]]) {
    const y0 = 0.235, y1 = WY - 0.20
    push(bw, 0.026, 0.016, bx, y0)
    push(bw, 0.026, 0.016, bx, y1)
    push(0.026, y1 - y0, 0.016, bx - bw * 0.5, (y0 + y1) * 0.5)
    push(0.026, y1 - y0, 0.016, bx + bw * 0.5, (y0 + y1) * 0.5)
  }
  g.add(mesh(tint(merge(pg, pm), (x, y) =>
    clamp(0.80 - 0.30 * Math.exp(-Math.pow(y / 0.30, 2)) - 0.16 * (fbm(n, x * 3 + 9, y * 4, 3) * 0.5 + 0.5), 0.26, 0.98)),
  'wood.painted.white', { vcol: true }))

  // 액자 두 점 — 끝벽 벽지 면적을 끊고, 15m 앞에 인공물의 실루엣을 하나 남긴다(G6/N6)
  for (const [i, [px, py, pw, ph]] of [[x0 + 0.52, 1.92, 0.40, 0.52], [x0 + 1.22, 1.74, 0.30, 0.38]].entries()) {
    const f = P.framedPicture(seed + 11 + i, { w: pw, h: ph }).root
    f.position.set(px, py, Z0 + 0.03)
    f.rotation.z = (r() - 0.5) * 0.06
    g.add(f)
  }

  // 스위치판. 1947년 실내의 축척 기준이자, 개구부 옆 단색 면을 깨는 가장 값싼 인공물
  const sw = mesh(bevelBox(0.076, 0.118, 0.014, 0.004, 1), 'bakelite.black', { wear: 0.6, seed: seed + 3 })
  sw.position.set(x0 + 0.16, 1.28, Z0 + 0.045)
  sw.rotation.z = (r() - 0.5) * 0.08
  g.add(sw)

  // 벽지/천장 접합 그을음, 캡레일 아래 먼지선. 두 가로선이 값 층을 나눈다
  decal(g, { x: cx, y: H - 0.16, z: Z0 + 0.028, radius: w * 0.52, radiusZ: 0.22, strength: 0.40, rot: [0, 0, 0] })
  decal(g, { x: cx, y: WY - 0.06, z: Z0 + 0.030, radius: w * 0.50, radiusZ: 0.10, strength: 0.34, rot: [0, 0, 0] })
  return g
}

/**
 * 계단참 개구부를 "더 밝은 패널"이 아니라 "어두운 구멍"으로 만든다.
 * 안쪽 벽은 이미 어두운 재질이지만 넓고 균질해서 값이 끝벽과 붙는다 — 곱연산 데칼로 안쪽을
 * 한 단 더 내리고, 가로 트림 두 줄로 3.5m 폭의 빈 면을 자른다.
 */
export function stairWell (HX, Z0, H, OW, OH, seed) {
  const g = group('corridor.stairWell')
  const n = noise2D(seed + 6)
  const BZ = Z0 - 1.05                        // 계단참 뒷벽 앞면
  const x0 = -HX, x1 = -HX + OW

  // 뒷벽 가로 트림(체어레일 + 걸레받이). 어두운 목재라 개구부가 밝아지지 않는다
  const tg = [], tm = []
  tg.push(bevelBox(2.30, 0.052, 0.030, 0.008, 1)); tm.push(xf([x0 - 0.30, 0.92, BZ + 0.018]))
  tg.push(bevelBox(2.30, 0.030, 0.030, 0.006, 1)); tm.push(xf([x0 - 0.30, 0.86, BZ + 0.014]))
  tg.push(bevelBox(2.30, 0.135, 0.026, 0.006, 1)); tm.push(xf([x0 - 0.30, 0.068, BZ + 0.016]))
  // 모서리 세로 몰딩 — 뒷벽 상자 이음의 직선을 건축 요소로 덮는다
  tg.push(bevelBox(0.052, H - 0.1, 0.038, 0.008, 1)); tm.push(xf([x1 + 0.02, (H - 0.1) * 0.5, BZ + 0.020]))
  g.add(mesh(tint(merge(tg, tm), (x, y) =>
    clamp(0.62 - 0.24 * (fbm(n, x * 2.2, y * 3.1, 3) * 0.5 + 0.5) - 0.16 * smoothstep(clamp((0.8 - y) / 0.8, 0, 1)), 0.18, 0.80)),
  'wood.varnished.dark', { vcol: true, cast: false }))

  // 뒷벽을 한 단 내린다. 개구부 안이 끝벽보다 어두워야 구멍으로 읽히지만(G2/G9), 너무 누르면
  // 470×1080px가 통째로 빈 검은 면이 돼 이번엔 G6에 걸린다 — 트림·계단 실루엣이 살 만큼만 누른다.
  decal(g, { x: x0 - 0.25, y: 1.30, z: BZ + 0.008, radius: 1.55, radiusZ: 1.45, strength: 0.40, rot: [0, 0, 0] })
  // 개구부 문턱 AO. 바닥이 복도에서 계단참으로 넘어가는 선이 없으면 개구부가 벽에 붙은 그림이 된다
  decal(g, { x: (x0 + x1) * 0.5, y: 0.006, z: Z0 - 0.30, radius: OW * 0.62, radiusZ: 0.42, strength: 0.72 })
  return g
}

/**
 * 벽지 반복 파괴. 오지 격자가 세로로 4회 이상 변주 없이 반복돼 D3 실격이다.
 * 텍스처의 타일링 자체는 MATERIALS 소유라, 벽 앞에 실제 부재를 덧대 격자의 주기를 깬다:
 * 픽처레일(가로 분할) · 걸린 액자 · 들뜬 이음매 · 누수 얼룩(저주파 값 변화).
 * picZ = 이 벽에 액자를 걸 z. 벽등·문과 겹치지 않는 자리를 호출자가 준다.
 */
export function wallBreak (side, HX, Z0, Z1, WY, H, seed, picZ) {
  const g = group(`corridor.break${side > 0 ? 'R' : 'L'}`)
  const r = rng(seed)
  const n = noise2D(seed + 8)
  const ROT = -side * Math.PI * 0.5            // 데칼 평면(+Z 법선)을 벽면으로 눕힌다
  const y0 = WY + 0.06, y1 = H - 0.16
  const len = Z1 - Z0
  const at = (i, n, jit) => Z0 + 0.9 + (len - 1.8) * ((i + 0.20 + jit * 0.60) / n)

  // 픽처레일. 1947년 호텔 복도의 표준 부재이고, 벽지 격자의 세로 반복을 두 띠로 자르는
  // 가장 확실한 수단이다 — 6~15m 거리에서 실제로 읽히는 유일한 종류의 개입이 이런 가로선이다.
  // (뜯긴 벽지 조각을 실물로 세워 봤더니 6m 밖에서 흰 헝겊으로 읽혀 오히려 아티팩트가 됐다.)
  // 2.62m — 벽등(2.16, 기구 하단 2.03) 위, 채광창 상단(2.545) 위, 크라운(2.91) 아래의 유일한 빈 띠
  const RY = 2.62
  const zs = side > 0 ? [Z0 + 0.02, Z1 - 0.02] : [Z1 - 0.02, Z0 + 0.02]
  g.add(mesh(tint(profile(RAIL_PROF, [[side * (HX - 0.012), RY, zs[0]], [side * (HX - 0.012), RY, zs[1]]],
    { up: [-side, 0, 0] }),
  (x, y, z) => clamp(0.80 - 0.22 * (fbm(n, z * 1.9, y * 5, 3) * 0.5 + 0.5), 0.30, 0.96)),
  'wood.painted.white', { vcol: true }))

  // 레일에 걸린 액자. 걸이줄이 프리즈 띠를 세로로 끊어 가로선 하나만 남는 것을 막는다
  const pw = 0.34 + r() * 0.16, ph = 0.40 + r() * 0.18
  const f = P.framedPicture(seed + 40, { w: pw, h: ph }).root
  f.position.set(side * (HX - 0.030), RY - 0.62 - ph * 0.5, picZ)
  f.rotation.y = -side * Math.PI * 0.5
  f.rotation.z = (r() - 0.5) * 0.07
  g.add(f)
  const cord = mesh(bevelBox(0.004, 0.62, 0.004, 0.0012, 1), 'fabric.wool.suit',
    { pos: [side * (HX - 0.022), RY - 0.31, picZ], cast: false })
  cord.rotation.x = (r() - 0.5) * 0.05
  g.add(cord)

  // 들뜬 이음매. 벽지 폭 이음이 벌어져 한쪽 모서리만 벽에서 뜬다 — 근거리 스침각에서 헤어라인이 선다
  for (let i = 0; i < 2; i++) {
    const s = mesh(bevelBox(0.006, RY - y0 - 0.14, 0.052, 0.0015, 1), 'wallpaper.damask.green',
      { wear: 0.5, seed: seed + 21 + i })
    s.position.set(side * (HX - 0.014), (y0 + RY) * 0.5, at(i, 2, r()))
    s.rotation.y = side * (0.30 + r() * 0.14)
    g.add(s)
  }

  // 누수·퇴색 얼룩. 격자의 주기(≈0.5m)보다 훨씬 큰 저주파 값 변화를 얹어야 반복이 흐려진다.
  // 이게 D3의 주력이다 — 뜯긴 자리 몇 개로는 세로 4회 반복이 안 지워진다.
  for (let i = 0; i < 7; i++) {
    const big = i % 3 === 0
    decal(g, {
      x: side * (HX - 0.010),
      y: y0 + (y1 - y0) * (0.10 + r() * 0.85),
      z: at(i, 7, r()),
      radius: big ? 1.05 + r() * 0.75 : 0.34 + r() * 0.42,
      radiusZ: big ? 0.55 + r() * 0.45 : 0.28 + r() * 0.40,
      strength: big ? 0.22 + r() * 0.14 : 0.34 + r() * 0.18,
      rot: [0, ROT, 0]
    })
  }

  // 걸레받이 하단 + 웨인스코트 밑선 AO. 접합선이 인접 면보다 확실히 내려가야 면이 안 뜬다(G4)
  const mid = (Z0 + Z1) * 0.5
  decal(g, { x: side * (HX - 0.048), y: 0.075, z: mid, radius: (Z1 - Z0) * 0.46, radiusZ: 0.11, strength: 0.58, rot: [0, ROT, 0] })
  decal(g, { x: side * (HX - 0.052), y: WY - 0.02, z: mid, radius: (Z1 - Z0) * 0.44, radiusZ: 0.07, strength: 0.30, rot: [0, ROT, 0] })
  return g
}

/**
 * 벽/바닥 접합 컨택트 섀도. 바닥 쪽에서 벽 밑동을 따라 한 줄 깐다.
 * 하나를 길게 깔아야 주기가 안 생긴다 — 짧은 데칼을 반복하면 그 자체가 D3가 된다.
 */
export function floorJoint (HX, Z0, Z1, seed) {
  const g = group('corridor.joint')
  const mid = (Z0 + Z1) * 0.5, half = (Z1 - Z0) * 0.5
  for (const s of [-1, 1]) {
    decal(g, { x: s * (HX - 0.10), y: 0.0045, z: mid, radius: 0.16, radiusZ: half * 0.92, strength: 0.58 })
    decal(g, { x: s * (HX - 0.26), y: 0.0040, z: mid, radius: 0.22, radiusZ: half * 0.86, strength: 0.26 })
  }
  // 끝벽 밑동
  decal(g, { x: 0.55, y: 0.0045, z: Z0 + 0.13, radius: 0.86, radiusZ: 0.17, strength: 0.52 })
  return g
}

/**
 * 카펫 러너 바인딩과 얼룩. runner()가 굽는 탈색 띠는 색만 바꾸고 경계가 없어서
 * 2m 폭 카펫이 통짜 단색 면으로 읽힌다(G6). 가장자리 테이프로 선을 세우고 오점을 얹는다.
 */
// 바인딩 테이프 단면. u = 러너 안쪽에서 바깥, v = 바닥에서 위.
// 바깥 모서리를 두 단으로 굴려 마루에 얹힌 두께가 실루엣에 걸리게 한다.
const BIND_PROF = [[0, 0], [0.052, 0], [0.056, 0.008], [0.052, 0.017],
  [0.040, 0.021], [0.008, 0.021], [0, 0.015]]

export function runnerTrim (w, Z0, Z1, seed) {
  const g = group('corridor.runnerTrim')
  const r = rng(seed)
  const n = noise2D(seed + 4)
  const len = Z1 - Z0, cz = (Z0 + Z1) * 0.5
  // 바인딩 테이프. 완전 직선 압출은 "바닥에 그려진 데칼"로 읽힌다(심사 D3) — 바깥 모서리를
  // 세그먼트마다 흔들어 두께와 올풀림이 실루엣에 걸리게 한다. 세로 분할이 없으면 흔들 정점이
  // 없으므로 길이 방향 세그먼트를 미터당 6개로 준다.
  const bg = [], bm = []
  const steps = Math.max(8, Math.round(len * 4))
  for (const s of [-1, 1]) {
    const px = s * (w * 0.5 - 0.052)
    const z0 = s > 0 ? Z0 : Z1, z1 = s > 0 ? Z1 : Z0
    const b = profile(BIND_PROF, [[px, 0.002, z0], [px, 0.002, z1]], { up: [0, 1, 0], steps })
    const bp = b.attributes.position
    const lim = w * 0.5 - 0.016
    for (let i = 0; i < bp.count; i++) {
      const bx = bp.getX(i), by = bp.getY(i), bz = bp.getZ(i)
      if (Math.abs(bx) < lim) continue                    // 러너 바깥을 향한 모서리만 흔든다
      const j = fbm(n, bz * 3.3 + s * 5, 0, 3)
      bp.setXYZ(i, bx + s * (j * 0.011 + 0.002), by + j * 0.0030, bz)
    }
    b.computeVertexNormals()
    bg.push(b); bm.push(null)
  }
  g.add(mesh(tint(merge(bg, bm), (x, y, z) =>
    clamp(0.72 - 0.24 * (fbm(n, z * 1.4, x * 6, 3) * 0.5 + 0.5), 0.30, 0.92)),
  'fabric.wool.suit', { vcol: true, cast: false }))
  // 바인딩 밑 컨택트. 테이프가 마루에 얹힌 선이 없으면 러너 전체가 바닥에 인쇄된 것으로 보인다
  for (const s of [-1, 1]) {
    decal(g, { x: s * (w * 0.5 + 0.012), y: 0.0055, z: cz, radius: 0.055, radiusZ: len * 0.5, strength: 0.58 })
  }

  // 오점 세 점. 크기·농도를 다르게 둬야 "얼룩"이지 "무늬"가 아니다
  for (const [px, pz, rx, rz, st] of [
    [-0.34, Z0 + 6.20, 0.30, 0.42, 0.46],
    [0.46, Z0 + 2.70, 0.19, 0.24, 0.36],
    [-0.10, Z1 - 3.40, 0.44, 0.30, 0.28]
  ]) {
    decal(g, { x: px + (r() - 0.5) * 0.1, y: 0.021, z: pz, radius: rx, radiusZ: rz, strength: st })
  }
  return g
}

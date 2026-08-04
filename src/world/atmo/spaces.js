// 무드별 실내 공간. 각 빌더는 {root, lights} 를 돌려주고, lights는 그 공간의 실광원 배선이다.
// 카메라는 core/shotlist.js의 atmo-* 엔트리가 이미 고정돼 있으므로 그 프레이밍에 맞춰 짓는다.

import { rng } from '../../core/util.js'
import { bevelBox, lathe, tube, merge, mesh, group, xf, groundContact, clone, shadows } from '../kit.js'
import * as P from '../props.js'
import { room, pierced, blinds, plate, tiledFloor } from './shell.js'
import * as CD from './corridor-detail.js'
import * as CF from './corridor-finish.js'
import * as PC from '../props-corridor.js'

// 소품이 자체 THREE 광원을 달고 오면 조명 계약(6.5)을 벗어난다 — 몸통만 쓰고 광원은 뗀다.
function noLights (res) {
  for (const l of res.lights || []) {
    l.target?.parent?.remove(l.target)
    l.parent?.remove(l)
    l.dispose?.()
  }
  return res.root
}

// ── 로비 ─────────────────────────────────────────────────────────────────
// 샷: pos(4.6, 5.4) → target(-0.6, -2.2), fov 40. 오른쪽 앞 기둥이 전경 오클루더가 된다.
function lobby () {
  const g = group('space.lobby')
  g.add(room({
    x0: -7.2, x1: 7.2, z0: -9.0, z1: 7.6, h: 5.0,
    floor: 'marble.lobby.floor', ceil: 'plaster.cracked',
    wall: 'wallpaper.damask.green', wainscot: 'wood.varnished.dark', wainscotH: 1.24
  }))

  const colGeo = merge([
    lathe([[0.30, 0], [0.34, 0.04], [0.30, 0.10], [0.26, 0.16]], 26),
    lathe([[0.255, 0.16], [0.243, 1.6], [0.222, 3.4], [0.238, 3.9]], 26),
    lathe([[0.245, 3.9], [0.31, 4.02], [0.35, 4.16], [0.30, 4.30], [0.26, 4.34]], 26)
  ])
  const capGeo = bevelBox(0.86, 0.16, 0.86, 0.03, 2)
  for (const [i, [x, z]] of [[-3.5, 2.2], [3.5, 2.2], [-3.5, -3.4], [3.5, -3.4]].entries()) {
    const c = group('column',
      mesh(colGeo, 'marble.lobby.floor', { wear: 0.55, seed: 40 + i }),
      mesh(capGeo, 'plaster.cracked', { pos: [0, 4.42, 0], wear: 0.7, seed: 44 + i }))
    c.position.set(x, 0, z)
    c.rotation.y = i * 0.4
    groundContact(c, { strength: 0.7, radius: 0.42, radiusZ: 0.42 })
    g.add(c)
  }

  // 프런트데스크 — 카운터 + 하부 패널 + 황동 발판
  const desk = group('desk')
  desk.add(mesh(bevelBox(4.6, 1.12, 0.72, 0.02, 2), 'wood.varnished.dark', { pos: [0, 0.56, 0], wear: 0.8, seed: 51 }))
  desk.add(mesh(bevelBox(4.9, 0.07, 0.96, 0.014, 2), 'marble.lobby.floor', { pos: [0, 1.16, 0.04], wear: 0.5, seed: 52 }))
  desk.add(mesh(tube([[-2.3, 0.12, 0.42], [2.3, 0.12, 0.42]], 0.028, 4, 10), 'brass.polished', { wear: 0.75, seed: 53 }))
  const pg = [], pm = []
  for (let i = 0; i < 6; i++) {
    pg.push(bevelBox(0.62, 0.74, 0.03, 0.010, 2)); pm.push(xf([-1.95 + i * 0.78, 0.60, 0.375]))
  }
  desk.add(mesh(merge(pg, pm), 'wood.varnished.dark', { wear: 0.9, seed: 54 }))
  desk.position.set(-2.4, 0, -4.9)
  desk.rotation.y = 0.06
  groundContact(desk, { strength: 0.72, spread: 1.05 })
  g.add(desk)

  const rack = P.keyRack(61, { cols: 9, rows: 5 }).root
  rack.position.set(-2.4, 1.95, -8.82)
  g.add(rack)
  const ledger = P.ledger(62).root
  ledger.position.set(-1.6, 1.20, -4.86)
  ledger.rotation.y = -0.22
  g.add(ledger)
  const phone = P.telephone(63).root
  phone.position.set(-3.7, 1.20, -4.92)
  phone.rotation.y = 0.5
  g.add(phone)

  const elev = P.elevatorDoors(71, { w: 1.34, h: 2.34 }).root
  elev.position.set(7.06, 0, -1.4)
  elev.rotation.y = -Math.PI / 2
  g.add(elev)

  const sofa = P.sofa(81).root
  sofa.position.set(4.3, 0, 2.6)
  sofa.rotation.y = -1.35
  g.add(sofa)
  const chair = P.armchair(82).root
  chair.position.set(1.7, 0, 3.5)
  chair.rotation.y = 2.5
  g.add(chair)
  const tbl = P.sideTable(83).root
  tbl.position.set(3.2, 0, 4.2)
  g.add(tbl)
  const ash = P.ashtray(84).root
  ash.position.set(3.2, 0.56, 4.2)
  g.add(ash)
  const palm = P.potPlant(85).root
  palm.position.set(-5.6, 0, 1.4)
  g.add(palm)
  const rug = P.rugRunner(86, { w: 3.4, len: 5.0 }).root
  rug.position.set(2.6, 0, 2.4)
  g.add(rug)
  const cart = P.luggageCart(87).root
  cart.position.set(-5.2, 0, -2.2)
  cart.rotation.y = 0.8
  g.add(cart)
  for (const [i, x] of [-6.2, -4.4].entries()) {
    const f = P.framedPicture(90 + i, { w: 0.62, h: 0.82 }).root
    f.position.set(x, 2.4, -8.78)
    g.add(f)
  }

  return {
    root: g,
    lights: [
      ['chandelier', { pos: [0.4, 4.10, 0.4], kelvin: 2500, lumens: 7200, radius: 14, flicker: 0.05, hot: 3.0 }],
      ['ceiling', { pos: [-2.4, 3.55, -4.4], kelvin: 4400, lumens: 3400, radius: 7.5, angle: 1.10, flicker: 0.14, shaft: 0.30 }],
      ['sconce', { pos: [-7.05, 2.45, -1.2], kelvin: 2700, lumens: 1100, radius: 5.6, flicker: 0.06, dir: [1, -0.5, 0.15], shaft: 0.26 }],
      ['sconce', { pos: [7.05, 2.45, 1.8], kelvin: 2650, lumens: 900, radius: 5.2, flicker: 0.09, dir: [-1, -0.5, -0.15], shaft: 0.24 }],
      ['desk', { pos: [-3.9, 1.55, -4.6], kelvin: 2700, lumens: 700, radius: 4.2, flicker: 0.05, shaft: 0.22 }],
      ['elevator', { pos: [6.2, 2.62, -1.4], kelvin: 3300, lumens: 900, radius: 5.0, flicker: 0.10, shaft: 0.28, dir: [-0.35, -1, 0] }]
    ]
  }
}

// ── 9층 복도 ─────────────────────────────────────────────────────────────
// 샷: pos(0.4, 6.2) → target(-0.4, -6.0), fov 32.
// 원근은 살리되 시선이 밝은 원경 벽에서 끝나지 않게 한다 — 끝은 계단참의 어두운 구멍이다(G2/G9).
// 깊이는 길이가 아니라 레이어로 만든다: 전경(소화호스함) / 중경(린넨 카트·라디에이터) / 후경(계단참).
function corridor () {
  const g = group('space.corridor')
  const HX = 1.42, Z0 = -8.9, Z1 = 8.4, H = 3.05, WY = 1.06
  const OW = 1.18, OH = 2.28                      // 끝벽 계단참 개구부
  const r = rng(7)

  g.add(room({
    x0: -HX, x1: HX, z0: Z0, z1: Z1, h: H, skipZ0: true,
    floor: 'wood.varnished.dark', ceil: 'plaster.cracked',
    wall: 'wallpaper.damask.green'
  }))
  // 끝벽은 통짜가 아니라 개구부가 뚫린 벽이다. room()의 z0 벽을 끄고 직접 세운다
  g.add(pierced('z', Z0 - 0.11, H, 'wallpaper.damask.green',
    [-HX - 0.22, HX + 0.22], [-HX, -HX + OW], { sill: 0, head: OH }))
  g.add(mesh(bevelBox(2 * HX - OW, WY, 0.055, 0.010, 1), 'wood.varnished.dark',
    { pos: [OW * 0.5, WY * 0.5, Z0 + 0.028], wear: 0.95, seed: 41, cast: false }))
  g.add(CD.stairHead(HX, Z0, H, OW, OH, 45))
  // 끝벽·개구부는 값이 서로 붙어 15m 앞이 한 장의 쿼드로 읽힌다 — 트림과 데칼로 층을 가른다
  g.add(CF.endWall(HX, Z0, WY, H, OW, 210))
  g.add(CF.stairWell(HX, Z0, H, OW, OH, 220))

  const sconceZ = [4.4, 0.7, -3.0, -6.6]
  for (const s of [-1, 1]) {
    for (const m of CD.wainscot(s, HX, Z0, Z1, WY, 51 + (s > 0 ? 7 : 0))) g.add(m)
    g.add(CD.wallVeneer(s, HX, Z0, Z1, WY, H, 61 + (s > 0 ? 7 : 0),
      sconceZ.filter((_, i) => (i % 2 ? 1 : -1) === s)))
    // 오지 격자의 세로 반복(D3)을 실제 인공물로 깬다 — 벗겨진 자리·들뜬 이음매·누수 얼룩
    g.add(CF.wallBreak(s, HX, Z0, Z1, WY, H, 230 + (s > 0 ? 9 : 0), s > 0 ? 2.0 : -0.6))
  }
  // 끝벽 매입 패널. CF.endWall의 26mm × 16mm 띠는 15m 앞에서 1px 선으로 뭉개져 사각형이
  // "그려진 것"으로 읽혔다(심사 G6) — 같은 자리에 돌출 46mm 볼렉션 틀을 겹쳐 덮는다.
  const ex0 = -HX + OW
  g.add(PC.panelWainscot([[ex0 + 0.42, 0.70], [ex0 + 1.24, 0.62]], 0.235, WY - 0.20, Z0 + 0.052, 270))
  // 러너 양옆에 드러나는 마루. room()의 통짜 평면은 널 배열이 텍스처 주기로 반복돼 D3였다.
  for (const m of PC.plankFloor(0.94, HX - 0.004, Z0 + 0.02, Z1 - 0.02, 280)) g.add(m)
  g.add(CF.floorJoint(HX, Z0, Z1, 250))
  // STORY §6 — 942호(z=1.9, 우측) 앞에서 계단 쪽으로 색이 옅어진 띠.
  // 끝점 -8.5 → -3.6. 10.4m 에 걸쳐 램프시키면 화면에 보이는 구간(z 0.6~-4.4)에서
  // 탈색이 최대 0.29 밖에 안 올라와 띠가 아니라 균일한 살구색 면으로 읽혔다(G6).
  const run = CD.runner(2.0, Z0 + 0.45, Z1 - 0.2, 71, [1.9, -3.6])
  // PlaneGeometry의 uv 0..1 은 2m × 17.3m 를 덮는다 — carpet.corridor.red 의 repeat[3,3]과
  // 곱해도 무늬 셀이 11cm × 96cm 로 찌그러져 화면에는 세로 줄무늬조차 안 남는다(심사 G6
  // "무늬가 전무한 단색 면"의 실제 원인). 월드 등방 uv로 다시 깔면 셀이 15cm가 된다.
  PC.floorUv(run.geometry, 2.7)
  g.add(run)
  g.add(CF.runnerTrim(2.0, Z0 + 0.45, Z1 - 0.2, 260))

  // 문: 세 벌의 마모 시드를 돌려 쓰고 배치 지터를 얹는다(계약 §8 반복 요소 변주)
  const units = [101, 102, 103].map(s => P.doorUnit(s, { w: 0.86, h: 2.06 }).root)
  let n = 0
  for (const z of [5.6, 1.9, -1.8, -5.5]) {
    for (const s of [-1, 1]) {
      const dz = z + (s > 0 ? 1.85 : 0)
      const d = clone(units[n % 3], 110 + n, { pos: 0.020, rot: 0.030, scale: 0.022 })
      d.position.set(s * (HX - 0.02), 0, dz)
      d.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2
      shadows(d, true, true)
      // 문틀 발치 컨택트. 문짝이 바닥에서 떠 보이면 실격이다(D5) — 문지방 그림자로 붙인다
      groundContact(g, {
        x: s * (HX - 0.13), z: dz, radius: 0.17, radiusZ: 0.50,
        strength: 0.62 + (n % 3) * 0.06, y: 0.005
      })
      g.add(d)
      // 번호판: 각도·높이·황동 산화도가 문마다 다르다. 하나는 나사가 빠져 기울어 있다
      const num = plate(0.088, 0.132, n % 4 === 1 ? 'brass.polished' : 'brass.tarnished', 120 + n)
      num.position.set(s * (HX - 0.068), 1.66 + (r() - 0.5) * 0.05, dz + 0.60)
      num.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2
      num.rotation.x = n === 4 ? 0.26 : (r() - 0.5) * 0.09
      g.add(num)
      n++
    }
  }

  // 채광창(트랜섬) — 한 방만 불이 켜져 있다. 2450K 스필이 벽등·형광과 세 번째 색온도를 만든다(G1)
  const tz = 0.05
  g.add(mesh(bevelBox(0.030, 0.34, 0.86, 0.008, 1), 'glass.frosted',
    { pos: [HX - 0.048, 2.36, tz], cast: false }))
  g.add(mesh(merge([bevelBox(0.055, 0.045, 0.94, 0.010, 1), bevelBox(0.055, 0.045, 0.94, 0.010, 1)],
    [xf([HX - 0.040, 2.19, tz]), xf([HX - 0.040, 2.545, tz])]),
  'wood.painted.white', { wear: 0.9, seed: 131 }))

  // 방화구획 아치. 원경 안개면을 프레임으로 잘라 중경 레이어를 하나 더 만든다(G9/G10).
  // 안개는 거리 함수라 11m 지점의 이 면은 15m 끝벽보다 확실히 어둡게 떨어진다 — 대비가 여기서 생긴다
  const az = -4.4
  const ag = [], am = []
  for (const s of [-1, 1]) {
    ag.push(bevelBox(0.26, H, 0.30, 0.016, 2)); am.push(xf([s * (HX - 0.13), H * 0.5, az]))
    ag.push(bevelBox(0.075, H, 0.40, 0.010, 1)); am.push(xf([s * (HX - 0.29), H * 0.5, az]))
  }
  ag.push(bevelBox(2 * HX - 0.04, 0.62, 0.30, 0.016, 2)); am.push(xf([0, H - 0.31, az]))
  ag.push(bevelBox(2 * HX - 0.04, 0.075, 0.40, 0.010, 1)); am.push(xf([0, H - 0.655, az]))
  g.add(mesh(merge(ag, am), 'wood.painted.white', { wear: 0.95, seed: 181 }))

  const rad = P.radiator(141, { cols: 9 }).root
  rad.position.set(-HX + 0.19, 0, 2.2)
  rad.rotation.y = Math.PI / 2
  groundContact(rad, { strength: 0.74, radius: 0.62, radiusZ: 0.18 })
  g.add(rad)

  // 벽면 액자 두 점. 벽지 면적을 끊고 인물이 살던 공간이라는 흔적을 남긴다(G6/N6)
  for (const [i, [px, pz, pw, ph]] of [[-1, 3.9, 0.44, 0.58], [1, -2.5, 0.52, 0.40]].entries()) {
    const f = P.framedPicture(191 + i, { w: pw, h: ph }).root
    f.position.set(px * (HX - 0.035), 1.72 + i * 0.06, pz)
    f.rotation.y = px > 0 ? -Math.PI / 2 : Math.PI / 2
    f.rotation.z = (r() - 0.5) * 0.05
    g.add(f)
  }

  // 전경 오클루더 — 오른쪽 벽 소화호스함. 카메라 2.8m 앞이라 프레임 오른쪽을 잘라낸다(G9).
  // 유리 한 장짜리 옛 판은 그 거리에서 135×740px 짜리 크림색 슬래브였다(심사 D4).
  const hose = PC.hoseCabinet(151)
  hose.position.set(HX, 1.46, 3.5)
  g.add(hose)

  // 중경 — 청소부 카트. 바닥선이 프레임 하단에 걸리게 놓아 전경과 후경 사이를 잇는다
  const cart = PC.laundryCart(161)
  cart.position.set(1.00, 0, 1.05)
  cart.rotation.y = -1.52
  groundContact(cart, { strength: 0.66, radius: 0.34, radiusZ: 0.46 })
  g.add(cart)

  // 천장 반자틀. 균일 1.2m 반복을 복도 전장(15개)에 깔면 스침각에서 주기가 1~2px까지 압축돼
  // 의도한 디테일이 D1(에일리어싱)·D3(반복)로 뒤집힌다. 방화구획 아치(z=-4.4) 너머는 화면에서
  // 이미 2px 이하라 통째로 빼고, 남은 근경 구간만 간격·단면에 변주를 준다.
  // 단면은 순수 직육면체가 아니라 몰딩 스윕이다 — 모따기가 없으면 D4에 그대로 걸린다.
  for (const m of PC.ceilingBattens(HX, H, Z1 - 0.7, -4.0, 88)) g.add(m)

  // 조명. 좁은 콘(0.72rad)이라야 벽면에 원뿔 광축이 떨어지고 페넘브라가 읽힌다(G1/G4).
  // 사거리 11m 안쪽만 실제로 켜지므로 복도 뒷절반은 자연히 어둠으로 떨어진다.
  const lights = []
  for (const [i, z] of sconceZ.entries()) {
    const s = i % 2 ? 1 : -1
    const dead = i === 3                          // 끝 벽등은 나가 있다 — 어둠의 이유를 화면 안에 둔다
    lights.push(['sconce', {
      pos: [s * (HX - 0.15), 2.16, z],
      kelvin: 2560 + (r() - 0.5) * 260,
      lumens: dead ? 0.6 : (i === 0 ? 600 : 1120 - i * 70),
      radius: dead ? 2.0 : 11.0,
      flicker: dead ? 0 : 0.05 + r() * 0.14,
      hot: dead ? 0.05 : 1.35 + r() * 0.45,
      // 셸 길이는 사거리(11m)가 아니라 실제 투사 거리다 — y=2.16에서 기울기 0.70으로 내려가면
      // 2.9m에 바닥에 닿는다. 반각도 기구의 전체 확산이 아니라 눈에 읽히는 코어만 잡는다.
      // 볼류메트릭은 maxDist·nearFade 때문에 이 넷 중 하나(z=0.7)만 마치한다 — 나머지 광축은
      // 셸이 책임진다(G1 "세 practical 전부에 강도 비례 산란").
      dir: [-s * 0.62, -0.70, 0], angle: 0.72, penumbra: 0.80,
      // 반각 0.62 × 길이 2.9는 밑면 반경 2.03m — 2.84m 폭 복도를 통째로 채워 광축이 아니라
      // 화면에 낀 김이 됐다. 게다가 유백유리 사발에는 빔을 뽑을 조리개가 없다(심사 G1 지적).
      // 확산 기구가 만드는 것은 바닥까지 뻗는 원뿔이 아니라 기구 바로 아래 짧은 공기 웅덩이다.
      shaft: dead ? 0 : (i === 1 ? 0.17 : 0.30), shaftLen: 1.5, shaftAngle: 0.34,
      fixtureRot: [0, 0, s * (0.02 + r() * 0.05)]   // 벽등마다 미세하게 기운다
    }])
  }
  lights.push(['ceiling', {
    pos: [0, 2.92, -2.2], kelvin: 4400, lumens: 3400, radius: 9.0, angle: 1.24,
    // 반매입 돔도 같은 이유로 빔이 아니다. 바닥까지 뻗던 원뿔이 프레임 정중앙을 세로로 갈라
    // 소실점을 덮고 있었다(G9) — 기구 아래 0.8m 반경 웅덩이로 줄인다.
    flicker: 0.34, shaft: 0.34, shaftLen: 1.5, shaftAngle: 0.50, hot: 1.9
  }])
  lights.push(['desk', {
    pos: [HX - 0.075, 2.30, tz], target: [HX - 1.05, 0, tz], kelvin: 2450, lumens: 210,
    radius: 3.4, angle: 0.70, penumbra: 0.92, flicker: 0.03,
    // 이 광축만 좁아도 되는 이유가 화면 안에 있다 — 트랜섬의 유백유리 슬릿이 실제 개구다(G2).
    shaft: 0.26, shaftLen: 1.9, shaftAngle: 0.22, fixture: false
  }])
  return { root: g, lights }
}

// ── 942호 (황혼) ─────────────────────────────────────────────────────────
// 샷: pos(3.8, 4.0) → target(-1.4, -2.6), fov 42. 창은 카메라 오른쪽 뒤에 두고 광축을 방 안으로 던진다.
function roomDusk () {
  const g = group('space.room942')
  const X0 = -4.3, X1 = 4.7, Z0 = -5.2, Z1 = 5.4, H = 3.15
  g.add(room({
    x0: X0, x1: X1, z0: Z0, z1: Z1, h: H, skipX1: true,
    floor: 'wood.varnished.dark', ceil: 'plaster.cracked',
    wall: 'wallpaper.damask.green', wainscot: 'wood.painted.white', wainscotH: 0.98
  }))
  // 오른쪽 벽만 창을 뚫는다
  g.add(pierced('x', X1 + 0.11, H, 'wallpaper.damask.green', [Z0, Z1], [-1.6, 0.9], { sill: 0.92, head: 2.42 }))
  const sash = group('sash')
  const fg = [], fm = []
  fg.push(bevelBox(0.06, 1.56, 0.10, 0.012, 1)); fm.push(xf([0, 1.67, -1.62]))
  fg.push(bevelBox(0.06, 1.56, 0.10, 0.012, 1)); fm.push(xf([0, 1.67, 0.92]))
  fg.push(bevelBox(0.06, 0.10, 2.62, 0.012, 1)); fm.push(xf([0, 0.92, -0.35]))
  fg.push(bevelBox(0.06, 0.10, 2.62, 0.012, 1)); fm.push(xf([0, 2.42, -0.35]))
  fg.push(bevelBox(0.05, 0.07, 2.50, 0.010, 1)); fm.push(xf([0, 1.67, -0.35]))
  for (let i = 0; i < 3; i++) { fg.push(bevelBox(0.04, 1.44, 0.05, 0.008, 1)); fm.push(xf([0, 1.67, -1.30 + i * 0.62])) }
  sash.add(mesh(merge(fg, fm), 'wood.painted.white', { wear: 0.9, seed: 161 }))
  sash.add(mesh(bevelBox(0.014, 1.44, 2.44, 0.004, 1), 'glass.clear', { pos: [0.02, 1.67, -0.35], cast: false }))
  sash.position.set(X1 + 0.02, 0, 0)
  g.add(sash)
  const bl = blinds(2.42, 1.30, 22, 171, 0.58)
  bl.rotation.y = -Math.PI / 2
  bl.position.set(X1 - 0.10, 1.10, -0.35)
  g.add(bl)

  const bed = P.bed(181, { w: 1.42, len: 2.05 }).root
  bed.position.set(-2.5, 0, -1.4)
  bed.rotation.y = Math.PI / 2
  g.add(bed)
  const ns = P.nightstand(182).root
  ns.position.set(-3.3, 0, 1.15)
  g.add(ns)
  const lamp = noLights(P.deskLamp(183))
  lamp.position.set(-3.3, 0.62, 1.15)
  lamp.rotation.y = 1.1
  g.add(lamp)
  const rad = P.radiator(184, { cols: 12 }).root
  rad.position.set(1.9, 0, Z0 + 0.16)
  g.add(rad)
  const suit = P.suitcase(185).root
  suit.position.set(1.2, 0, 2.4)
  suit.rotation.y = -0.4
  g.add(suit)
  const chair = P.armchair(186).root
  chair.position.set(2.9, 0, -2.6)
  chair.rotation.y = 2.1
  g.add(chair)
  const pic = P.framedPicture(187, { w: 0.72, h: 0.56 }).root
  pic.position.set(-2.5, 2.10, Z0 + 0.13)
  g.add(pic)
  const rug = P.rugRunner(188, { w: 2.2, len: 3.0 }).root
  rug.position.set(0.6, 0, 0.4)
  g.add(rug)

  return {
    root: g,
    lights: [
      ['street', {
        pos: [10.5, 6.4, 1.2], target: [-2.6, 0.35, -2.2], kelvin: 3100, lumens: 9000,
        radius: 22, angle: 0.40, flicker: 0.02, shaft: 1.0,
        slats: { count: 22, phase: 0.4, depth: 0.92 }, fixture: false
      }],
      ['desk', { pos: [-3.3, 1.02, 1.15], kelvin: 2600, lumens: 420, radius: 3.4, flicker: 0.05, shaft: 0.20, fixture: false }],
      ['sconce', { pos: [X0 + 0.14, 2.20, 2.6], kelvin: 2750, lumens: 320, radius: 4.0, flicker: 0.05, dir: [1, -0.6, 0], shaft: 0.20 }]
    ]
  }
}

// ── 욕실 ─────────────────────────────────────────────────────────────────
// 샷: pos(2.6, 3.4) → target(-0.8, -2.0), fov 44.
function bathroom () {
  const g = group('space.bathroom')
  const X0 = -2.2, X1 = 3.3, Z0 = -3.1, Z1 = 4.1, H = 2.80
  g.add(room({
    x0: X0, x1: X1, z0: Z0, z1: Z1, h: H,
    floor: 'tile.hex.bathroom', ceil: 'plaster.cracked',
    wall: 'plaster.cracked', wainscot: 'tile.subway.white', wainscotH: 1.62
  }))
  g.add(tiledFloor(X0, X1, Z0, Z1, 'tile.hex.bathroom', 0.28, 191))

  const sink = P.sink(201).root
  sink.position.set(-1.55, 0, -1.0)
  sink.rotation.y = Math.PI / 2
  g.add(sink)
  const cab = P.mirrorCabinet(202).root
  cab.position.set(X0 + 0.09, 1.62, -1.0)
  cab.rotation.y = Math.PI / 2
  g.add(cab)
  const tub = P.bathtub(203).root
  tub.position.set(1.5, 0, -2.0)
  tub.rotation.y = Math.PI / 2
  g.add(tub)
  const wc = P.toilet(204).root
  wc.position.set(2.6, 0, 1.5)
  wc.rotation.y = -Math.PI / 2
  g.add(wc)
  const rack = P.towelRack(205, { w: 0.6 }).root
  rack.position.set(X0 + 0.10, 1.30, 1.6)
  rack.rotation.y = Math.PI / 2
  g.add(rack)
  const rad = P.radiator(206, { cols: 7 }).root
  rad.position.set(0.2, 0, Z1 - 0.20)
  rad.rotation.y = Math.PI
  g.add(rad)

  return {
    root: g,
    lights: [
      ['ceiling', { pos: [0.3, 2.62, -0.4], kelvin: 4500, lumens: 3200, radius: 7.0, angle: 1.24, flicker: 0.26, shaft: 0.22 }],
      ['sconce', { pos: [X0 + 0.16, 1.98, -1.0], kelvin: 2950, lumens: 380, radius: 3.6, flicker: 0.05, dir: [1, -0.35, 0], shaft: 0.20 }],
      ['bare-bulb', { pos: [2.5, 2.30, 2.6], kelvin: 2400, lumens: 220, radius: 3.4, flicker: 0.22 }]
    ]
  }
}

// ── 심문실 ───────────────────────────────────────────────────────────────
// 샷: pos(0.05, 1.15) → target(0, -0.4), fov 50. 테이블 건너편 빈 의자가 피사체다.
function interrogation () {
  const g = group('space.interro')
  g.add(room({
    x0: -1.9, x1: 1.9, z0: -2.6, z1: 1.9, h: 2.72,
    floor: 'concrete.rooftop', ceil: 'plaster.cracked',
    wall: 'plaster.cracked', wainscot: 'wood.painted.white', wainscotH: 0.92
  }))

  const table = group('table')
  table.add(mesh(bevelBox(1.42, 0.052, 0.82, 0.010, 2), 'wood.varnished.dark', { pos: [0, 0.735, 0], wear: 0.95, seed: 211 }))
  const lg = [], lm = []
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    lg.push(lathe([[0.036, 0], [0.030, 0.06], [0.026, 0.60], [0.032, 0.71]], 12))
    lm.push(xf([sx * 0.60, 0, sz * 0.30]))
  }
  lg.push(tube([[-0.60, 0.14, -0.30], [-0.60, 0.14, 0.30]], 0.016, 4, 6)); lm.push(null)
  lg.push(tube([[0.60, 0.14, -0.30], [0.60, 0.14, 0.30]], 0.016, 4, 6)); lm.push(null)
  table.add(mesh(merge(lg, lm), 'steel.galvanized', { wear: 0.9, seed: 212 }))
  table.position.set(0, 0, -0.55)
  table.rotation.y = 0.05
  groundContact(table, { strength: 0.7, spread: 1.0 })
  g.add(table)

  const chairGeo = () => {
    const cg = [], cm = []
    cg.push(bevelBox(0.42, 0.038, 0.40, 0.010, 2)); cm.push(xf([0, 0.45, 0]))
    cg.push(bevelBox(0.40, 0.46, 0.034, 0.010, 2)); cm.push(xf([0, 0.70, -0.18], [-0.10, 0, 0]))
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      cg.push(lathe([[0.020, 0], [0.017, 0.44]], 10)); cm.push(xf([sx * 0.17, 0, sz * 0.16]))
    }
    return merge(cg, cm)
  }
  const chair = mesh(chairGeo(), 'wood.varnished.dark', { wear: 1.0, seed: 221 })
  chair.position.set(0.12, 0, -1.42)
  chair.rotation.y = Math.PI + 0.16
  groundContact(chair, { strength: 0.62, spread: 0.8 })
  g.add(chair)

  const ash = P.ashtray(231).root
  ash.position.set(0.30, 0.762, -0.42)
  g.add(ash)
  const cig = P.cigarette(232).root
  cig.position.set(0.30, 0.782, -0.40)
  cig.rotation.y = 0.7
  g.add(cig)
  const glass = P.glassTumbler(233).root
  glass.position.set(-0.34, 0.762, -0.66)
  g.add(glass)
  const note = P.journal(234).root
  note.position.set(-0.10, 0.762, -0.30)
  note.rotation.y = -0.24
  g.add(note)
  const rad = P.radiator(235, { cols: 8 }).root
  rad.position.set(-1.3, 0, -2.42)
  g.add(rad)

  return {
    root: g,
    lights: [
      ['desk', {
        pos: [0.06, 1.92, -0.62], target: [0, 0.74, -0.60], kelvin: 2750, lumens: 620,
        radius: 4.4, angle: 0.50, penumbra: 0.26, flicker: 0.08, shaft: 0.95, hot: 3.4
      }],
      ['sconce', { pos: [-1.76, 2.10, 1.5], kelvin: 3050, lumens: 130, radius: 3.2, flicker: 0.05, dir: [1, -0.5, -0.4], shaft: 0.14 }]
    ]
  }
}

export const INTERIORS = {
  'lobby-night': lobby,
  'corridor-night': corridor,
  'room-dusk': roomDusk,
  bathroom,
  interrogation
}

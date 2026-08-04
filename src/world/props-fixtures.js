// 건축·위생·옥상 고정물. props.js가 재수출한다(§11 파일당 500줄 분할).

import * as THREE from 'three'
import { rng, clamp, smoothstep, noise2D, fbm } from '../core/util.js'
import {
  bevelBox, profile, lathe, tube, crumple, merge, twoSided, mirrorX, xf,
  mesh, group, groundContact
} from './kit.js'

// 오지 케이싱 단면. u = 개구부에서 바깥, v = 벽면에서 실내 쪽.
const CASING = [[0, 0], [0, 0.030], [0.010, 0.038], [0.017, 0.054], [0.031, 0.060],
  [0.043, 0.049], [0.052, 0.054], [0.064, 0.065], [0.078, 0.060], [0.078, 0]]
import { keyBrass } from './props-detail.js'

// 가로로 늘린 회전체(욕조·변기 볼처럼 타원 단면을 가진 위생도기)
function stretched (geo, sz) {
  const g = geo.clone()
  g.scale(1, 1, sz)
  g.computeVertexNormals()
  return g
}

export function radiator (seed = 1, o = {}) {
  const cols = o.cols ?? 11
  const root = group('radiator')
  const h = o.h ?? 0.62
  const colGeo = lathe([[0.028, 0.02], [0.040, 0.06], [0.032, 0.16], [0.040, 0.30],
    [0.032, h - 0.16], [0.040, h - 0.06], [0.028, h - 0.02]], 12)
  const g = [], m = []
  const r = rng(seed)
  for (let i = 0; i < cols; i++) {
    const x = (i - (cols - 1) / 2) * 0.062
    g.push(colGeo); m.push(xf([x, 0, 0], [0, r() * 0.5, 0]))
    g.push(lathe([[0.030, 0], [0.046, 0.012], [0.046, 0.03], [0.030, 0.042]], 12)); m.push(xf([x, 0, 0]))
    g.push(lathe([[0.030, h - 0.042], [0.046, h - 0.03], [0.046, h - 0.012], [0.030, h]], 12)); m.push(xf([x, 0, 0]))
  }
  const span = cols * 0.062
  g.push(tube([[-span * 0.5, 0.03, 0], [span * 0.5, 0.03, 0]], 0.026, 4, 10)); m.push(null)
  g.push(tube([[-span * 0.5, h - 0.03, 0], [span * 0.5, h - 0.03, 0]], 0.026, 4, 10)); m.push(null)
  root.add(mesh(merge(g, m), 'steel.rusted', { wear: 1.0, seed }))
  const valve = mesh(lathe([[0.018, 0], [0.030, 0.02], [0.024, 0.05], [0.044, 0.062], [0.040, 0.08], [0.012, 0.086]], 14),
    'brass.tarnished', { wear: 0.8, seed: seed + 1 })
  valve.position.set(span * 0.5 - 0.02, 0.10, 0.02)
  root.add(valve)
  groundContact(root, { strength: 0.7, spread: 1.1 })
  return { root, anchors: { top: [0, h, 0] } }
}

export function sink (seed = 1) {
  const root = group('sink')
  const h = 0.80
  const pedestal = mesh(lathe([[0.13, 0], [0.145, 0.015], [0.105, 0.08], [0.078, 0.34],
    [0.086, h - 0.18], [0.135, h - 0.10], [0.16, h - 0.06]], 30), 'ceramic.sink', { wear: 0.55, seed })
  const basin = mesh(lathe([[0, h - 0.06], [0.20, h - 0.055], [0.245, h - 0.02], [0.252, h],
    [0.240, h + 0.006], [0.198, h - 0.012], [0.16, h - 0.10], [0.06, h - 0.14], [0, h - 0.142]], 34),
    'ceramic.sink', { wear: 0.4, seed: seed + 1 })
  const splash = mesh(bevelBox(0.42, 0.14, 0.05, 0.012, 2), 'ceramic.sink', { wear: 0.5, seed: seed + 2 })
  splash.position.set(0, h + 0.06, -0.20)
  root.add(pedestal, basin, splash)
  const g = [], m = []
  for (const s of [-1, 1]) {
    g.push(lathe([[0.020, 0], [0.026, 0.012], [0.018, 0.05], [0.030, 0.062], [0.014, 0.07]], 12))
    m.push(xf([s * 0.10, h + 0.005, -0.155]))
    g.push(tube([[s * 0.10, h + 0.07, -0.155], [s * 0.056, h + 0.075, -0.155], [s * 0.056, h + 0.072, -0.148]], 0.011, 8, 6))
    m.push(null)
  }
  g.push(tube([[0, h + 0.005, -0.17], [0, h + 0.115, -0.165], [0, h + 0.125, -0.10], [0, h + 0.10, -0.055]], 0.017, 20, 10))
  m.push(null)
  root.add(mesh(merge(g, m), 'brass.tarnished', { wear: 0.75, seed: seed + 3 }))
  groundContact(root, { strength: 0.62, spread: 0.75 })
  return { root, anchors: { basin: [0, h - 0.09, 0], tap: [0, h + 0.10, -0.06] } }
}

export function mirrorCabinet (seed = 1) {
  const root = group('mirrorCabinet')
  const w = 0.46, h = 0.62, d = 0.13
  const box = mesh(bevelBox(w, h, d, 0.008, 2), 'wood.painted.white', { wear: 0.8, seed })
  box.position.z = -d * 0.5
  root.add(box)
  const door = group('door')
  const frame = mesh(bevelBox(w - 0.01, h - 0.01, 0.022, 0.006, 2), 'wood.painted.white', { wear: 0.9, seed: seed + 1 })
  const glass = mesh(bevelBox(w - 0.07, h - 0.07, 0.008, 0.003, 1), 'mirror.aged', { wear: 0.3, seed: seed + 2 })
  glass.position.z = 0.010
  const knob = mesh(lathe([[0.006, 0], [0.010, 0.008], [0.016, 0.020], [0.010, 0.028], [0, 0.030]], 14), 'brass.polished', { wear: 0.5, seed: seed + 3 })
  knob.rotation.x = -Math.PI / 2
  knob.position.set(w * 0.5 - 0.055, 0, 0.014)
  door.add(frame, glass, knob)
  door.position.set(-w * 0.5 + 0.01, 0, 0.012)
  door.rotation.y = 0.10                     // 살짝 열린 상태 — 반사면 각도가 벽과 달라야 G5가 읽힌다
  door.children.forEach(c => { c.position.x += w * 0.5 - 0.01 })
  root.add(door)
  return { root, anchors: { mirror: [0, 0, 0.03] } }
}

export function bathtub (seed = 1) {
  const root = group('bathtub')
  const prof = [[0, 0.14], [0.36, 0.145], [0.375, 0.24], [0.40, 0.50], [0.415, 0.545],
    [0.398, 0.555], [0.372, 0.50], [0.352, 0.26], [0.33, 0.20], [0, 0.195]]
  const shell = mesh(stretched(lathe(prof, 36), 1.95), 'ceramic.sink', { wear: 0.5, seed })
  root.add(shell)
  const g = [], m = []
  const claw = lathe([[0.020, 0], [0.052, 0.018], [0.042, 0.05], [0.024, 0.09], [0.030, 0.125], [0.018, 0.145]], 14)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.push(claw); m.push(xf([sx * 0.30, 0, sz * 0.60]))
  }
  root.add(mesh(merge(g, m), 'brass.tarnished', { wear: 0.95, seed: seed + 1 }))
  const tap = mesh(tube([[0, 0.50, -0.74], [0, 0.60, -0.72], [0, 0.62, -0.63], [0, 0.575, -0.58]], 0.019, 18, 10),
    'brass.tarnished', { wear: 0.85, seed: seed + 2 })
  root.add(tap)
  groundContact(root, { strength: 0.72, spread: 0.95 })
  return { root, anchors: { rim: [0, 0.55, 0], drain: [0, 0.155, 0.45] } }
}

export function toilet (seed = 1) {
  const root = group('toilet')
  const bowl = mesh(stretched(lathe([[0, 0], [0.11, 0], [0.125, 0.06], [0.10, 0.22],
    [0.145, 0.36], [0.165, 0.40], [0.150, 0.405], [0.118, 0.36], [0.10, 0.30], [0, 0.30]], 28), 1.42),
    'ceramic.sink', { wear: 0.55, seed })
  const seatRing = mesh(stretched(lathe([[0.098, 0.41], [0.168, 0.412], [0.170, 0.428], [0.096, 0.426]], 28), 1.42),
    'bakelite.black', { wear: 0.6, seed: seed + 1 })
  const lid = mesh(crumple(bevelBox(0.30, 0.022, 0.19, 0.009, 2), { amp: 0.001, freq: 3, seed: seed + 2 }),
    'bakelite.black', { wear: 0.5, seed: seed + 2 })
  lid.position.set(0, 0.52, -0.20)
  lid.rotation.x = 1.30
  const tank = mesh(bevelBox(0.40, 0.36, 0.17, 0.014, 2), 'ceramic.sink', { wear: 0.5, seed: seed + 3 })
  tank.position.set(0, 0.62, -0.30)
  const tankLid = mesh(bevelBox(0.44, 0.035, 0.20, 0.010, 2), 'ceramic.sink', { wear: 0.7, seed: seed + 4 })
  tankLid.position.set(0, 0.80, -0.30)
  const lever = mesh(tube([[0.16, 0.74, -0.22], [0.21, 0.735, -0.21]], 0.010, 4, 6), 'brass.tarnished', { wear: 0.8, seed: seed + 5 })
  root.add(bowl, seatRing, lid, tank, tankLid, lever)
  groundContact(root, { strength: 0.68, spread: 0.85 })
  return { root, anchors: { seat: [0, 0.43, 0] } }
}

export function towelRack (seed = 1, o = {}) {
  const root = group('towelRack')
  const w = o.w ?? 0.52
  const g = [], m = []
  g.push(tube([[-w * 0.5, 0, 0.06], [w * 0.5, 0, 0.06]], 0.010, 4, 8)); m.push(null)
  for (const s of [-1, 1]) {
    g.push(tube([[s * w * 0.5, 0, 0], [s * w * 0.5, 0, 0.06]], 0.008, 4, 6)); m.push(null)
    g.push(lathe([[0.020, 0], [0.026, 0.006], [0.014, 0.014]], 12)); m.push(xf([s * w * 0.5, 0, 0], [Math.PI / 2, 0, 0]))
  }
  root.add(mesh(merge(g, m), 'brass.tarnished', { wear: 0.8, seed }))

  // 걸린 수건 — 봉을 넘어 양쪽으로 늘어지고 아래로 갈수록 주름이 벌어진다
  const tw = 0.30, th = 0.44
  const geo = new THREE.PlaneGeometry(tw, th, 20, 30)
  const pos = geo.attributes.position
  const n = noise2D(seed + 4)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i)
    const t = clamp((th * 0.5 - y) / th, 0, 1)
    const fold = smoothstep(clamp(t * 6, 0, 1))
    const wr = fbm(n, x * 12, y * 9, 4)
    pos.setXYZ(i, x + wr * 0.006, th * 0.5 - fold * th * 0.98, 0.06 + Math.cos(t * Math.PI * (1 - fold * 0.02)) * 0.028 + wr * 0.012 * fold)
  }
  geo.computeVertexNormals()
  const towel = mesh(twoSided(geo), 'paper.aged', { wear: 0.35, seed: seed + 5 })
  towel.position.set(0.02, 0, 0)
  const towel2 = mesh(twoSided(geo), 'paper.aged', { wear: 0.5, seed: seed + 6 })
  towel2.position.set(0.02, 0, -0.014)
  towel2.rotation.z = 0.03
  root.add(towel, towel2)
  return { root, anchors: { bar: [0, 0, 0.06] } }
}

export function doorUnit (seed = 1, o = {}) {
  const root = group('doorUnit')
  const w = o.w ?? 0.92, h = o.h ?? 2.10
  const jambRun = profile(CASING, [[-w * 0.5, 0, 0], [-w * 0.5, h + 0.078, 0]])
  const cg = [
    jambRun,
    mirrorX(jambRun),
    profile(CASING, [[-w * 0.5 - 0.078, h, 0], [w * 0.5 + 0.078, h, 0]], { up: [0, 0, 1] })
  ]
  root.add(mesh(merge(cg), o.trim ?? 'wood.painted.white', { wear: 0.85, seed }))

  const door = group('slab')
  const slab = mesh(bevelBox(w - 0.012, h - 0.012, 0.045, 0.006, 2), o.door ?? 'wood.varnished.dark', { wear: 0.7, seed: seed + 1 })
  door.add(slab)
  const pg = [], pm = []
  for (const [py, ph] of [[h * 0.72, h * 0.36], [h * 0.30, h * 0.34]]) {
    // seg 2 → 1. 모따기 반경은 그대로고 코너 분할만 줄인다 — 문 8짝 × 패널 4장이
    // 복도 삼각형 예산의 5%를 먹고 있었고, 이 크기에서 분할 차이는 화면에 안 남는다.
    pg.push(bevelBox(w - 0.24, ph, 0.014, 0.008, 1)); pm.push(xf([0, py - h * 0.5, 0.024]))
    pg.push(bevelBox(w - 0.30, ph - 0.06, 0.010, 0.006, 1)); pm.push(xf([0, py - h * 0.5, 0.020]))
  }
  door.add(mesh(merge(pg, pm), o.door ?? 'wood.varnished.dark', { wear: 0.85, seed: seed + 2 }))
  const knob = mesh(lathe([[0.008, 0], [0.014, 0.010], [0.013, 0.030], [0.028, 0.042], [0.030, 0.056], [0.020, 0.066], [0, 0.070]], 18),
    'brass.polished', { wear: 0.55, seed: seed + 3 })
  knob.rotation.x = -Math.PI / 2
  knob.position.set(w * 0.5 - 0.085, 0.02, 0.024)
  const rose = mesh(lathe([[0, 0], [0.031, 0.002], [0.033, 0.008], [0.012, 0.012]], 18), 'brass.polished', { wear: 0.7, seed: seed + 4 })
  rose.rotation.x = -Math.PI / 2
  rose.position.set(w * 0.5 - 0.085, 0.02, 0.024)
  const plate = mesh(bevelBox(0.075, 0.115, 0.005, 0.003, 1), 'brass.polished', { wear: 0.75, seed: seed + 5 })
  plate.position.set(0, h * 0.28, 0.026)
  door.add(knob, rose, plate)
  door.position.y = h * 0.5
  door.rotation.y = o.open ?? 0
  if (o.open) door.position.x = -w * 0.5
  root.add(door)

  const hg = [], hm = []
  for (const y of [h * 0.18, h * 0.52, h * 0.86]) {
    hg.push(lathe([[0, 0], [0.014, 0], [0.014, 0.085], [0, 0.085]], 10)); hm.push(xf([-w * 0.5 - 0.004, y - 0.04, 0.012]))
  }
  root.add(mesh(merge(hg, hm), 'brass.tarnished', { wear: 0.9, seed: seed + 6 }))
  return { root, door, anchors: { knob: [w * 0.5 - 0.085, h * 0.5 + 0.02, 0.05], plate: [0, h * 0.78, 0.03] } }
}

export function elevatorDoors (seed = 1, o = {}) {
  const root = group('elevatorDoors')
  const w = o.w ?? 1.30, h = o.h ?? 2.20
  const surround = [[0, 0], [0, 0.034], [0.014, 0.046], [0.030, 0.070], [0.048, 0.062],
    [0.062, 0.072], [0.082, 0.086], [0.106, 0.078], [0.106, 0]]
  const jambRun = profile(surround, [[-w * 0.5, 0, 0], [-w * 0.5, h + 0.106, 0]])
  const sg = [
    jambRun,
    mirrorX(jambRun),
    profile(surround, [[-w * 0.5 - 0.106, h, 0], [w * 0.5 + 0.106, h, 0]], { up: [0, 0, 1] })
  ]
  root.add(mesh(merge(sg), 'brass.tarnished', { wear: 0.8, seed }))

  // 아르데코 셰브런 — 문짝마다 계단식으로 좁아지는 돋을새김
  const lg = [], lm = []
  for (const s of [-1, 1]) {
    const cx = s * w * 0.25
    lg.push(bevelBox(w * 0.5 - 0.008, h, 0.05, 0.006, 2)); lm.push(xf([cx, h * 0.5, 0]))
    for (let i = 0; i < 7; i++) {
      const bw = (w * 0.5 - 0.10) * (1 - i * 0.10)
      lg.push(bevelBox(bw, 0.055, 0.016, 0.005, 2)); lm.push(xf([cx, h * 0.30 + i * 0.075, 0.028]))
      lg.push(bevelBox(bw * 0.7, 0.030, 0.012, 0.004, 1)); lm.push(xf([cx, h * 0.30 + i * 0.075 + 0.036, 0.030]))
    }
    lg.push(bevelBox(w * 0.5 - 0.09, 0.020, 0.014, 0.004, 1)); lm.push(xf([cx, h * 0.86, 0.028]))
    lg.push(bevelBox(w * 0.5 - 0.13, 0.020, 0.014, 0.004, 1)); lm.push(xf([cx, h * 0.90, 0.028]))
  }
  root.add(mesh(merge(lg, lm), 'brass.polished', { wear: 0.65, seed: seed + 1 }))

  // 층 인디케이터 — 반원 다이얼 + 눈금 + 바늘
  const ind = group('indicator')
  const dial = mesh(lathe([[0, 0], [0.20, 0], [0.205, 0.014], [0.18, 0.022], [0, 0.022]], 26, { phiLength: Math.PI }),
    'brass.tarnished', { wear: 0.7, seed: seed + 2 })
  dial.rotation.x = -Math.PI / 2
  dial.rotation.z = Math.PI / 2
  const face = mesh(lathe([[0, 0.023], [0.175, 0.023]], 26, { phiLength: Math.PI }), 'paper.aged', { cast: false })
  face.rotation.x = -Math.PI / 2
  face.rotation.z = Math.PI / 2
  const tg = [], tm = []
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10)
    tg.push(bevelBox(0.008, 0.036, 0.006, 0.002, 1))
    tm.push(xf([Math.cos(a) * 0.145, Math.sin(a) * 0.145, 0.028], [0, 0, a - Math.PI / 2]))
  }
  tg.push(bevelBox(0.010, 0.155, 0.008, 0.003, 1))
  tm.push(xf([Math.cos(2.1) * 0.075, Math.sin(2.1) * 0.075, 0.032], [0, 0, 2.1 - Math.PI / 2]))
  ind.add(dial, face, mesh(merge(tg, tm), 'bakelite.black', { wear: 0.4, seed: seed + 3 }))
  ind.position.set(0, h + 0.22, 0.02)
  root.add(ind)
  return { root, anchors: { indicator: [0, h + 0.22, 0.05], leftLeaf: [-w * 0.25, h * 0.5, 0.03] } }
}

export function waterTank (seed = 1, o = {}) {
  const root = group('waterTank')
  const r0 = o.r ?? 1.35, h = o.h ?? 2.30
  const staves = o.staves ?? 40
  const rnd = rng(seed)
  const sg = [], sm = []
  for (let i = 0; i < staves; i++) {
    const a = i / staves * Math.PI * 2
    const wob = 1 + (rnd() - 0.5) * 0.012
    sg.push(bevelBox(r0 * 2 * Math.PI / staves * 0.94, h * wob, 0.075, 0.006, 1))
    sm.push(xf([Math.cos(a) * r0, h * 0.5, Math.sin(a) * r0], [0, -a, 0]))
  }
  root.add(mesh(merge(sg, sm), 'wood.varnished.dark', { wear: 1.0, seed: seed + 1, tint: 0x4a4034 }))

  const bg = [], bm = []
  for (const by of [0.22, h * 0.5, h - 0.26]) {
    bg.push(tube(Array.from({ length: 24 }, (_, i) => {
      const a = i / 24 * Math.PI * 2
      return [Math.cos(a) * (r0 + 0.045), by, Math.sin(a) * (r0 + 0.045)]
    }), 0.030, 72, 7, true))
    bm.push(null)
  }
  root.add(mesh(merge(bg, bm), 'steel.rusted', { wear: 1.0, seed: seed + 2 }))

  const roof = mesh(lathe([[r0 + 0.10, h], [r0 + 0.05, h + 0.04], [r0 * 0.5, h + 0.32], [0, h + 0.46]], 40),
    'wood.varnished.dark', { wear: 1.0, seed: seed + 3, tint: 0x3e352b })
  root.add(roof)
  const hatch = mesh(bevelBox(0.62, 0.05, 0.62, 0.010, 2), 'wood.varnished.dark', { wear: 1.0, seed: seed + 4 })
  hatch.position.set(r0 * 0.34, h + 0.235, 0)
  hatch.rotation.set(0, 0.18, -0.42)
  const hinge = mesh(tube([[r0 * 0.05, h + 0.30, -0.30], [r0 * 0.05, h + 0.30, 0.30]], 0.016, 4, 7), 'steel.rusted', { wear: 1.0, seed: seed + 5 })
  root.add(hatch, hinge)

  const lg = [], lm = []
  for (const s of [-1, 1]) {
    lg.push(tube([[r0 + 0.11, 0.02, s * 0.24], [r0 + 0.11, h + 0.30, s * 0.24]], 0.022, 4, 8)); lm.push(null)
  }
  for (let i = 0; i < 9; i++) {
    lg.push(tube([[r0 + 0.11, 0.22 + i * 0.28, -0.24], [r0 + 0.11, 0.22 + i * 0.28, 0.24]], 0.016, 4, 7)); lm.push(null)
  }
  root.add(mesh(merge(lg, lm), 'steel.rusted', { wear: 1.0, seed: seed + 6 }))
  groundContact(root, { strength: 0.75, spread: 1.0 })
  return { root, anchors: { hatch: [r0 * 0.34, h + 0.26, 0], ladderTop: [r0 + 0.11, h + 0.30, 0] } }
}

export function fireEscape (seed = 1, o = {}) {
  const root = group('fireEscape')
  const w = o.w ?? 2.0, d = o.d ?? 1.05
  const g = [], m = []
  for (let i = 0; i < 16; i++) {
    const z = -d * 0.5 + 0.03 + i * (d - 0.06) / 15
    g.push(tube([[-w * 0.5, 0, z], [w * 0.5, 0, z]], 0.011, 4, 5)); m.push(null)
  }
  for (const s of [-1, 1]) {
    g.push(tube([[s * w * 0.5, -0.02, -d * 0.5], [s * w * 0.5, -0.02, d * 0.5]], 0.026, 4, 7)); m.push(null)
    g.push(tube([[s * w * 0.5, 0, -d * 0.5], [s * w * 0.5, 1.02, -d * 0.5]], 0.020, 4, 8)); m.push(null)
    g.push(tube([[s * w * 0.5, 0, d * 0.5], [s * w * 0.5, 1.02, d * 0.5]], 0.020, 4, 8)); m.push(null)
  }
  for (const y of [1.02, 0.52]) {
    g.push(tube([[-w * 0.5, y, d * 0.5], [w * 0.5, y, d * 0.5]], 0.017, 4, 7)); m.push(null)
    for (const s of [-1, 1]) { g.push(tube([[s * w * 0.5, y, -d * 0.5], [s * w * 0.5, y, d * 0.5]], 0.017, 4, 7)); m.push(null) }
  }
  for (let i = 0; i < 13; i++) {
    const x = -w * 0.5 + 0.08 + i * (w - 0.16) / 12
    g.push(tube([[x, 0.02, d * 0.5], [x, 1.0, d * 0.5]], 0.008, 4, 5)); m.push(null)
  }
  for (let i = 0; i < 8; i++) {                       // 하강 계단
    g.push(bevelBox(0.60, 0.026, 0.24, 0.005, 1))
    m.push(xf([w * 0.5 - 0.34, -0.08 - i * 0.22, d * 0.5 - 0.14 - i * 0.26]))
  }
  root.add(mesh(merge(g, m), 'steel.rusted', { wear: 1.0, seed }))
  return { root, anchors: { deck: [0, 0.02, 0] } }
}

export function ventPipe (seed = 1, o = {}) {
  const root = group('ventPipe')
  const h = o.h ?? 1.5
  const body = mesh(tube([[0, 0, 0], [0, h * 0.55, 0], [0, h * 0.8, 0.06], [0, h, 0.28], [0.14, h + 0.04, 0.46]], 0.085, 40, 16),
    'steel.galvanized', { wear: 0.9, seed })
  root.add(body)
  const g = [], m = []
  for (const y of [0.12, h * 0.52, h * 0.78]) {
    g.push(lathe([[0.086, 0], [0.104, 0.008], [0.104, 0.036], [0.086, 0.044]], 20)); m.push(xf([0, y, y > h * 0.7 ? 0.03 : 0]))
  }
  g.push(lathe([[0, 0], [0.13, 0.02], [0.135, 0.03], [0.05, 0.05]], 20)); m.push(xf([0.18, h + 0.08, 0.53], [0.5, 0, 0.4]))
  root.add(mesh(merge(g, m), 'steel.rusted', { wear: 1.0, seed: seed + 1 }))
  groundContact(root, { strength: 0.55, spread: 1.4 })
  return { root, anchors: { mouth: [0.20, h + 0.06, 0.52] } }
}

export function keyRack (seed = 1, o = {}) {
  const root = group('keyRack')
  const cols = o.cols ?? 8, rows = o.rows ?? 5
  const cw = 0.085, ch = 0.11
  const w = cols * cw + 0.05, h = rows * ch + 0.05
  const back = mesh(bevelBox(w, h, 0.028, 0.008, 2), 'wood.varnished.dark', { wear: 0.85, seed })
  back.position.z = -0.014
  root.add(back)
  const g = [], m = []
  for (let i = 0; i <= cols; i++) {
    g.push(bevelBox(0.007, h - 0.04, 0.055, 0.002, 1))
    m.push(xf([-w * 0.5 + 0.025 + i * cw, 0, 0.014]))
  }
  for (let j = 0; j <= rows; j++) {
    g.push(bevelBox(w - 0.04, 0.007, 0.055, 0.002, 1))
    m.push(xf([0, -h * 0.5 + 0.025 + j * ch, 0.014]))
  }
  root.add(mesh(merge(g, m), 'wood.varnished.dark', { wear: 0.95, seed: seed + 1 }))

  const r = rng(seed + 2)
  const kg = [], km = [], sg = [], sm = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = -w * 0.5 + 0.025 + (i + 0.5) * cw
      const y = -h * 0.5 + 0.025 + (j + 0.5) * ch
      sg.push(bevelBox(cw - 0.026, 0.028, 0.004, 0.001, 1)); sm.push(xf([x, y - ch * 0.32, 0.030], [0, 0, (r() - 0.5) * 0.12]))
      if (r() > 0.42) continue                        // 빈 칸 = 투숙 중 (공간 서사)
      kg.push(keyBrass(seed + i * 7 + j * 13).root.children[0].geometry)
      km.push(xf([x, y + 0.012, 0.026], [Math.PI / 2, 0, (r() - 0.5) * 0.3], 1))
    }
  }
  root.add(mesh(merge(sg, sm), 'paper.aged', { wear: 0.5, seed: seed + 3 }))
  if (kg.length) root.add(mesh(merge(kg, km), 'brass.tarnished', { wear: 0.9, seed: seed + 4 }))
  return { root, anchors: { face: [0, 0, 0.06], w, h } }
}

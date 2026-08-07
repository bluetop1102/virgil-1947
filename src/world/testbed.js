// 재질·소품 쇼케이스 룸. 레벨이 하나도 없어도 그래픽 계약이 눈으로 검증되게 하는 조기 판정면.
// 레벨 모듈이 등록되면 testbed-* 샷에서만 보이고 나머지 샷에서는 스스로 숨는다.

import * as THREE from 'three'
import { rng, clamp, lerp, kelvin, noise2D, fbm } from '../core/util.js'
import { bevelBox, profile, lathe, merge, mesh, group, groundContact } from './kit.js'
import * as P from './props.js'

const SWATCH = [
  'marble.lobby.floor', 'brass.polished', 'glass.clear', 'wood.varnished.dark',
  'mirror.aged', 'ceramic.sink', 'water.dark', 'bakelite.black',
  'tile.subway.white', 'brass.tarnished', 'steel.galvanized', 'glass.frosted',
  'fabric.velvet.red', 'plaster.cracked', 'leather.worn.brown', 'tile.hex.bathroom',
  'carpet.corridor.red', 'steel.rusted', 'wallpaper.damask.green', 'paper.aged',
  'concrete.rooftop', 'fabric.wool.suit', 'wood.painted.white', 'grime.overlay'
]

const RX = 4.2, RZ0 = -4.7, RZ1 = 6.4, RY = 3.4
const BENCH_Y = 0.80, BENCH_Z = -0.675, RISER_Y = 1.36, RISER_Z = -1.80

const BASE_PROFILE = [[0, 0], [0.145, 0], [0.145, 0.022], [0.128, 0.030], [0.126, 0.042],
  [0.138, 0.050], [0.112, 0.062], [0.020, 0.062], [0.014, 0.030], [0, 0.026]]
const CROWN_PROFILE = [[0, 0], [0.190, 0], [0.180, 0.040], [0.150, 0.058], [0.126, 0.098],
  [0.078, 0.140], [0.030, 0.158], [0, 0.160]]

// 벽마다 런 방향과 up이 달라야 단면이 실내를 향한다(kit.profile 프레임 규약).
const RUNS = {
  base: [
    [[-RX, 0, RZ0], [RX, 0, RZ0], [0, 0, 1]],
    [[-RX, 0, RZ1], [-RX, 0, RZ0], [1, 0, 0]],
    [[RX, 0, RZ0], [RX, 0, RZ1], [-1, 0, 0]],
    [[RX, 0, RZ1], [-RX, 0, RZ1], [0, 0, -1]]
  ],
  crown: [
    [[RX, RY, RZ0], [-RX, RY, RZ0], [0, 0, 1]],
    [[-RX, RY, RZ0], [-RX, RY, RZ1], [1, 0, 0]],
    [[RX, RY, RZ1], [RX, RY, RZ0], [-1, 0, 0]],
    [[-RX, RY, RZ1], [RX, RY, RZ1], [0, 0, -1]]
  ]
}

function envTexture (renderer) {
  const W = 64, H = 32
  const data = new Uint16Array(W * H * 4)
  const n = noise2D(3)
  for (let y = 0; y < H; y++) {
    const el = (0.5 - (y + 0.5) / H) * Math.PI
    for (let x = 0; x < W; x++) {
      const az = (x + 0.5) / W * Math.PI * 2
      const up = clamp(Math.sin(el), 0, 1)
      const down = clamp(-Math.sin(el), 0, 1)
      const warm = Math.pow(clamp(Math.cos(az - 0.85) * Math.cos(el * 1.15), 0, 1), 7)
      const cool = Math.pow(clamp(Math.cos(az - 3.6) * Math.cos(el * 1.1), 0, 1), 5)
      const g = fbm(n, x * 0.12, y * 0.12, 3) * 0.006
      const i = (y * W + x) * 4
      data[i] = THREE.DataUtils.toHalfFloat(0.016 + up * 0.026 + down * 0.013 + warm * 0.52 + cool * 0.03 + g)
      data[i + 1] = THREE.DataUtils.toHalfFloat(0.021 + up * 0.038 + down * 0.011 + warm * 0.30 + cool * 0.05 + g)
      data[i + 2] = THREE.DataUtils.toHalfFloat(0.036 + up * 0.068 + down * 0.009 + warm * 0.12 + cool * 0.09 + g)
      data[i + 3] = THREE.DataUtils.toHalfFloat(1)
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.LinearSRGBColorSpace
  tex.needsUpdate = true
  const pm = new THREE.PMREMGenerator(renderer)
  const rt = pm.fromEquirectangular(tex)
  pm.dispose()
  tex.dispose()
  return rt.texture
}

function dotTexture () {
  const s = 32
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const gr = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function keyLight (kind, kelvinK, intensity, angle, from, to, q) {
  const l = new THREE.SpotLight(new THREE.Color().setRGB(...kelvin(kelvinK)), intensity, 26, angle, 0.62, 2)  // lint-allow: light-direct (ARCH §6.5 폐집합)
  l.name = kind
  l.position.set(from[0], from[1], from[2])
  l.target.position.set(to[0], to[1], to[2])
  l.castShadow = true
  l.shadow.mapSize.set(q.shadowMap, q.shadowMap)
  l.shadow.camera.near = 0.5
  l.shadow.camera.far = 22
  l.shadow.bias = -0.0007
  l.shadow.normalBias = 0.022
  l.shadow.radius = 4.5
  l.shadow.blurSamples = 12
  return l
}

function shell (root) {
  const floor = mesh(new THREE.PlaneGeometry(RX * 2, RZ1 - RZ0, 8, 8), 'marble.lobby.floor',
    { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, (RZ0 + RZ1) * 0.5], cast: false })
  const ceil = mesh(new THREE.PlaneGeometry(RX * 2, RZ1 - RZ0, 4, 4), 'plaster.cracked',
    { rot: [Math.PI / 2, 0, 0], pos: [0, RY, (RZ0 + RZ1) * 0.5], cast: false })
  root.add(floor, ceil)
  const d = RZ1 - RZ0, cz = (RZ0 + RZ1) * 0.5
  root.add(mesh(bevelBox(RX * 2, RY, 0.25, 0.02, 2), 'wallpaper.damask.green', { pos: [0, RY * 0.5, RZ0 - 0.125], cast: false }))
  root.add(mesh(bevelBox(RX * 2, RY, 0.25, 0.02, 2), 'wallpaper.damask.green', { pos: [0, RY * 0.5, RZ1 + 0.125], cast: false }))
  root.add(mesh(bevelBox(0.25, RY, d, 0.02, 2), 'plaster.cracked', { pos: [-RX - 0.125, RY * 0.5, cz], cast: false }))
  root.add(mesh(bevelBox(0.25, RY, d, 0.02, 2), 'plaster.cracked', { pos: [RX + 0.125, RY * 0.5, cz], cast: false }))

  const trim = []
  for (const [a, b, up] of RUNS.base) trim.push(profile(BASE_PROFILE, [a, b], { up }))
  for (const [a, b, up] of RUNS.crown) trim.push(profile(CROWN_PROFILE, [a, b], { up }))
  root.add(mesh(merge(trim), 'wood.painted.white', { wear: 0.8, seed: 21 }))
}

function bench (root) {
  const top = mesh(bevelBox(6.9, 0.06, 0.75, 0.010, 2), 'wood.varnished.dark',
    { wear: 0.55, seed: 31, pos: [0, BENCH_Y - 0.03, BENCH_Z] })
  const edge = mesh(profile([[0, 0], [0, 0.052], [0.022, 0.062], [0.046, 0.058], [0.056, 0.036], [0.056, 0]],
    [[-3.45, BENCH_Y - 0.062, BENCH_Z + 0.375], [3.45, BENCH_Y - 0.062, BENCH_Z + 0.375]], { up: [0, 0, 1] }),
  'wood.varnished.dark', { wear: 0.75, seed: 32 })
  const apron = mesh(bevelBox(6.72, 0.15, 0.62, 0.010, 2), 'wood.varnished.dark',
    { wear: 0.7, seed: 33, pos: [0, BENCH_Y - 0.14, BENCH_Z - 0.02] })
  root.add(top, edge, apron)
  const lg = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = lathe([[0.045, 0], [0.052, 0.02], [0.036, 0.09], [0.044, 0.16],
        [0.032, BENCH_Y - 0.30], [0.040, BENCH_Y - 0.24], [0.030, BENCH_Y - 0.22]], 18)
      const m = new THREE.Matrix4().makeTranslation(sx * 3.18, 0, BENCH_Z + sz * 0.27)
      lg.push(leg.clone().applyMatrix4(m))
    }
  }
  root.add(mesh(merge(lg), 'wood.varnished.dark', { wear: 0.85, seed: 34 }))

  const body = mesh(bevelBox(6.9, RISER_Y - 0.05, 0.60, 0.012, 2), 'plaster.cracked',
    { wear: 0.6, seed: 35, pos: [0, (RISER_Y - 0.05) * 0.5, RISER_Z] })
  const cap = mesh(bevelBox(7.02, 0.05, 0.70, 0.010, 2), 'marble.lobby.floor',
    { wear: 0.35, seed: 36, pos: [0, RISER_Y - 0.025, RISER_Z] })
  root.add(body, cap)
}

// 앞줄은 받침대로 0.13 들어올린다. 데스크가 전경 레이어로 겹쳐도 구 하단이 잘리지 않게 하는 높이다.
const PLINTH = 0.13
const PLINTH_PROFILE = [[0.088, 0], [0.098, 0.012], [0.062, 0.032], [0.052, 0.086],
  [0.070, 0.104], [0.108, 0.120], [0.104, PLINTH]]
const RING_PROFILE = [[0.10, 0], [0.135, 0.004], [0.132, 0.016], [0.098, 0.018]]

function swatches (root) {
  const sphere = new THREE.SphereGeometry(0.185, 56, 36)
  const stands = [[], []]
  for (let i = 0; i < 24; i++) {
    const back = i >= 12
    const k = i % 12
    const x = (k - 5.5) * 0.545 + (back ? 0.27 : 0)
    const lift = back ? 0 : PLINTH
    const y = (back ? RISER_Y : BENCH_Y) + lift + 0.185
    const z = back ? RISER_Z : BENCH_Z - 0.245
    root.add(mesh(sphere, SWATCH[i], { pos: [x, y, z] }))
    const prof = back ? RING_PROFILE : PLINTH_PROFILE
    stands[back ? 1 : 0].push(lathe(prof, back ? 26 : 22).clone()
      .applyMatrix4(new THREE.Matrix4().makeTranslation(x, y - lift - 0.185, z)))
  }
  // 받침대 24개는 같은 재질이라 두 줄로 묶어 드로우콜을 24 → 2로 줄인다
  root.add(mesh(merge(stands[0]), 'brass.tarnished', { wear: 0.85, seed: 41 }))
  root.add(mesh(merge(stands[1]), 'brass.tarnished', { wear: 0.8, seed: 42 }))
  // 그레이징 각도에서의 프레넬을 보려고 측벽에 같은 24종을 판으로 건다
  const frames = []
  for (let i = 0; i < 24; i++) {
    const left = i < 12
    const k = i % 12
    const z = -4.30 + (k % 6) * 0.52
    const y = k < 6 ? 1.16 : 1.86
    const x = left ? -RX + 0.03 : RX - 0.03
    const rot = [0, left ? Math.PI / 2 : -Math.PI / 2, 0]
    root.add(mesh(bevelBox(0.46, 0.60, 0.05, 0.008, 2), SWATCH[i], { pos: [x, y, z], rot, wear: 0.25, seed: 70 + i }))
    const f = bevelBox(0.56, 0.70, 0.028, 0.008, 2)
    frames.push(f.clone().applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(x + (left ? -0.012 : 0.012), y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
      new THREE.Vector3(1, 1, 1))))
  }
  root.add(mesh(merge(frames), 'wood.painted.white', { wear: 0.7, seed: 66 }))
}

function place (root, made, pos, ry = 0, scale = 1) {
  made.root.position.set(pos[0], pos[1], pos[2])
  made.root.rotation.y = ry
  if (scale !== 1) made.root.scale.setScalar(scale)
  root.add(made.root)
  return made
}

// DOF는 화면 중앙 픽셀의 깊이로 자동 초점을 잡는다(passes/dof.js focusDist). 따라서 소품이
// testbed-props 축(2.4,1.35,3.2 → -0.6,0.85,-0.8) 중앙에 실물로 놓여야 초점이 소품에 걸린다.
// 아래 값은 t=3.47m 지점에서 타자기 몸통(y 0.955~1.055)이 중앙 광선(y=1.005)을 가로지르도록 역산한 것이다.
// 데스크를 더 당기면 초점이 뒤 라이저(5.9m)로 빠져 소품 전체가 10px 보케로 뭉개진다.
const DESK = { x: 0.52, z: 0.73, ry: 0.52, y: 0.95, w: 2.30, d: 0.86 }
const HERO = { x: -0.02, z: -0.35 }        // 중앙 광선이 꽂히는 지점(데스크 로컬)

function desk (root, lights) {
  const g = group('desk')
  g.position.set(DESK.x, 0, DESK.z)
  g.rotation.y = DESK.ry
  root.add(g)
  const y = DESK.y
  g.add(mesh(bevelBox(DESK.w, 0.052, DESK.d, 0.009, 2), 'wood.varnished.dark', { wear: 0.6, seed: 81, pos: [0, y - 0.026, 0] }))
  g.add(mesh(profile([[0, 0], [0, 0.048], [0.020, 0.058], [0.042, 0.053], [0.050, 0.032], [0.050, 0]],
    [[-DESK.w * 0.5, y - 0.058, DESK.d * 0.5], [DESK.w * 0.5, y - 0.058, DESK.d * 0.5]], { up: [0, 0, 1] }),
  'wood.varnished.dark', { wear: 0.8, seed: 82 }))
  g.add(mesh(bevelBox(DESK.w - 0.18, 0.13, DESK.d - 0.16, 0.010, 2), 'wood.varnished.dark',
    { wear: 0.7, seed: 83, pos: [0, y - 0.115, -0.02] }))
  const lg = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = lathe([[0.040, 0], [0.047, 0.018], [0.030, 0.085], [0.038, 0.15],
        [0.026, y - 0.26], [0.034, y - 0.21], [0.025, y - 0.19]], 18)
      lg.push(leg.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(sx * (DESK.w * 0.5 - 0.12), 0, sz * (DESK.d * 0.5 - 0.12))))
      groundContact(g, { x: sx * (DESK.w * 0.5 - 0.12), z: sz * (DESK.d * 0.5 - 0.12), radius: 0.13, radiusZ: 0.13, strength: 0.52 })
    }
  }
  g.add(mesh(merge(lg), 'wood.varnished.dark', { wear: 0.85, seed: 84 }))

  place(g, P.typewriter(12), [HERO.x, y, HERO.z], 0.14)
  lights.push(...place(g, P.deskLamp(11), [-0.92, y, -0.26], 0.55).lights)
  place(g, P.registerBook(13, { w: 0.34, d: 0.27 }), [0.40, y, 0.02], -0.16)
  place(g, P.telephone(14), [0.96, y, -0.24], 0.62)
  place(g, P.ashtray(15), [0.24, y, 0.30])
  const cig = place(g, P.cigarette(16), [0.278, y + 0.021, 0.322])
  cig.root.rotation.set(Math.PI * 0.5, 0, -0.55)
  place(g, P.glassTumbler(17), [0.72, y, 0.19])
  place(g, P.whiskeyBottle(18), [0.92, y, 0.09])
  place(g, P.journal(19), [-0.94, y, 0.20], 0.5)
  place(g, P.policeCamera(21), [-0.50, y, 0.28], -0.9)
  const r = rng(77)
  for (let i = 0; i < 3; i++) {
    const p = place(g, P.photoPrint(23 + i), [-0.20 + i * 0.115, y + 0.003 + i * 0.0016, 0.30 - i * 0.045], r() * 1.4 - 0.7)
    p.root.rotation.z = (r() - 0.5) * 0.05
  }
  for (let i = 0; i < 2; i++) {
    const k = place(g, P.keyBrass(30 + i), [0.56 + i * 0.075, y + 0.005, 0.33])
    k.root.rotation.set(Math.PI / 2, 0, 0.5 + i * 0.6)
  }
}

function dressBench (root) {
  const y = BENCH_Y
  place(root, P.ledger(20), [-2.62, y, BENCH_Z + 0.05], -0.26)
  place(root, P.suitcase(22), [2.88, y, BENCH_Z + 0.02], 0.28)
  place(root, P.registerBook(25, { open: false }), [-1.95, y, BENCH_Z + 0.16], 0.34)
}

function dressRoom (root, lights) {
  place(root, P.doorUnit(41, { open: 0.55 }), [-3.30, 0, RZ0 + 0.02])
  place(root, P.elevatorDoors(42), [-0.85, 0, RZ0 + 0.02])
  place(root, P.keyRack(43), [1.72, 1.52, RZ0 + 0.03])
  place(root, P.framedPicture(44), [2.92, 1.78, RZ0 + 0.03])
  place(root, P.framedPicture(45, { w: 0.34, h: 0.44, frame: 'wood.varnished.dark' }), [3.62, 2.30, RZ0 + 0.03])
  place(root, P.neonSign(46), [0.55, 2.72, RZ0 + 0.06])
  lights.push(...place(root, P.sconce(47), [-2.05, 1.94, RZ0 + 0.02]).lights)
  lights.push(...place(root, P.sconce(48), [2.32, 1.94, RZ0 + 0.02]).lights)
  place(root, P.mirrorCabinet(49), [RX - 0.03, 1.62, -3.10], -Math.PI / 2)
  place(root, P.towelRack(50), [-RX + 0.03, 1.18, -1.60], Math.PI / 2)
  place(root, P.radiator(51), [-RX + 0.14, 0, -1.05], Math.PI / 2)
  place(root, P.fireEscape(52, { w: 1.6, d: 0.85 }), [-RX + 0.44, 1.95, -3.05], Math.PI / 2)
  place(root, P.ventPipe(53, { h: 1.35 }), [RX - 0.30, 0, -4.10], -0.4)
  place(root, P.waterTank(54, { r: 0.82, h: 1.42, staves: 30 }), [2.25, 0, -3.35], 0.4)
  place(root, P.bathtub(55), [-2.20, 0, -3.55], 0.45)
  place(root, P.toilet(56), [0.32, 0, -3.62], 0.12)
  place(root, P.sink(57), [3.55, 0, -2.05], -1.15)
  place(root, P.bed(58), [-3.15, 0, 0.85], Math.PI / 2)
  place(root, P.nightstand(59), [-3.62, 0, -0.52], 0.2)
  place(root, P.rugRunner(60, { w: 1.25, len: 3.4 }), [-0.90, 0, 1.95], Math.PI / 2)
  // 근경 오클루더 — testbed-props 축에서 좌측 34°·1.75m. 초점(3.47m) 밖이라 보케로 뭉개지며
  // 전/중/후경 3층 심도를 만든다(G9). 데스크 좌측 끝(14.6°)은 가리지 않는 거리다.
  place(root, P.armchair(61), [0.75, 0, 2.62], 3.10)
  place(root, P.sideTable(62), [-2.60, 0, 2.80], 0.4)
  place(root, P.sofa(63), [2.85, 0, 0.55], -1.62)
  place(root, P.potPlant(64), [-1.02, 0, 3.60], 0.6)
  place(root, P.luggageCart(65), [-1.70, 0, 1.05], 0.5)
  const ch = place(root, P.chandelier(66), [0, RY - 0.62, 0.30])
  lights.push(...ch.lights)
}

function dust (root) {
  const n = 900
  const pos = new Float32Array(n * 3)
  const seed = new Float32Array(n)
  const r = rng(101)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = lerp(-RX + 0.3, RX - 0.3, r())
    pos[i * 3 + 1] = lerp(0.15, RY - 0.2, r())
    pos[i * 3 + 2] = lerp(RZ0 + 0.4, 5.4, r())
    seed[i] = r() * 100
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({
    size: 0.017, map: dotTexture(), transparent: true, depthWrite: false,
    opacity: 0.5, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    color: new THREE.Color().setRGB(...kelvin(3400))
  })
  const p = new THREE.Points(g, m)
  p.frustumCulled = false
  p.renderOrder = 5
  root.add(p)
  return { points: p, base: pos.slice(), seed }
}

export default {
  name: 'testbed',
  order: 70,

  async init (engine) {
    this.engine = engine
    const q = engine.quality
    this.root = group('testbed')
    engine.scene.add(this.root)
    this.lights = []

    shell(this.root)
    bench(this.root)
    swatches(this.root)
    dressBench(this.root)
    desk(this.root, this.lights)
    dressRoom(this.root, this.lights)
    // ATMOSPHERE의 ParticleField가 카메라를 따라다니는 먼지를 이미 깐다. 겹치면 가산합성 점이
    // 블룸을 타고 반딧불처럼 튀어 재질 판정을 방해한다 — 없을 때만 자체 먼지를 켠다(D8 보루).
    this.dust = this.engine.get('atmosphere') ? null : dust(this.root)

    // 키/필/림 — 색온도 2700/5600/8000K, 셋 다 그림자 캐스팅 (루브릭 G1/G4).
    // 세기는 볼류메트릭 인스캐터가 재질 판정을 덮지 않는 선까지만 올린다.
    this.key = keyLight('key', 2700, 26, 0.52, [2.95, 3.05, 2.45], [0.15, 0.92, -1.05], q)
    this.fill = keyLight('fill', 5600, 9, 0.70, [-3.55, 2.55, 2.15], [-0.70, 0.90, -1.25], q)
    this.rim = keyLight('rim', 8000, 18, 0.64, [-1.15, 3.18, -4.25], [0.45, 1.05, 0.75], q)
    this.fill.shadow.radius = 7
    for (const l of [this.key, this.fill, this.rim]) this.root.add(l, l.target)

    // ATMOSPHERE가 아직 없으면 IBL과 안개가 비어 금속이 새까맣게 죽는다 — 최소 환경을 깐다.
    this.ownsEnv = !engine.get('atmosphere') && !engine.scene.environment
    if (this.ownsEnv) {
      engine.scene.environment = envTexture(engine.renderer)
      engine.scene.environmentIntensity = 0.85
      const f = engine.look.fogColor
      engine.scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(f[0], f[1], f[2]), engine.look.fogDensity * 0.6)
    }

    const levels = ['lobby', 'corridor', 'room942', 'rooftop']
    this.hasLevels = levels.some(n => engine.get(n))
    // atmo-* 프로브 샷은 자기 공간을 y=-500에 따로 짓는다. 레벨이 아직 없더라도 testbed는 물러나야
    // 한다 — 안 그러면 프로브 조명이 재질 쇼케이스를 비추고 G1/G2를 채점할 수 없다.
    const mine = (name) => String(name).startsWith('testbed')
    engine.bus.on('qa:shot', ({ name }) => { this.show(mine(name) || (!this.hasLevels && !String(name).startsWith('atmo'))) })
    engine.bus.on('qa:state', (s) => {
      if (!s || !s.scene) return
      this.show(s.scene === 'testbed' || (!this.hasLevels && s.scene !== 'atmo-probe'))
    })
    for (const l of this.lights) l.userData.i0 = l.intensity
    this.show(!this.hasLevels)
  },

  show (v) { if (this.root) this.root.visible = v },

  update (dt, t) {
    if (!this.root || !this.root.visible) return
    const d = this.dust
    if (d) {
      const pos = d.points.geometry.attributes.position
      for (let i = 0; i < d.seed.length; i++) {
        const s = d.seed[i]
        pos.array[i * 3] = d.base[i * 3] + Math.sin(t * 0.19 + s) * 0.10
        pos.array[i * 3 + 1] = d.base[i * 3 + 1] + Math.sin(t * 0.11 + s * 1.7) * 0.07 + ((t * 0.012 + s * 0.01) % 1) * 0.2
        pos.array[i * 3 + 2] = d.base[i * 3 + 2] + Math.cos(t * 0.16 + s * 0.6) * 0.10
      }
      pos.needsUpdate = true
    }
    // 텅스텐 필라멘트의 미세 흔들림. 정지 프레임에서도 D8(죽은 화면)을 면하게 하는 시간축 요소.
    // atmosphere 모듈이 있으면 조명은 그쪽 소유라 this.key가 없다 — 그때는 건너뛴다.
    if (this.key) this.key.intensity = 26 * (1 + Math.sin(t * 7.3) * 0.012 + Math.sin(t * 2.1) * 0.018)
    for (let i = 0; i < (this.lights?.length ?? 0); i++) {
      const l = this.lights[i]
      if (l?.userData?.i0 == null) continue
      l.intensity = l.userData.i0 * (1 + Math.sin(t * 5.1 + i * 1.7) * 0.035)
    }
  }
}

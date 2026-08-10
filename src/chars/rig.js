import * as THREE from 'three'
import { rng } from '../core/util.js'
import {
  bevelBox, crumple, footContacts, lathe, merge, mesh, tube, twoSided, xf
} from '../world/kit.js'
import { addEyes, glassLens, porcelain, rimCloth, wireGlass } from './face.js'

// 아트 디렉션 (디렉터 확정 2026-08-07): 인물은 1947 복화술 인형/마리오네트 —
// 관절은 숨기지 않고 니스 목재 볼조인트 + 황동 핀으로 드러낸다. 살갗은 칠한 나무.
const SKIN = 'paper.aged'          // 칠한 목면(도장면) — wear 로 칠 벗겨짐
const WOOD = 'wood.varnished.dark' // 볼조인트·손·목 — 깎은 나무
const SHIRT = 'canvas.laundry'
const SUIT = 'fabric.wool.suit'
const LEATHER = 'leather.worn.brown'
const DARK = 'bakelite.black'
const METAL = 'brass.tarnished'
const PIN = 'brass.polished'       // 관절 축 핀
const PORCELAIN = 'ceramic.sink'   // 얼굴 자기면 — face.porcelain 이 유약·색을 얹는다

const SPHERE = new THREE.SphereGeometry(1, 24, 16)
const SMALL_SPHERE = new THREE.SphereGeometry(1, 16, 10)

const STYLES = {
  deitch: { seed: 5102, height: 1.00, shoulder: 1.00, waist: 1.04, shirt: SUIT, trousers: SUIT },
  ruiz: { seed: 4407, height: 0.94, shoulder: 0.91, waist: 1.02, shirt: SHIRT, trousers: SUIT },
  pryce: { seed: 5819, height: 1.02, shoulder: 0.94, waist: 0.91, shirt: SHIRT, trousers: SUIT },
  doyle: { seed: 3923, height: 1.05, shoulder: 1.10, waist: 0.98, shirt: SUIT, trousers: SUIT }
}

const ANCHORS = {
  deitch: ['npc/deitch'],
  ruiz: ['npc/ruiz', 'presence/ruiz-lobby'],
  pryce: ['npc/pryce', 'presence/pryce-lobby'],
  doyle: ['npc/doyle', 'presence/doyle-lobby', 'presence/doyle-corridor-1', 'presence/doyle-corridor-2']
}

function group (name) {
  const g = new THREE.Group()
  g.name = name
  return g
}

function downLimb (length, top, bottom) {
  return lathe([
    [0.012, 0], [top * 0.86, -0.018], [top, -0.055],
    [bottom * 1.06, -length + 0.055], [bottom * 0.82, -length + 0.018], [0.012, -length]
  ], 20)
}

function shapePanel (points, depth = 0.018) {
  const s = new THREE.Shape()
  points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y))
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth, steps: 1, bevelEnabled: true, bevelSegments: 2,
    bevelSize: Math.min(0.008, depth * 0.42), bevelThickness: depth * 0.35
  })
  g.translate(0, 0, -depth * 0.5)
  g.computeVertexNormals()
  return g
}

// 천은 시트 텀을 올려 쓴다. 측광에서 실루엣 가장자리가 사는지가 P1-3 의 림 응답 항목이고,
// 광원 신설은 render 소유라 재질의 광 응답까지만 손댄다. 축소 모형 천은 실제보다 보풀이
// 크게 읽히는 것이 정상이라 인형 아트 디렉션과도 어긋나지 않는다.
const CLOTH = new Set([SHIRT, SUIT])

function addPart (parent, geo, material, opts = {}) {
  const o = mesh(geo, material, opts)
  if (CLOTH.has(material)) rimCloth(o)
  if (opts.pos) o.position.fromArray(opts.pos)
  if (opts.rot) o.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2])
  if (opts.scale) o.scale.fromArray(opts.scale)
  parent.add(o)
  return o
}

// 마리오네트 볼조인트 — 니스 목재 구 + 황동 축 핀. 분절을 숨기지 않고 선언한다.
// 핀 한 벌(축·머리·와셔)은 한 지오메트리로 합친다. 볼조인트가 인물당 8개라 3→1 병합만으로
// 16 메시가 줄고, 그만큼이 눈·눈꺼풀 신설분의 예산이 된다(S-L 프레임 예산 충돌 회피).
function addBallJoint (parent, radius, seed, opts = {}) {
  const p = opts.pos ?? [0, 0, 0]
  const r = radius
  const ball = addPart(parent, SPHERE.clone(), WOOD,
    { pos: p, scale: [r, r, r], wear: 0.62, seed })
  const g = [tube([[-r * 1.12, 0, 0], [r * 1.12, 0, 0]], r * 0.16, 4, 8)]
  const t = [xf([0, 0, 0])]
  for (const s of [-1, 1]) {
    g.push(ellipsoidGeo([r * 0.24, r * 0.24, r * 0.10]))
    t.push(xf([s * r * 1.13, 0, 0], [0, Math.PI / 2, 0]))
    // 와셔 — 핀 머리와 목재 사이의 놋쇠 링. 이음매를 감추지 않고 부품으로 선언한다.
    g.push(new THREE.TorusGeometry(r * 0.30, r * 0.055, 5, 14))
    t.push(xf([s * r * 1.04, 0, 0], [0, Math.PI / 2, 0]))
  }
  addPart(parent, merge(g, t), PIN, { pos: p, wear: 0.35, seed: seed + 1 })
  return ball
}

function makeHand (side, seed) {
  // 깎은 나무 손 — 손가락은 하나로 이어진 미튼 조각(인형답게), 손목엔 볼조인트.
  const hand = group(`${side < 0 ? 'left' : 'right'}-hand`)
  addBallJoint(hand, 0.030, seed + 20, { pos: [0, 0.004, 0.004] })
  const palm = addPart(hand, bevelBox(0.078, 0.105, 0.042, 0.020, 3), WOOD,
    { pos: [0, -0.062, 0.006], wear: 0.55, seed })
  palm.rotation.z = side * 0.035
  // 손가락 5개와 마디 알을 한 지오메트리로 굽는다. 깎은 나무 손은 마디가 보여야 손으로
  // 읽히는데, 마디를 개별 메시로 얹으면 손 하나에 14 드로우콜이 된다 — 병합으로 1이다.
  const g = []
  const t = []
  const knuckle = (x, len, f) => {
    g.push(new THREE.SphereGeometry(0.0102, 10, 8))
    t.push(xf([x + side * 0.002 * f, -0.100 - len * f,
      0.008 + 0.004 * (1 - Math.abs(2 * f - 1)) - 0.004 * f], null, [1, 0.88, 0.94]))
  }
  for (let i = 0; i < 4; i++) {
    const x = side * (-0.027 + i * 0.018)
    const len = 0.070 - Math.abs(i - 1.5) * 0.010
    g.push(tube([[x, -0.100, 0.008], [x, -0.124, 0.012], [x + side * 0.002, -0.100 - len, 0.004]],
      0.0086, 8, 7))
    t.push(xf([0, 0, 0]))
    knuckle(x, len, 0.33)
    knuckle(x, len, 0.71)
  }
  g.push(tube([[side * 0.037, -0.048, 0.008], [side * 0.064, -0.068, 0.018],
    [side * 0.058, -0.100, 0.020]], 0.010, 9, 7))
  t.push(xf([0, 0, 0]))
  g.push(new THREE.SphereGeometry(0.0114, 10, 8))
  t.push(xf([side * 0.062, -0.070, 0.018], null, [1, 0.88, 0.94]))
  addPart(hand, merge(g, t), WOOD, { wear: 0.48, seed: seed + 1 })
  return hand
}

function makeArm (side, style, seed) {
  const shoulder = group(`${side < 0 ? 'left' : 'right'}-shoulder`)
  addBallJoint(shoulder, 0.058, seed + 30, { pos: [0, 0.012, 0] })
  const upper = addPart(shoulder, crumple(downLimb(0.30, 0.087, 0.072),
    { amp: 0.005, freq: 20, seed }), style.shirt, { wear: 0.30, seed })
  upper.scale.x = style.shoulder
  const elbow = group(`${side < 0 ? 'left' : 'right'}-elbow`)
  elbow.position.set(0, -0.292, 0.004)
  shoulder.add(elbow)
  addBallJoint(elbow, 0.052, seed + 1)
  addPart(elbow, crumple(downLimb(0.255, 0.069, 0.052),
    { amp: 0.004, freq: 22, seed: seed + 2 }), style.shirt, { wear: 0.34, seed: seed + 2 })
  const cuff = addPart(elbow, lathe([[0.050, -0.238], [0.059, -0.238], [0.060, -0.270],
    [0.049, -0.274]], 18), SHIRT, { wear: 0.55, seed: seed + 3 })
  cuff.scale.x = 1.08
  for (const z of [-0.034, 0.034]) addPart(elbow,
    tube([[-0.052, -0.080, z], [0, -0.104, z + 0.008], [0.052, -0.083, z]], 0.0035, 8, 6),
    style.shirt, { wear: 0.60, seed: seed + 5 })
  const wrist = group(`${side < 0 ? 'left' : 'right'}-wrist`)
  wrist.position.set(0, -0.263, 0)
  wrist.add(makeHand(side, seed + 9))
  elbow.add(wrist)
  shoulder.rotation.x = -0.08
  shoulder.rotation.z = side * 0.065
  elbow.rotation.x = -0.42
  elbow.rotation.z = side * 0.12
  wrist.rotation.z = side * 0.07
  return { shoulder, elbow, wrist, hand: wrist.children[0] }
}

function ellipsoidGeo (scale) {
  const g = SPHERE.clone()
  g.scale(scale[0], scale[1], scale[2])
  g.computeVertexNormals()
  return g
}

function makeShoe (side, seed) {
  const shoe = group(`${side < 0 ? 'left' : 'right'}-shoe`)
  addPart(shoe, bevelBox(0.125, 0.024, 0.275, 0.009, 2), DARK,
    { pos: [0, 0.017, 0.034], wear: 0.72, seed })
  addPart(shoe, crumple(bevelBox(0.118, 0.066, 0.205, 0.026, 4),
    { amp: 0.005, freq: 18, seed: seed + 1, dir: [0, 1, 0] }), LEATHER,
  { pos: [0, 0.058, 0.018], wear: 0.88, seed: seed + 1 })
  addPart(shoe, ellipsoidGeo([0.058, 0.037, 0.074]), LEATHER,
    { pos: [0, 0.064, 0.118], wear: 1.0, seed: seed + 2 })
  addPart(shoe, bevelBox(0.105, 0.055, 0.060, 0.010, 2), DARK,
    { pos: [0, 0.044, -0.088], wear: 0.80, seed: seed + 3 })
  return shoe
}

function makeLeg (side, style, seed) {
  const hip = group(`${side < 0 ? 'left' : 'right'}-hip`)
  addPart(hip, crumple(downLimb(0.435, 0.112, 0.084),
    { amp: 0.006, freq: 17, seed }), style.trousers, { wear: 0.50, seed })
  const knee = group(`${side < 0 ? 'left' : 'right'}-knee`)
  knee.position.set(0, -0.425, 0.008)
  hip.add(knee)
  addBallJoint(knee, 0.060, seed + 1)
  addPart(knee, crumple(downLimb(0.395, 0.080, 0.060),
    { amp: 0.005, freq: 19, seed: seed + 2 }), style.trousers, { wear: 0.56, seed: seed + 2 })
  const ankle = group(`${side < 0 ? 'left' : 'right'}-ankle`)
  ankle.position.set(0, -0.382, 0.018)
  ankle.add(makeShoe(side, seed + 4))
  knee.add(ankle)
  hip.rotation.x = side < 0 ? -0.025 : 0.018
  knee.rotation.x = 0.075
  return { hip, knee, ankle, foot: ankle.children[0] }
}

function addFace (head, seed) {
  // 두개·볼·귀·코는 자기 유약면(face.porcelain)으로 간다 — 유약의 미세 크랙이 절차 재질에
  // 이미 구워져 있어서, 크랙 지오메트리를 새로 얹지 않고 "공예품 인형"의 마감을 얻는다.
  porcelain(addPart(head, ellipsoidGeo([0.106, 0.141, 0.099]), PORCELAIN,
    { pos: [0, 0.105, 0], wear: 0.46, seed }))
  porcelain(addPart(head, ellipsoidGeo([0.073, 0.046, 0.068]), PORCELAIN,
    { pos: [0, 0.012, 0.032], wear: 0.52, seed: seed + 1 }))
  const eyes = addEyes(head, seed + 60, PORCELAIN)
  for (const side of [-1, 1]) {
    // 속눈썹 선. 종전 z=0.108~0.116 은 눈꺼풀(z≤0.1057)보다 앞이라 얼굴에서 떠 있었다 —
    // 눈알이 판이 아니라 구가 된 지금은 융기 위에 얹혀야 한 덩이로 읽힌다.
    addPart(head, tube([[side * 0.062, 0.1470, 0.0975], [side * 0.038, 0.1525, 0.1040],
      [side * 0.013, 0.1475, 0.0995]], 0.0034, 8, 7), SKIN, { wear: 0.25, seed: seed + 8 })
    addPart(head, tube([[side * 0.074, 0.169, 0.092], [side * 0.040, 0.176, 0.103],
      [side * 0.012, 0.171, 0.099]], 0.005, 8, 7), DARK, { wear: 0.55, seed: seed + 9 })
    porcelain(addPart(head, ellipsoidGeo([0.024, 0.039, 0.014]), PORCELAIN,
      { pos: [side * 0.107, 0.102, 0], wear: 0.32, seed: seed + 10 }))
  }
  porcelain(addPart(head, tube([[0, 0.145, 0.080], [-0.004, 0.093, 0.125], [0, 0.066, 0.138]],
    0.012, 10, 9), PORCELAIN, { wear: 0.24, seed: seed + 13 }))
  addPart(head, tube([[-0.042, 0.028, 0.103], [0, 0.018, 0.116], [0.042, 0.028, 0.103]],
    0.0048, 10, 8), LEATHER, { wear: 0.62, seed: seed + 14 })
  // 복화술 인형 턱 분리선 — 입꼬리에서 턱 아래로 파인 홈 두 줄 + 턱판 경계
  for (const side of [-1, 1]) addPart(head,
    tube([[side * 0.047, 0.040, 0.100], [side * 0.056, -0.002, 0.082], [side * 0.049, -0.030, 0.058]],
      0.0028, 8, 6), DARK, { cast: false, wear: 0.2, seed: seed + side + 40 })
  addPart(head, tube([[-0.049, -0.030, 0.058], [0, -0.040, 0.070], [0.049, -0.030, 0.058]],
    0.0024, 8, 6), DARK, { cast: false, wear: 0.2, seed: seed + 43 })
  for (const y of [0.205, 0.222]) addPart(head,
    tube([[-0.044, y, 0.087], [0, y - 0.004, 0.099], [0.044, y, 0.087]], 0.0024, 9, 6),
    SKIN, { wear: 0.48, seed: seed + Math.round(y * 100) })
  for (const side of [-1, 1]) addPart(head,
    tube([[side * 0.030, 0.086, 0.112], [side * 0.054, 0.056, 0.105], [side * 0.048, 0.035, 0.099]],
      0.0027, 8, 6), SKIN, { wear: 0.42, seed: seed + side + 30 })
  addPart(head, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), DARK,
    { pos: [0, 0.164, -0.008], scale: [0.116, 0.074, 0.106], wear: 0.35, seed: seed + 15 })
  return eyes
}

// **다이치의 두 눈이 검게 죽어 있던 원인은 안경테가 만드는 스크린스페이스 폐색이다.**
// 그림자가 아니다 — 전 씬 castShadow=false 로도 눈은 그대로 검었다(A/B `noshadow-scene`).
// 렌즈도 아니다 — 렌즈만 숨기면 무변화다(`1nolens`). 범인은 불투명 놋쇠 테 하나이고,
// 그 테를 깊이·노멀 버퍼에서 빼는 처리가 `face.wireGlass` 다(원리는 거기 주석).
// 여기 z 값은 그와 별개로 남는 물리 교정이다. 종전 테는 각막에서 28mm 앞이었는데
// 1947년 와이어 안경의 실제 각막 거리는 12mm 대다. 12mm 로 당긴다 —
// 하한은 눈꺼풀 셸 앞면 z=0.1057 이라 렌즈 림은 0.1095 아래로 못 내려간다.
const LENS_Z = 0.1095              // 렌즈 림. 눈꺼풀 앞면과 3.8mm 간극
const FRAME_Z = 0.115              // 테 링 중심. 링 두께 3mm → 앞면 0.118
function addGlasses (head, seed) {
  for (const side of [-1, 1]) {
    // 렌즈는 라이브러리 glass.clear 를 그대로 쓰면 **불투명 회갈색 판**이다(opacity 1.0).
    // 그 판이 다이치의 두 눈을 통째로 덮고 있었다 — 유리 눈을 만들어도 이걸 안 열면 안 보인다.
    // 돔 높이도 14mm → 8mm 로 낮춘다. 테를 당긴 만큼 렌즈가 테 앞으로 튀어나오면
    // 안경이 물안경이 되고, 1947 년 처방 렌즈는 실제로 거의 평면이다.
    const lens = addPart(head, new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      'glass.clear', { pos: [side * 0.039, 0.137, LENS_Z], rot: [Math.PI / 2, 0, 0],
        scale: [0.033, 0.008, 0.033], cast: false, seed })
    lens.material = glassLens()
    wireGlass(addPart(head, new THREE.TorusGeometry(0.034, 0.0030, 7, 24), METAL,
      { pos: [side * 0.039, 0.137, FRAME_Z], cast: false, wear: 0.60, seed: seed + side + 2 }))
    // 렌즈 위 반사 줄. 종전 4.1cm 는 지름 6.8cm 렌즈의 절반을 덮어 눈이 통째로 묻혔다
    // (블라인드 판독 5장 전부 "안경 렌즈 때문에 눈동자 안 보임"). 눈은 J3 그 자체다.
    addPart(head, bevelBox(0.007, 0.024, 0.003, 0.0012, 2), 'glass.frosted',
      { pos: [side * 0.052, 0.148, 0.1175], rot: [0, 0, -0.66], cast: false, seed: seed + 4 })
    wireGlass(addPart(head, tube([[side * 0.073, 0.141, 0.113], [side * 0.112, 0.140, 0.082]],
      0.003, 6, 6), METAL, { cast: false, wear: 0.58, seed: seed + side + 4 }))
  }
  wireGlass(addPart(head, tube([[-0.006, 0.142, 0.116], [0, 0.148, 0.123], [0.006, 0.142, 0.116]],
    0.0032, 7, 6), METAL, { cast: false, wear: 0.52, seed: seed + 8 }))
}

function addVest (root, seed) {
  const left = [[-0.205, 0], [-0.218, 0.31], [-0.155, 0.49], [-0.025, 0.36], [-0.012, 0.04]]
  const right = left.map(([x, y]) => [-x, y])
  addPart(root, shapePanel([[-0.105, 0], [0.105, 0], [0.060, 0.205], [0, 0.285],
    [-0.060, 0.205]], 0.015), SHIRT, { pos: [0, 1.145, 0.144], wear: 0.34, seed: seed + 16 })
  addPart(root, shapePanel(left), SUIT, { pos: [0, 0.920, 0.137], wear: 0.62, seed })
  addPart(root, shapePanel(right), SUIT, { pos: [0, 0.920, 0.137], wear: 0.70, seed: seed + 1 })
  for (const side of [-1, 1]) {
    addPart(root, tube([[side * 0.197, 0.936, 0.157], [side * 0.208, 1.225, 0.160],
      [side * 0.150, 1.405, 0.128]], 0.0042, 12, 6), SHIRT,
    { wear: 0.45, seed: seed + side + 4 })
  }
  for (let i = 0; i < 5; i++) addPart(root, ellipsoidGeo([0.012, 0.012, 0.006]), METAL,
    { pos: [0, 0.994 + i * 0.078, 0.164], wear: 0.72, seed: seed + 8 + i })
  addPart(root, shapePanel([[-0.026, 0], [0.026, 0], [0.018, 0.25], [0, 0.29], [-0.018, 0.25]], 0.012),
    LEATHER, { pos: [0, 1.165, 0.168], wear: 0.58, seed: seed + 14 })
}

function addIdentityProps (npc, root, joints, seed) {
  if (npc === 'deitch') {
    addGlasses(joints.head, seed)
    addVest(root, seed + 20)
  } else if (npc === 'ruiz') {
    addPart(root, shapePanel([[-0.20, 0], [0.20, 0], [0.18, 0.58], [-0.14, 0.58]], 0.014),
      SHIRT, { pos: [0, 0.78, 0.145], wear: 0.66, seed })
    addPart(joints.rightWrist, crumple(bevelBox(0.15, 0.025, 0.12, 0.012, 3),
      { amp: 0.008, freq: 18, seed: seed + 2 }), SHIRT,
    { pos: [0.02, -0.18, 0.02], wear: 0.72, seed: seed + 2 })
  } else if (npc === 'pryce') {
    for (const side of [-1, 1]) addPart(root,
      tube([[side * 0.145, 0.92, 0.151], [side * 0.155, 1.42, 0.142]], 0.012, 12, 7),
      LEATHER, { wear: 0.76, seed: seed + side + 3 })
  } else {
    addPart(root, shapePanel([[-0.21, 0], [0.21, 0], [0.21, 0.50], [-0.21, 0.50]], 0.016),
      SUIT, { pos: [0, 0.91, 0.143], wear: 0.84, seed })
    const wrench = addPart(joints.rightWrist,
      tube([[0, -0.12, 0], [0, -0.38, 0]], 0.018, 10, 8), 'steel.galvanized',
      { pos: [0.06, -0.08, 0.02], wear: 0.92, seed: seed + 3 })
    wrench.rotation.z = -0.18
  }
}

export function createHumanoid (npc = 'deitch', seed = STYLES[npc]?.seed ?? 1) {
  const style = STYLES[npc] ?? STYLES.deitch
  const r = rng(seed)
  const root = group(`character/${npc}`)
  const joints = {}
  const torso = addPart(root, crumple(lathe([
    [0.145 * style.waist, 0], [0.177 * style.waist, 0.08], [0.184, 0.31],
    [0.190 * style.shoulder, 0.46], [0.145 * style.shoulder, 0.54], [0.073, 0.565]
  ], 28), { amp: 0.006, freq: 14, seed }), npc === 'deitch' ? SUIT : style.shirt,
  { pos: [0, 0.895, 0], scale: [1.34, 1, 0.82], wear: 0.36, seed })
  torso.name = 'chest'
  addPart(root, ellipsoidGeo([0.266 * style.shoulder, 0.062, 0.110]), style.shirt,
    { pos: [0, 1.420, -0.004], wear: 0.34, seed: seed + 1 })
  addPart(root, lathe([[0.050, 0], [0.061, 0.025], [0.057, 0.125], [0.045, 0.145]], 20), WOOD,
    { pos: [0, 1.435, 0], wear: 0.58, seed: seed + 2 })
  addPart(root, new THREE.TorusGeometry(0.056, 0.004, 7, 22), PIN,
    { pos: [0, 1.472, 0], rot: [Math.PI / 2, 0, 0], wear: 0.3, seed: seed + 7 })
  for (const side of [-1, 1]) addPart(root,
    shapePanel([[0, 0], [side * 0.106, 0.022], [side * 0.058, 0.112], [0, 0.075]], 0.014),
    SHIRT, { pos: [0, 1.365, 0.119], wear: 0.38, seed: seed + side + 4 })

  joints.head = group('head')
  joints.head.position.set(0, 1.485, 0.006)
  root.add(joints.head)
  Object.assign(joints, addFace(joints.head, seed + 3))

  for (const side of [-1, 1]) {
    const arm = makeArm(side, style, seed + (side < 0 ? 40 : 60))
    arm.shoulder.position.set(side * 0.263 * style.shoulder, 1.405, 0)
    root.add(arm.shoulder)
    const leg = makeLeg(side, style, seed + (side < 0 ? 80 : 100))
    leg.hip.position.set(side * (0.112 + (r() - 0.5) * 0.006), 0.905, 0)
    root.add(leg.hip)
    const key = side < 0 ? 'left' : 'right'
    joints[`${key}Shoulder`] = arm.shoulder
    joints[`${key}Elbow`] = arm.elbow
    joints[`${key}Wrist`] = arm.wrist
    joints[`${key}Hip`] = leg.hip
    joints[`${key}Knee`] = leg.knee
    joints[`${key}Ankle`] = leg.ankle
  }

  addIdentityProps(npc, root, joints, seed + 120)
  root.scale.setScalar(style.height)
  footContacts(root, [[-0.112, 0.052], [0.112, 0.052]], {
    footRadius: 0.082, footStrength: 0.94, poolStrength: 0.42
  })
  root.userData.npc = npc
  root.userData.joints = joints
  root.userData.seed = seed
  return { root, joints }
}

function visibleAnchor (scene, names) {
  let hit = null
  scene.traverse(o => {
    if (hit || !names.includes(o.userData?.anchor)) return
    for (let p = o; p; p = p.parent) if (!p.visible) return
    hit = o
  })
  return hit
}

const characters = {
  name: 'characters',
  order: 30,
  rigs: new Map(),
  off: [],
  paused: false,

  async init (engine) {
    this.engine = engine
    for (const npc of Object.keys(STYLES)) {
      const rig = createHumanoid(npc)
      this.rigs.set(npc, rig)
      engine.scene.add(rig.root)
    }
    this.place()
    this.off.push(engine.bus.on('room:changed', () => this.place()))
    this.off.push(engine.bus.on('game:pause', ({ on }) => { this.paused = Boolean(on) }))
  },

  place () {
    for (const [npc, rig] of this.rigs) {
      const anchor = visibleAnchor(this.engine.scene, ANCHORS[npc])
      if (anchor) {
        anchor.add(rig.root)
        rig.root.position.set(0, 0, 0)
        rig.root.rotation.set(0, 0, 0)
        rig.root.visible = true
      } else if (npc === 'deitch' && !this.engine.get('lobby')) {
        this.engine.scene.add(rig.root)
        rig.root.position.set(0, 0, -0.42)
        rig.root.rotation.set(0, 0, 0)
        rig.root.visible = true
      } else {
        rig.root.visible = false
      }
    }
  },

  update () {
    if (this.paused) return
  },

  dispose () {
    for (const off of this.off) off()
    for (const { root } of this.rigs.values()) root.removeFromParent()
    this.off.length = 0
    this.rigs.clear()
  }
}

export default characters

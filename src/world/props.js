// 1947년 호텔 소품 팩토리. 전 소품 반환 형태 { root, lights?, anchors? }.
// 형상은 kit.js만 통해 만들고, 재질은 mat()에서 가져온다. 순수 박스 노출 금지(D4).

import * as THREE from 'three'
import { rng, clamp, lerp, smoothstep, kelvin, noise2D, fbm } from '../core/util.js'
import {
  bevelBox, lathe, tube, ribbon, crumple, merge, twoSided, xf, collar, profile,
  mesh, glowMesh, group, groundContact, footContacts, clone
} from './kit.js'

export * from './props-fixtures.js'
export * from './props-detail.js'
export { potPlant } from './props-decor.js'
import { rubbedTop } from './props-decor.js'

// util.kelvin은 선형 RGB를 반환하고 three의 워킹 색공간도 선형이므로 그대로 넣는다.
export const K = (k) => new THREE.Color().setRGB(...kelvin(k))

// 침구·커튼용 드레이프. 가장자리에서 실제로 흘러내리고 표면에 주름이 남는다.
export function drape (w, d, h, seed, o = {}) {
  const g = new THREE.PlaneGeometry(w, d, o.sx ?? 44, o.sz ?? 44)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  const n = noise2D(seed)
  const fall = o.fall ?? 0.1
  const drop = o.drop ?? 0.24
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const ex = smoothstep(clamp((w * 0.5 - Math.abs(x)) / fall, 0, 1))
    const ez = smoothstep(clamp((d * 0.5 - Math.abs(z)) / fall, 0, 1))
    const edge = Math.min(ex, ez)
    const wr = fbm(n, x * (o.freq ?? 6.5), z * (o.freq ?? 6.5), 4) * (o.amp ?? 0.022)
    const rid = Math.sin(x * (o.ridge ?? 5.5) + fbm(n, x, z, 2) * 4) * (o.ridgeAmp ?? 0.008)
    pos.setY(i, h - (1 - edge) * drop + (wr + rid) * edge)
  }
  g.computeVertexNormals()
  g.computeBoundingBox()
  return g
}

// 실광원이 그림자를 던지지 않으면 그 빛이 닿는 모든 표면에서 접지가 붕괴한다(D5). 데스크램프처럼
// 근거리 표면을 직접 때리는 실광원은 반드시 캐스팅한다 — 그림자 맵은 근거리 전용으로 좁게 잡는다.
function spot (kelvin, intensity, angle, penumbra, dist, shadow) {
  const l = new THREE.SpotLight(K(kelvin), intensity, dist ?? 0, angle, penumbra, 2)  // lint-allow: light-direct (ARCH §6.5 폐집합)
  l.castShadow = !!shadow
  if (shadow) {
    l.shadow.mapSize.set(1024, 1024)
    l.shadow.camera.near = 0.05
    l.shadow.camera.far = dist ?? 6
    l.shadow.bias = -0.0004
    l.shadow.normalBias = 0.012
    l.shadow.radius = 3
    l.shadow.blurSamples = 8
  }
  return l
}

// ── 조명 ─────────────────────────────────────────────────────────────────

export function deskLamp (seed = 1) {
  const root = group('deskLamp')
  const base = mesh(lathe([[0, 0], [0.078, 0], [0.081, 0.007], [0.074, 0.016], [0.032, 0.021], [0.030, 0.034]], 34),
    'brass.tarnished', { wear: 0.9, seed })
  const stem = mesh(lathe([[0.016, 0.034], [0.020, 0.055], [0.015, 0.26], [0.023, 0.275], [0.020, 0.29]], 20),
    'brass.tarnished', { wear: 0.55, seed: seed + 1 })
  const shade = glowMesh(lathe([[0.0015, -0.118], [0.092, -0.118], [0.092, 0.118], [0.0015, 0.118]], 22, { phiLength: Math.PI }),
    'shade.green', { color: 0x08200f, emissive: 0x1c4b2b, intensity: 0.55, roughness: 0.28, side: THREE.DoubleSide })
  shade.rotation.z = Math.PI / 2
  shade.position.y = 0.30
  const rim = mesh(lathe([[0.092, -0.12], [0.098, -0.12], [0.098, 0.12], [0.092, 0.12]], 22, { phiLength: Math.PI }), 'brass.polished')
  rim.rotation.z = Math.PI / 2
  rim.position.y = 0.30
  const bulb = glowMesh(lathe([[0, -0.026], [0.019, -0.014], [0.021, 0.01], [0, 0.026]], 14), 'bulb.tungsten',
    { color: 0x1a1208, emissive: 0xffbb62, intensity: 2.2, roughness: 0.2 })
  bulb.position.set(0, 0.277, 0)
  root.add(base, stem, rim, shade, bulb)

  const l = spot(2850, 5.0, 0.85, 0.62, 2.6, true)
  l.position.set(0, 0.285, 0)
  l.target.position.set(0.10, -1.0, 0.16)
  root.add(l, l.target)
  groundContact(root, { radius: 0.10, strength: 0.9 })
  groundContact(root, { radius: 0.25, strength: 0.30, y: 0.0026 })
  return { root, lights: [l], anchors: { bulb: [0, 0.28, 0], top: [0, 0.42, 0] } }
}

export function sconce (seed = 1) {
  const root = group('sconce')
  const plate = mesh(bevelBox(0.16, 0.30, 0.035, 0.008, 2), 'brass.tarnished', { wear: 0.8, seed })
  plate.position.z = 0.017
  const arm = mesh(tube([[0, 0.02, 0.03], [0, 0.05, 0.10], [0, 0.09, 0.13]], 0.014, 14, 8), 'brass.tarnished', { wear: 0.5, seed: seed + 1 })
  const cup = mesh(lathe([[0.014, 0.09], [0.05, 0.115], [0.052, 0.125]], 20), 'brass.polished', { wear: 0.4, seed: seed + 2 })
  cup.position.z = 0.13
  const shade = glowMesh(lathe([[0.052, 0.125], [0.082, 0.20], [0.078, 0.255], [0.055, 0.27]], 24), 'glass.milk',
    { color: 0x1b1a17, emissive: 0xffd9a0, intensity: 1.35, roughness: 0.55, side: THREE.DoubleSide })
  shade.position.z = 0.13
  root.add(plate, arm, cup, shade)

  const l = new THREE.PointLight(K(2700), 1.7, 6.0, 2)  // lint-allow: light-direct (ARCH §6.5 폐집합)
  l.position.set(0, 0.21, 0.13)
  root.add(l)
  return { root, lights: [l], anchors: { glass: [0, 0.20, 0.13] } }
}

export function chandelier (seed = 1, o = {}) {
  const arms = o.arms ?? 8
  const root = group('chandelier')
  const stemG = lathe([[0.012, 0], [0.012, 0.52], [0.03, 0.55], [0.055, 0.58], [0.05, 0.60]], 16)
  root.add(mesh(stemG, 'brass.tarnished', { wear: 0.5, seed }))
  root.add(mesh(lathe([[0, 0.60], [0.09, 0.62], [0.10, 0.645], [0.02, 0.66]], 22), 'brass.tarnished', { wear: 0.6, seed: seed + 1 }))

  const ringG = tube(Array.from({ length: 16 }, (_, i) => {
    const a = i / 16 * Math.PI * 2
    return [Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34]
  }), 0.016, 64, 8, true)
  const ring = mesh(ringG, 'brass.tarnished', { wear: 0.6, seed: seed + 2 })
  ring.position.y = 0.16
  root.add(ring)

  const armG = [], armM = [], cupG = [], cupM = []
  const bulbGeo = lathe([[0, -0.028], [0.021, -0.012], [0.022, 0.012], [0, 0.03]], 12)
  const cupGeo = lathe([[0.008, 0], [0.036, 0.028], [0.034, 0.042], [0.016, 0.05]], 16)
  const bulbs = []
  for (let i = 0; i < arms; i++) {
    const a = i / arms * Math.PI * 2
    const cx = Math.cos(a), cz = Math.sin(a)
    armG.push(tube([[cx * 0.05, 0.30, cz * 0.05], [cx * 0.22, 0.16, cz * 0.22], [cx * 0.34, 0.20, cz * 0.34]], 0.012, 16, 6))
    armM.push(null)
    cupG.push(cupGeo); cupM.push(xf([cx * 0.34, 0.20, cz * 0.34]))
    bulbs.push(xf([cx * 0.34, 0.29, cz * 0.34]))
  }
  root.add(mesh(merge(armG.concat(cupG), armM.concat(cupM)), 'brass.tarnished', { wear: 0.55, seed: seed + 3 }))
  const bulbMesh = glowMesh(merge(bulbs.map(() => bulbGeo), bulbs), 'bulb.tungsten',
    { color: 0x1a1208, emissive: 0xffc078, intensity: 1.9, roughness: 0.2 })
  root.add(bulbMesh)

  // 크리스털 드롭 — 6면 프리즘. 반복이지만 길이·회전에 시드 변주를 준다 (§8)
  const r = rng(seed + 9)
  const dropGeo = lathe([[0, 0], [0.016, 0.02], [0.014, 0.055], [0, 0.075]], 6)
  const dg = [], dm = []
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2
    const rad = lerp(0.16, 0.36, r())
    const y = lerp(0.02, 0.16, r())
    dg.push(dropGeo)
    dm.push(xf([Math.cos(a) * rad, y, Math.sin(a) * rad], [0, r() * 3, 0], lerp(0.8, 1.4, r())))
  }
  root.add(mesh(merge(dg, dm), 'glass.clear', { cast: false }))

  const l = new THREE.PointLight(K(2650), 8, 14, 2)  // lint-allow: light-direct (ARCH §6.5 폐집합)
  l.position.y = 0.26
  root.add(l)
  return { root, lights: [l], anchors: { hang: [0, 0.60, 0], bulbs: 0.29 } }
}

export function neonSign (seed = 1, o = {}) {
  const text = (o.text ?? 'HOTEL VIRGIL').toUpperCase()
  const S = {
    H: [[[0, 0], [0, 1.6]], [[1, 0], [1, 1.6]], [[0, 0.82], [1, 0.82]]],
    O: [[[0.5, 1.6], [0.02, 1.22], [0.02, 0.38], [0.5, 0], [0.98, 0.38], [0.98, 1.22], [0.5, 1.6]]],
    T: [[[0, 1.6], [1, 1.6]], [[0.5, 1.6], [0.5, 0]]],
    E: [[[1, 1.6], [0, 1.6], [0, 0], [1, 0]], [[0, 0.82], [0.78, 0.82]]],
    L: [[[0, 1.6], [0, 0], [1, 0]]],
    C: [[[0.98, 1.34], [0.5, 1.6], [0.02, 1.22], [0.02, 0.38], [0.5, 0], [0.98, 0.26]]],
    I: [[[0.5, 1.6], [0.5, 0]]]
  }
  const root = group('neonSign')
  const scale = o.scale ?? 0.22
  const adv = 1.28 * scale
  const width = text.length * adv
  const geos = [], mats = []
  let x = -width * 0.5
  for (const ch of text) {
    const strokes = S[ch]
    if (strokes) {
      for (const st of strokes) {
        const p = st.map(([a, b]) => [a * scale, b * scale, 0])
        if (p.length === 2) p.splice(1, 0, [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, 0])
        geos.push(tube(p, 0.014, Math.max(8, p.length * 6), 7))
        mats.push(xf([x, 0, 0.055]))
      }
    }
    x += adv
  }
  const back = mesh(bevelBox(width + 0.16, 1.6 * scale + 0.24, 0.09, 0.014, 2), 'steel.rusted', { wear: 1.0, seed })
  back.position.set(0, 1.6 * scale * 0.5, 0)
  root.add(back)
  const glassTube = glowMesh(merge(geos, mats), 'neon.red',
    { color: 0x2a0406, emissive: 0xff3a2a, intensity: 2.6, roughness: 0.15 })
  root.add(glassTube)
  return { root, lights: [], anchors: { face: [0, 1.6 * scale * 0.5, 0.07], width } }
}

// ── 가구 ─────────────────────────────────────────────────────────────────

function turnedLeg (h, seed, matName = 'wood.varnished.dark') {
  return mesh(lathe([[0.026, 0], [0.030, 0.012], [0.022, 0.05], [0.028, 0.09],
    [0.021, h * 0.55], [0.026, h * 0.62], [0.019, h - 0.02], [0.024, h]], 16), matName, { wear: 0.7, seed })
}

export function sideTable (seed = 1) {
  const root = group('sideTable')
  const h = 0.58
  const top = mesh(lathe([[0, h], [0.24, h], [0.25, h - 0.012], [0.245, h - 0.03], [0.20, h - 0.034], [0, h - 0.034]], 40),
    'wood.varnished.dark', { wear: 0.55, seed })
  root.add(top)
  const r = rng(seed)
  const feet = []
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.4
    const leg = turnedLeg(h - 0.034, seed + i)
    leg.position.set(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16)
    leg.rotation.y = r() * 0.4
    root.add(leg)
    feet.push([Math.cos(a) * 0.16, Math.sin(a) * 0.16])
  }
  const shelf = mesh(lathe([[0, 0.16], [0.14, 0.16], [0.14, 0.145], [0, 0.145]], 26), 'wood.varnished.dark', { wear: 0.8, seed: seed + 7 })
  root.add(shelf)
  footContacts(root, feet, { footRadius: 0.055, poolStrength: 0.30 })
  return { root, anchors: { top: [0, h, 0] } }
}

export function armchair (seed = 1, o = {}) {
  const root = group('armchair')
  const w = o.w ?? 0.72
  const fabric = o.fabric ?? 'fabric.velvet.red'
  const seatY = 0.40
  const frame = mesh(bevelBox(w, 0.12, 0.70, 0.02, 2), 'wood.varnished.dark', { wear: 0.6, seed })
  frame.position.set(0, seatY - 0.06, 0)
  const cushion = mesh(crumple(bevelBox(w - 0.06, 0.16, 0.64, 0.05, 3), { amp: 0.012, freq: 6, seed: seed + 1 }),
    fabric, { wear: 0.35, seed: seed + 1 })
  cushion.position.set(0, seatY + 0.06, 0.01)
  const back = mesh(crumple(bevelBox(w, 0.60, 0.16, 0.045, 3), { amp: 0.011, freq: 7, seed: seed + 2 }),
    fabric, { wear: 0.35, seed: seed + 2 })
  back.position.set(0, seatY + 0.34, -0.29)
  back.rotation.x = -0.10
  root.add(frame, cushion, back)
  for (const s of [-1, 1]) {
    const worn = o.wornArm === s
    const armGeo = crumple(bevelBox(0.13, 0.20, 0.62, 0.05, 3), { amp: 0.008, freq: 8, seed: seed + 3 })
    const arm = worn
      ? mesh(rubbedTop(armGeo, seed + 3), fabric, { vcol: true })
      : mesh(armGeo, fabric, { wear: 0.5, seed: seed + 3 })
    arm.position.set(s * (w * 0.5 - 0.055), seatY + 0.19, -0.02)
    const post = mesh(bevelBox(0.08, 0.24, 0.10, 0.014, 2), 'wood.varnished.dark', { wear: 0.8, seed: seed + 4 })
    post.position.set(s * (w * 0.5 - 0.055), seatY + 0.03, 0.26)
    root.add(arm, post)
  }
  const r = rng(seed + 5)
  const feet = []
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = turnedLeg(seatY - 0.12, seed + 10 + sx * 2 + sz)
    leg.position.set(sx * (w * 0.5 - 0.07), 0, sz * 0.28)
    leg.rotation.y = r() * 0.5
    root.add(leg)
    feet.push([sx * (w * 0.5 - 0.07), sz * 0.28])
  }
  footContacts(root, feet, { footRadius: 0.07, poolStrength: 0.36 })
  return { root, anchors: { seat: [0, seatY + 0.14, 0.02] } }
}

// o.wornArm = -1 | 1 — 그쪽 끝의 바깥 팔걸이만 파일이 벗겨진다. clone은 지오메트리를 공유해
// 양끝에 같은 마모가 찍히므로, 요구받았을 때만 반대쪽을 별도 시드의 개체로 세운다.
export function sofa (seed = 1, o = {}) {
  const root = group('sofa')
  const w = 1.94
  const a = armchair(seed, { w: 0.66, wornArm: o.wornArm === -1 ? -1 : 0 })
  root.add(a.root)
  a.root.position.x = -w * 0.5 + 0.33
  const b = o.wornArm === 1 ? armchair(seed + 3, { w: 0.66, wornArm: 1 }).root : clone(a.root, seed + 3)
  b.position.set(w * 0.5 - 0.33, 0, 0)
  root.add(b)
  const mid = mesh(crumple(bevelBox(w - 1.0, 0.16, 0.64, 0.05, 3), { amp: 0.013, freq: 6, seed: seed + 11 }),
    'fabric.velvet.red', { wear: 0.35, seed: seed + 11 })
  mid.position.set(0, 0.46, 0.01)
  const midBack = mesh(crumple(bevelBox(w - 0.98, 0.60, 0.16, 0.045, 3), { amp: 0.011, freq: 7, seed: seed + 12 }),
    'fabric.velvet.red', { wear: 0.35, seed: seed + 12 })
  midBack.position.set(0, 0.74, -0.29)
  midBack.rotation.x = -0.10
  const rail = mesh(bevelBox(w - 0.9, 0.10, 0.68, 0.018, 2), 'wood.varnished.dark', { wear: 0.6, seed: seed + 13 })
  rail.position.set(0, 0.34, 0)
  root.add(rail, mid, midBack)
  return { root, anchors: { seat: [0, 0.54, 0.02] } }
}

export function nightstand (seed = 1) {
  const root = group('nightstand')
  const h = 0.62, w = 0.44, d = 0.38
  const carcass = mesh(bevelBox(w, h - 0.14, d, 0.008, 2), 'wood.varnished.dark', { wear: 0.7, seed })
  carcass.position.y = 0.14 + (h - 0.14) * 0.5
  const top = mesh(bevelBox(w + 0.04, 0.026, d + 0.04, 0.006, 2), 'wood.varnished.dark', { wear: 0.85, seed: seed + 1 })
  top.position.y = h + 0.013
  root.add(carcass, top)
  const drawer = mesh(bevelBox(w - 0.05, 0.16, 0.016, 0.005, 2), 'wood.varnished.dark', { wear: 0.9, seed: seed + 2 })
  drawer.position.set(0, h - 0.16, d * 0.5 + 0.006)
  const pull = mesh(tube([[-0.05, 0, 0], [-0.04, 0, 0.022], [0.04, 0, 0.022], [0.05, 0, 0]], 0.006, 14, 6), 'brass.polished', { wear: 0.4, seed: seed + 3 })
  pull.position.set(0, h - 0.16, d * 0.5 + 0.014)
  root.add(drawer, pull)
  const door = mesh(bevelBox(w - 0.05, 0.24, 0.016, 0.005, 2), 'wood.varnished.dark', { wear: 0.8, seed: seed + 4 })
  door.position.set(0, 0.32, d * 0.5 + 0.006)
  root.add(door)
  const r = rng(seed + 5)
  const feet = []
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = mesh(lathe([[0.022, 0], [0.026, 0.015], [0.018, 0.10], [0.022, 0.14]], 14), 'wood.varnished.dark', { wear: 0.9, seed: seed + 20 + r() * 3 })
    leg.position.set(sx * (w * 0.5 - 0.045), 0, sz * (d * 0.5 - 0.045))
    root.add(leg)
    feet.push([sx * (w * 0.5 - 0.045), sz * (d * 0.5 - 0.045)])
  }
  footContacts(root, feet, { footRadius: 0.05, poolStrength: 0.34 })
  return { root, anchors: { top: [0, h + 0.026, 0] } }
}

export function bed (seed = 1, o = {}) {
  const root = group('bed')
  const w = o.w ?? 1.05, len = o.len ?? 1.98
  const frameY = 0.30
  // 1940년대 철제 프레임 — 세로 살에 시드 변주
  const r = rng(seed)
  const bars = [], bm = []
  const post = lathe([[0.020, 0], [0.024, 0.03], [0.018, 0.9], [0.026, 0.94], [0.020, 0.99], [0.030, 1.02], [0, 1.06]], 14)
  const postLow = lathe([[0.020, 0], [0.024, 0.03], [0.018, 0.52], [0.028, 0.56], [0, 0.60]], 14)
  for (const s of [-1, 1]) {
    bars.push(post); bm.push(xf([s * (w * 0.5 - 0.03), 0, -len * 0.5]))
    bars.push(postLow); bm.push(xf([s * (w * 0.5 - 0.03), 0, len * 0.5]))
  }
  for (let i = 0; i < 9; i++) {
    const t = (i / 8 - 0.5) * (w - 0.16)
    const hh = 0.86 + Math.sin(i / 8 * Math.PI) * 0.06 + (r() - 0.5) * 0.012
    bars.push(tube([[t, 0.62, -len * 0.5], [t, hh, -len * 0.5]], 0.009, 4, 6)); bm.push(null)
  }
  bars.push(tube([[-w * 0.5 + 0.03, 0.62, -len * 0.5], [0, 0.60, -len * 0.5], [w * 0.5 - 0.03, 0.62, -len * 0.5]], 0.013, 20, 7)); bm.push(null)
  bars.push(tube([[-w * 0.5 + 0.03, 0.95, -len * 0.5], [0, 0.99, -len * 0.5], [w * 0.5 - 0.03, 0.95, -len * 0.5]], 0.013, 20, 7)); bm.push(null)
  bars.push(tube([[-w * 0.5 + 0.03, 0.56, len * 0.5], [0, 0.60, len * 0.5], [w * 0.5 - 0.03, 0.56, len * 0.5]], 0.013, 20, 7)); bm.push(null)
  for (const s of [-1, 1]) {
    bars.push(tube([[s * (w * 0.5 - 0.03), frameY, -len * 0.5], [s * (w * 0.5 - 0.03), frameY, len * 0.5]], 0.014, 6, 7))
    bm.push(null)
  }
  root.add(mesh(merge(bars, bm), 'steel.galvanized', { wear: 0.85, seed: seed + 1 }))

  const mattress = mesh(crumple(bevelBox(w - 0.06, 0.20, len - 0.10, 0.055, 3), { amp: 0.01, freq: 5, seed: seed + 2 }),
    'fabric.wool.suit', { wear: 0.3, seed: seed + 2 })
  mattress.position.y = frameY + 0.11
  root.add(mattress)

  const sheet = mesh(drape(w - 0.02, len - 0.30, frameY + 0.215, seed + 3, { drop: 0.20, fall: 0.09, amp: 0.016, freq: 8, ridge: 7 }),
    'paper.aged', { cast: true })
  sheet.position.z = 0.10
  const blanket = mesh(drape(w + 0.06, len * 0.62, frameY + 0.235, seed + 4, { drop: 0.34, fall: 0.12, amp: 0.03, freq: 5.2, ridge: 4, ridgeAmp: 0.016 }),
    'fabric.wool.suit', { cast: true })
  blanket.position.z = len * 0.19
  root.add(sheet, blanket)

  for (const s of [-1, 1]) {
    const p = mesh(crumple(bevelBox(0.44, 0.13, 0.30, 0.06, 4), { amp: 0.022, freq: 7, seed: seed + 5 + s }), 'paper.aged', { wear: 0.2, seed: seed + 6 })
    p.position.set(s * 0.24, frameY + 0.30, -len * 0.5 + 0.28)
    p.rotation.set(0.06 * s, 0.12 * s, 0.05 * s)
    root.add(p)
  }
  footContacts(root, [[-(w * 0.5 - 0.03), -len * 0.5], [w * 0.5 - 0.03, -len * 0.5],
    [-(w * 0.5 - 0.03), len * 0.5], [w * 0.5 - 0.03, len * 0.5]], { footRadius: 0.06, poolStrength: 0.40 })
  return { root, anchors: { top: [0, frameY + 0.23, 0], pillow: [0, frameY + 0.36, -len * 0.5 + 0.28] } }
}

export function luggageCart (seed = 1) {
  const root = group('luggageCart')
  const w = 0.90, d = 0.56, h = 1.30
  const bars = [], bm = []
  // 관이 만나는 자리마다 칼라를 끼운다. 맨 실린더 격자는 그 자체로 플레이스홀더로 읽힌다(D4).
  const postCollar = collar(0.017, { t: 0.038, b: 0.008, seg: 14 })
  const railCollar = collar(0.015, { t: 0.030, b: 0.007, seg: 12 })
  const finial = lathe([[0, 0], [0.020, 0.006], [0.026, 0.020], [0.021, 0.032],
    [0.014, 0.040], [0.017, 0.052], [0, 0.058]], 16)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = sx * w * 0.5, pz = sz * d * 0.5
    bars.push(tube([[px, 0.10, pz], [px, h, pz]], 0.017, 4, 8)); bm.push(null)
    bars.push(finial); bm.push(xf([px, h, pz]))
    for (const cy of [0.10, h - 0.245, h - 0.20, h - 0.045]) { bars.push(postCollar); bm.push(xf([px, cy, pz])) }
  }
  for (const y of [h, h - 0.22]) {
    bars.push(tube([[-w * 0.5, y, -d * 0.5], [w * 0.5, y, -d * 0.5]], 0.015, 4, 7)); bm.push(null)
    bars.push(tube([[-w * 0.5, y, d * 0.5], [w * 0.5, y, d * 0.5]], 0.015, 4, 7)); bm.push(null)
    bars.push(tube([[-w * 0.5, y, -d * 0.5], [-w * 0.5, y, d * 0.5]], 0.015, 4, 7)); bm.push(null)
    bars.push(tube([[w * 0.5, y, -d * 0.5], [w * 0.5, y, d * 0.5]], 0.015, 4, 7)); bm.push(null)
    for (const sx of [-1, 1]) {
      bars.push(railCollar); bm.push(xf([sx * (w * 0.5 - 0.030), y, -d * 0.5], [0, 0, Math.PI / 2]))
      bars.push(railCollar); bm.push(xf([sx * (w * 0.5 - 0.030), y, d * 0.5], [0, 0, Math.PI / 2]))
      bars.push(railCollar); bm.push(xf([sx * w * 0.5, y, -(d * 0.5 - 0.030)], [Math.PI / 2, 0, 0]))
    }
  }
  root.add(mesh(merge(bars, bm), 'brass.tarnished', { wear: 0.9, seed }))
  const deck = mesh(bevelBox(w - 0.02, 0.05, d - 0.02, 0.008, 2), 'wood.varnished.dark', { wear: 0.95, seed: seed + 1 })
  deck.position.y = 0.145
  const carpetTop = mesh(crumple(bevelBox(w - 0.08, 0.02, d - 0.08, 0.006, 2), { amp: 0.006, freq: 9, seed: seed + 2 }), 'carpet.corridor.red', { wear: 0.6, seed: seed + 2 })
  carpetTop.position.y = 0.18
  root.add(deck, carpetTop)
  const r = rng(seed + 3)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const wheel = mesh(lathe([[0, -0.018], [0.055, -0.018], [0.062, 0], [0.055, 0.018], [0, 0.018]], 18), 'bakelite.black', { wear: 0.8, seed: seed + 4 })
    wheel.rotation.z = Math.PI / 2
    wheel.rotation.y = r() * 0.6
    wheel.position.set(sx * (w * 0.5 - 0.03), 0.062, sz * (d * 0.5 - 0.03))
    root.add(wheel)
  }
  footContacts(root, [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) =>
    [sx * (w * 0.5 - 0.03), sz * (d * 0.5 - 0.03)]), { footRadius: 0.065, poolStrength: 0.30 })
  return { root, anchors: { deck: [0, 0.19, 0], rail: [0, h, 0] } }
}

// ── 벽·바닥 장식 ─────────────────────────────────────────────────────────

export function rugRunner (seed = 1, o = {}) {
  const root = group('rugRunner')
  const w = o.w ?? 1.1, len = o.len ?? 3.4
  const g = new THREE.PlaneGeometry(w, len, 26, Math.round(len * 12))
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  const n = noise2D(seed)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const e = smoothstep(clamp((w * 0.5 - Math.abs(x)) / 0.05, 0, 1))
    pos.setY(i, 0.006 + fbm(n, x * 5, z * 5, 3) * 0.006 * e + e * 0.004)
  }
  g.computeVertexNormals()
  const rug = mesh(g, 'carpet.corridor.red', { cast: false })
  rug.receiveShadow = true
  root.add(rug)
  return { root, anchors: { top: [0, 0.014, 0] } }
}

// 액자 몰딩 단면(u = 테 바깥, v = 벽에서 나오는 깊이). 코브와 필릿이 함께 있어야 한 광원
// 에서도 밝은 선과 어두운 선이 같이 생긴다 — 상자 넷으로 짠 테는 값이 하나로 뭉친다(D4).
const FRAME_PROF = [
  [0, 0], [0.046, 0], [0.046, 0.014], [0.040, 0.019], [0.036, 0.028],
  [0.030, 0.033], [0.021, 0.032], [0.014, 0.026], [0.010, 0.015], [0, 0.011]
]

export function framedPicture (seed = 1, o = {}) {
  const root = group('framedPicture')
  // 호출자가 root.rotation.y/z 로 벽면 방향을 잡는다 — 상단이 벽에서 떨어진 기울기는
  // 내부 그룹에 걸어야 그 회전과 섞이지 않는다.
  const tilt = group('framedPicture.tilt')
  root.add(tilt)
  const r = rng(seed)
  const w = o.w ?? 0.42, h = o.h ?? 0.54
  const b = 0.046
  const hw = w * 0.5, hh = h * 0.5
  // up 은 액자 면의 법선(+z)이라야 단면의 u가 테 바깥으로 선다(kit.profile 프레임 규약).
  // 코너는 45도 이음이 아니라 겹침이지만, 그 차이는 6m 밖에서 안 보인다.
  const runs = [
    [[-hw, hh - b, 0], [hw, hh - b, 0]],
    [[hw - b, hh, 0], [hw - b, -hh, 0]],
    [[hw, -hh + b, 0], [-hw, -hh + b, 0]],
    [[-hw + b, -hh, 0], [-hw + b, hh, 0]]
  ]
  const fg = []
  for (const [a, c] of runs) fg.push(profile(FRAME_PROF, [a, c], { up: [0, 0, 1] }))
  tilt.add(mesh(merge(fg), o.frame ?? 'brass.tarnished', { wear: 0.9, seed }))
  // 뒷판 — 몰딩 안쪽 틈으로 벽이 비치면 액자가 아니라 창이 된다
  tilt.add(mesh(bevelBox(w - b * 0.6, h - b * 0.6, 0.008, 0.002, 1), 'wood.varnished.dark',
    { pos: [0, 0, -0.012], wear: 0.7, seed: seed + 4, cast: false }))
  // 매트 보드 — 인쇄물 둘레의 흰 띠. 액자 안이 한 가지 값이면 6m 밖에서 슬래브가 된다
  const iw = w - b * 1.6, ih = h - b * 1.6
  const mw = iw * (0.70 + r() * 0.08), mh = ih * (0.70 + r() * 0.08)
  const matG = [], matM = []
  const push = (pw, ph, px, py) => { matG.push(bevelBox(pw, ph, 0.005, 0.0016, 1)); matM.push(xf([px, py, 0])) }
  push(iw, (ih - mh) * 0.5, 0, (ih + mh) * 0.25)
  push(iw, (ih - mh) * 0.5, 0, -(ih + mh) * 0.25)
  push((iw - mw) * 0.5, mh, -(iw + mw) * 0.25, 0)
  push((iw - mw) * 0.5, mh, (iw + mw) * 0.25, 0)
  tilt.add(mesh(merge(matG, matM), 'paper.aged', { pos: [0, 0, 0.003], wear: 0.45, seed: seed + 1, cast: false }))
  const art = mesh(bevelBox(mw + 0.012, mh + 0.012, 0.004, 0.0012, 1), o.art ?? 'print.photogravure',
    { wear: 0.35, seed: seed + 2, cast: false })
  art.position.z = -0.003
  const glass = mesh(bevelBox(iw + 0.008, ih + 0.008, 0.003, 0.0010, 1), 'glass.clear', { cast: false })
  glass.position.z = 0.008
  tilt.add(art, glass)
  // 걸이 — 벽에 박힌 못 하나와 뒤로 넘어간 프레임의 기울기가 "걸려 있다"를 만든다
  const hook = mesh(bevelBox(0.012, 0.010, 0.014, 0.003, 1), 'brass.tarnished',
    { pos: [0, hh - 0.004, -0.010], wear: 0.8, seed: seed + 3, cast: false })
  tilt.add(hook)
  tilt.rotation.x = -0.035 - r() * 0.020
  return { root, anchors: { face: [0, 0, 0.02] } }
}

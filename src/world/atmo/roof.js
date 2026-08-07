// 옥상. rooftop-rain 무드의 실제 무대 — 데크·파라펫·물탱크·계단탑·네온·비상계단.
// 샷: pos(5.2, 1.85, 5.6) → target(-1.6, 1.10, -3.0), fov 38.
// 전경(환기 덕트 군집) → 중경(물탱크 2기) → 후경(파라펫 너머 도시 광해)로 심도 레이어를 만든다.

import * as THREE from 'three'
import { rng } from '../../core/util.js'
import { bevelBox, lathe, tube, merge, mesh, group, xf, mat, groundContact, shadows } from '../kit.js'
import * as P from '../props.js'
import { wetify } from './rain.js'

const X0 = -13, X1 = 10.5, Z0 = -16, Z1 = 9.5

// 젖은 표면은 재질을 복제해 적신다 — 공유 캐시를 건드리면 다른 공간까지 젖는다.
function wetMesh (geo, name, opts = {}) {
  const m = mesh(geo, name, opts)
  m.material = wetify(m.material, opts.wet ?? 1)
  return m
}

function puddle (r0, seed) {
  const rnd = rng(seed)
  const seg = 34
  const pos = [], idx = [], uv = []
  pos.push(0, 0, 0); uv.push(0.5, 0.5)
  const rad = []
  for (let i = 0; i < seg; i++) {
    rad.push(r0 * (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(i * 1.7 + seed) * rnd())))
  }
  for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2
    const rr = (rad[i] * 2 + rad[(i + 1) % seg] + rad[(i + seg - 1) % seg]) * 0.25
    pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr * 0.78)
    uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5)
    idx.push(0, 1 + i, 1 + (i + 1) % seg)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, wetify(mat('water.dark'), 1))
  m.castShadow = false
  m.receiveShadow = true
  return m
}

export function rooftop () {
  const g = group('space.rooftop')
  const r = rng(303)

  // 데크 — 타르 시트 이음매를 띠로 깔아 넓은 단색 면을 없앤다(G6)
  const deck = wetMesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 24, 24), 'concrete.rooftop',
    { rot: [-Math.PI / 2, 0, 0], pos: [(X0 + X1) * 0.5, 0, (Z0 + Z1) * 0.5], cast: false, wet: 0.9 })
  g.add(deck)
  const sg = [], sm = []
  for (let i = 0; i < 14; i++) {
    sg.push(bevelBox(X1 - X0, 0.012, 0.16, 0.004, 1))
    sm.push(xf([(X0 + X1) * 0.5, 0.006, Z0 + 0.8 + i * 1.86 + (r() - 0.5) * 0.12], [0, (r() - 0.5) * 0.006, 0]))
  }
  g.add(wetMesh(merge(sg, sm), 'steel.rusted', { cast: false, wear: 1.0, seed: 311, wet: 0.7 }))

  // 파라펫 — 벽체 + 상단 갓돌. 화면 아래를 닫아 구도를 잡는다
  const pg = [], pm = []
  const H = 1.04
  const wall = (x, z, w, d) => {
    pg.push(bevelBox(w, H, d, 0.02, 2)); pm.push(xf([x, H * 0.5, z]))
    pg.push(bevelBox(w + 0.10, 0.09, d + 0.10, 0.014, 2)); pm.push(xf([x, H + 0.045, z]))
  }
  wall((X0 + X1) * 0.5, Z0 - 0.16, X1 - X0 + 0.64, 0.32)
  wall((X0 + X1) * 0.5, Z1 + 0.16, X1 - X0 + 0.64, 0.32)
  wall(X0 - 0.16, (Z0 + Z1) * 0.5, 0.32, Z1 - Z0)
  wall(X1 + 0.16, (Z0 + Z1) * 0.5, 0.32, Z1 - Z0)
  g.add(wetMesh(merge(pg, pm), 'concrete.rooftop', { wear: 0.9, seed: 321, wet: 0.75 }))

  // 계단탑(불크헤드) — 왼쪽 후경 실루엣과 네온 간판의 벽
  const bulk = group('bulkhead')
  bulk.add(wetMesh(bevelBox(3.4, 2.85, 3.0, 0.03, 2), 'plaster.cracked', { pos: [0, 1.425, 0], wear: 0.95, seed: 331, wet: 0.6 }))
  bulk.add(wetMesh(bevelBox(3.7, 0.16, 3.3, 0.02, 2), 'concrete.rooftop', { pos: [0, 2.92, 0], wear: 0.9, seed: 332, wet: 0.8 }))
  const bdoor = P.doorUnit(333, { w: 0.90, h: 2.02, door: 'steel.rusted', trim: 'steel.galvanized' }).root
  bdoor.position.set(0, 0, 1.52)
  bulk.add(bdoor)
  bulk.position.set(-7.4, 0, -1.2)
  bulk.rotation.y = 0.12
  shadows(bulk, true, true)
  g.add(bulk)

  const sign = P.neonSign(341, { text: 'VIRGIL', scale: 0.46 }).root
  sign.position.set(-7.0, 3.35, 0.35)
  sign.rotation.y = 0.34
  g.add(sign)

  // 물탱크 2기 — 중경 주역. 침목 받침에 얹어 접지를 만든다
  for (const [i, [x, z, rot, rad, hh]] of [[-1.9, -6.4, 0.32, 1.45, 2.45], [3.6, -10.2, -0.55, 1.15, 2.05]].entries()) {
    const t = P.waterTank(351 + i * 7, { r: rad, h: hh }).root
    const cradle = group('cradle')
    const cg = [], cm = []
    for (const s of [-1, 1]) {
      cg.push(bevelBox(rad * 2.4, 0.22, 0.28, 0.014, 2)); cm.push(xf([0, 0.11, s * rad * 0.62]))
    }
    for (let k = 0; k < 4; k++) {
      cg.push(bevelBox(0.24, 0.22, rad * 1.7, 0.012, 2)); cm.push(xf([(k - 1.5) * rad * 0.72, 0.11, 0]))
    }
    cradle.add(wetMesh(merge(cg, cm), 'wood.varnished.dark', { wear: 1.0, seed: 361 + i, wet: 0.7 }))
    t.position.y = 0.22
    const stack = group('tank', cradle, t)
    stack.position.set(x, 0, z)
    stack.rotation.y = rot
    groundContact(stack, { strength: 0.8, radius: rad * 1.5, radiusZ: rad * 1.5 })
    shadows(stack, true, true)
    g.add(stack)
  }

  // 배관 — 탱크에서 데크를 가로질러 계단탑으로. 공간에 목적을 준다
  const pipe = wetMesh(merge([
    tube([[-1.9, 1.9, -5.0], [-1.9, 1.35, -3.6], [-3.6, 1.15, -2.4], [-6.0, 0.95, -1.6], [-7.2, 0.55, -1.0]], 0.075, 44, 12),
    tube([[3.6, 1.6, -9.1], [3.2, 1.2, -7.4], [1.2, 0.85, -5.6], [-1.2, 0.72, -4.4]], 0.055, 36, 10)
  ]), 'steel.rusted', { wear: 1.0, seed: 371, wet: 0.8 })
  g.add(pipe)
  const bg = [], bm = []
  for (const [x, z] of [[-3.6, -2.4], [-6.0, -1.6], [1.2, -5.6]]) {
    bg.push(lathe([[0.09, 0], [0.13, 0.02], [0.13, 0.06], [0.09, 0.08]], 16)); bm.push(xf([x, 0.72, z], [Math.PI / 2, 0, 0.3]))
  }
  g.add(wetMesh(merge(bg, bm), 'steel.galvanized', { wear: 1.0, seed: 372, wet: 0.7 }))

  // 전경 오클루더 — 카메라 바로 앞 왼쪽의 환기 덕트 군집
  const vents = group('vents')
  for (const [i, [x, z, h, rot]] of [[0, 0, 1.55, 0.2], [0.72, -0.5, 1.15, -0.6], [-0.55, -0.86, 0.92, 1.1]].entries()) {
    const v = P.ventPipe(381 + i, { h }).root
    v.position.set(x, 0, z)
    v.rotation.y = rot
    vents.add(v)
  }
  const curb = wetMesh(bevelBox(2.0, 0.34, 1.9, 0.03, 2), 'concrete.rooftop',
    { pos: [0.1, 0.17, -0.3], wear: 0.95, seed: 385, wet: 0.85 })
  vents.add(curb)
  vents.position.set(3.9, 0, 3.6)
  vents.rotation.y = -0.4
  shadows(vents, true, true)
  g.add(vents)

  const fe = P.fireEscape(391, { w: 2.2, d: 1.15 }).root
  fe.position.set(X1 + 0.30, 1.06, 3.2)
  fe.rotation.y = Math.PI / 2
  g.add(fe)

  // 사다리·잡동사니 — 빈 면적을 남기지 않는다
  const lg = [], lm = []
  for (const s of [-1, 1]) { lg.push(tube([[s * 0.21, 0, 0], [s * 0.19, 2.6, -0.5]], 0.022, 6, 8)); lm.push(null) }
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    lg.push(tube([[-0.20, t * 2.6, -t * 0.5], [0.20, t * 2.6, -t * 0.5]], 0.016, 4, 7)); lm.push(null)
  }
  const ladder = wetMesh(merge(lg, lm), 'steel.galvanized', { wear: 1.0, seed: 395, wet: 0.8 })
  ladder.position.set(-5.4, 0, 1.9)
  ladder.rotation.y = -0.5
  groundContact(ladder, { strength: 0.5, radius: 0.5, radiusZ: 0.5 })
  g.add(ladder)

  for (const [i, [x, z, rr]] of [[1.2, 2.4, 1.35], [-2.6, 1.2, 0.95], [4.6, -2.2, 1.10], [-4.4, -4.0, 1.5], [0.4, -1.2, 0.8]].entries()) {
    const p = puddle(rr, 401 + i)
    p.position.set(x, 0.014, z)
    p.rotation.y = r() * 3.14
    g.add(p)
  }

  return {
    root: g,
    lights: [
      ['moon', { pos: [-28, 40, 44], target: [0, 0, -4], kelvin: 7600, lux: 130, extent: 30 }],
      ['neon', { pos: [-6.6, 3.35, 0.72], kelvin: 2100, lumens: 1600, radius: 8.5, flicker: 0.34, fixture: false }],
      ['street', {
        pos: [12.5, 7.2, 6.0], target: [1.0, 0.2, -3.0], kelvin: 2050, lumens: 14000,
        radius: 26, angle: 0.62, flicker: 0.05, shaft: 0.75, fixture: false
      }],
      ['bare-bulb', { pos: [-7.4, 2.32, 2.78], kelvin: 2400, lumens: 300, radius: 4.6, flicker: 0.26 }]
    ]
  }
}

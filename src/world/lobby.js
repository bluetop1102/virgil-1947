import * as THREE from 'three'
import { rng } from '../core/util.js'
import {
  bevelBox, groundContact, group, lathe, merge, mesh, profile, tube, xf
} from './kit.js'
import {
  elevatorDoors, framedPicture, keyRack, registerBook, sideTable, sofa, telephone
} from './props.js'
import { ambientRig, practical, setMood } from './atmosphere.js'

const W = 14.8
const D = 18.4
const H = 4.15
const BACK = -7.25
const FRONT = 11.15

const BASE_PROFILE = [
  [0, 0], [0.15, 0], [0.15, 0.025], [0.13, 0.038], [0.13, 0.058], [0.02, 0.058], [0, 0.035]
]

const CROWN_PROFILE = [
  [0, 0], [0.19, 0], [0.18, 0.035], [0.14, 0.075], [0.08, 0.13], [0.025, 0.15], [0, 0.15]
]

const OBSERVATIONS = {
  register: '숙박부 여백에 연필 자국이 눌려 있다. 채광정 앞에서는 위를 보지 말라는 문장이다.',
  keyrack: '942 고리와 ROOF 고리가 나란히 비어 있다.',
  flask: '근무대 아래의 금속에 오래 닦인 손자국이 겹쳐 있다.',
  sofa: '프런트가 보이는 쪽 팔걸이만 천의 결이 사라졌다.',
  blotter: '같은 필적이 수백 번 눌렸다. 한 자리만 잉크가 새것이다.'
}

function place (result, pos, rot = 0, scale = 1) {
  const root = result.root ?? result
  root.position.set(pos[0], pos[1], pos[2])
  root.rotation.y = rot
  root.scale.setScalar(scale)
  return root
}

function interact (obj, id, data = {}) {
  obj.userData.interact = { id, ...data }
  return obj
}

function qaTarget (obj, qaId, data = {}) {
  obj.userData.qaId = qaId
  interact(obj, qaId, data)
  return obj
}

function makeShell () {
  const root = group('lobby.shell')
  const floor = mesh(new THREE.PlaneGeometry(W, D, 12, 16), 'marble.lobby.floor', {
    pos: [0, 0, (BACK + FRONT) * 0.5], rot: [-Math.PI / 2, 0, 0], cast: false
  })
  floor.userData.floor = 'marble'
  const ceiling = mesh(new THREE.PlaneGeometry(W, D, 8, 12), 'plaster.cracked', {
    pos: [0, H, (BACK + FRONT) * 0.5], rot: [Math.PI / 2, 0, 0], cast: false
  })
  root.add(floor, ceiling)

  root.add(
    mesh(bevelBox(W, H, 0.22, 0.018, 2), 'wallpaper.damask.green', { pos: [0, H * 0.5, BACK - 0.11], cast: false }),
    mesh(bevelBox(0.22, H, D, 0.018, 2), 'wallpaper.damask.green', { pos: [-W * 0.5 - 0.11, H * 0.5, (BACK + FRONT) * 0.5], cast: false }),
    mesh(bevelBox(0.22, H, D, 0.018, 2), 'plaster.cracked', { pos: [W * 0.5 + 0.11, H * 0.5, (BACK + FRONT) * 0.5], cast: false }),
    mesh(bevelBox(W, H, 0.22, 0.018, 2), 'plaster.cracked', { pos: [0, H * 0.5, FRONT + 0.11], cast: false })
  )

  const trim = []
  const runs = [
    [[-W * 0.5, 0, BACK], [W * 0.5, 0, BACK], [0, 0, 1]],
    [[-W * 0.5, 0, FRONT], [-W * 0.5, 0, BACK], [1, 0, 0]],
    [[W * 0.5, 0, BACK], [W * 0.5, 0, FRONT], [-1, 0, 0]],
    [[W * 0.5, 0, FRONT], [-W * 0.5, 0, FRONT], [0, 0, -1]]
  ]
  for (const [a, b, up] of runs) {
    trim.push(profile(BASE_PROFILE, [a, b], { up }))
    const ca = [a[0], H, a[2]]
    const cb = [b[0], H, b[2]]
    trim.push(profile(CROWN_PROFILE, [cb, ca], { up }))
  }
  root.add(mesh(merge(trim), 'wood.painted.white', { wear: 0.82, seed: 101 }))

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

function makeCollisionShell () {
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

function makeCoffers () {
  const root = group('lobby.coffers')
  const geos = []
  const mats = []
  for (const z of [-5.4, -1.7, 2.0, 5.7, 9.4]) {
    geos.push(bevelBox(W - 0.5, 0.10, 0.13, 0.025, 2))
    mats.push(xf([0, H - 0.06, z]))
  }
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) {
    geos.push(bevelBox(0.13, 0.10, D - 0.5, 0.025, 2))
    mats.push(xf([x, H - 0.06, (BACK + FRONT) * 0.5]))
  }
  root.add(mesh(merge(geos, mats), 'wood.varnished.dark', { wear: 0.52, seed: 119 }))
  return root
}

function makeColumns () {
  const root = group('lobby.columns')
  for (const [i, x] of [-1, 1].entries()) {
    const column = group(`lobby.column.${i}`)
    column.add(
      mesh(bevelBox(0.72, 3.68, 0.58, 0.035, 3), 'wood.varnished.dark', { pos: [0, 1.92, 0], wear: 0.7, seed: 130 + i }),
      mesh(bevelBox(0.58, 2.72, 0.025, 0.008, 2), 'mirror.aged', { pos: [0, 2.02, 0.305], cast: false }),
      mesh(bevelBox(0.83, 0.18, 0.72, 0.025, 2), 'brass.tarnished', { pos: [0, 0.09, 0], wear: 0.8, seed: 140 + i }),
      mesh(bevelBox(0.83, 0.20, 0.72, 0.025, 2), 'brass.tarnished', { pos: [0, 3.85, 0], wear: 0.7, seed: 150 + i })
    )
    column.position.set(x * 2.25, 0, 0.85)
    root.add(column)
  }
  return root
}

function makeDesk () {
  const root = group('lobby.front-desk')
  root.add(
    mesh(bevelBox(5.15, 0.95, 0.72, 0.035, 3), 'wood.varnished.dark', { pos: [-2.35, 0.52, -3.55], wear: 0.88, seed: 201 }),
    mesh(bevelBox(5.38, 0.10, 0.92, 0.025, 3), 'wood.varnished.dark', { pos: [-2.35, 1.04, -3.50], wear: 0.7, seed: 202 })
  )
  const panels = []
  const transforms = []
  for (let i = 0; i < 5; i++) {
    panels.push(bevelBox(0.82, 0.68, 0.035, 0.012, 2))
    transforms.push(xf([-4.2 + i * 0.92, 0.53, -3.16]))
  }
  root.add(mesh(merge(panels, transforms), 'wood.varnished.dark', { wear: 0.95, seed: 203 }))
  root.add(mesh(tube([[-4.65, 0.24, -3.08], [-0.05, 0.24, -3.08]], 0.025, 8, 8), 'brass.tarnished', { wear: 0.9, seed: 204 }))
  groundContact(root, { radius: 2.8, radiusZ: 0.62, strength: 0.54 })
  return root
}

function makeFlask () {
  const root = group('lobby.flask')
  root.add(
    mesh(bevelBox(0.14, 0.19, 0.045, 0.025, 4), 'steel.galvanized', { pos: [0, 0.095, 0], wear: 1, seed: 231 }),
    mesh(lathe([[0, 0], [0.027, 0.004], [0.025, 0.035], [0, 0.039]], 18), 'brass.tarnished', { pos: [0.038, 0.195, 0], wear: 0.8, seed: 232 })
  )
  groundContact(root, { radius: 0.12, strength: 0.75 })
  return root
}

// 지배 노멀 축으로 UV를 박스 투영한다. RoundedBox 기본 UV는 면마다 텍스처 전체(0..1)를
// 욱여넣어 0.5m급 소품에서 나이테가 픽셀 노이즈로 뭉개진다(체험 리뷰 §1 라디오 D4).
// tile = 텍스처 한 장이 덮을 월드 거리(m).
function boxUv (geo, tile) {
  const pos = geo.attributes.position
  const nrm = geo.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i))
    let u, v
    if (nx >= ny && nx >= nz) { u = pos.getZ(i); v = pos.getY(i) }
    else if (ny >= nz) { u = pos.getX(i); v = pos.getZ(i) }
    else { u = pos.getX(i); v = pos.getY(i) }
    uv[i * 2] = u / tile
    uv[i * 2 + 1] = v / tile
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

function makeRadio () {
  const root = group('lobby.radio')
  root.add(mesh(boxUv(bevelBox(0.58, 0.38, 0.27, 0.045, 4), 0.8), 'wood.varnished.dark', { pos: [0, 0.19, 0], wear: 0.85, seed: 251 }))
  const grille = []
  const transforms = []
  for (let i = 0; i < 9; i++) {
    grille.push(bevelBox(0.012, 0.22, 0.014, 0.004, 1))
    transforms.push(xf([-0.17 + i * 0.043, 0.22, 0.145]))
  }
  root.add(mesh(merge(grille, transforms), 'brass.tarnished', { wear: 0.8, seed: 252 }))
  for (const x of [-0.17, 0.17]) {
    const dial = mesh(lathe([[0, 0], [0.035, 0.004], [0.038, 0.018], [0, 0.022]], 20), 'bakelite.black', { wear: 0.7, seed: 253 + x })
    dial.position.set(x, 0.105, 0.15)
    dial.rotation.x = Math.PI / 2
    root.add(dial)
  }
  groundContact(root, { radius: 0.38, radiusZ: 0.22, strength: 0.6 })
  return root
}

function makeWindows () {
  const root = group('lobby.windows')
  for (const [i, z] of [1.0, 4.5, 8.0].entries()) {
    const pane = group(`lobby.window.${i}`)
    pane.add(mesh(bevelBox(0.035, 2.15, 2.45, 0.008, 2), 'glass.clear', { pos: [0, 2.25, 0], cast: false }))
    const bars = []
    const tx = []
    for (const y of [1.18, 2.25, 3.32]) {
      bars.push(bevelBox(0.075, 0.065, 2.58, 0.012, 2))
      tx.push(xf([0.02, y, 0]))
    }
    for (const dz of [-1.25, 0, 1.25]) {
      bars.push(bevelBox(0.075, 2.25, 0.065, 0.012, 2))
      tx.push(xf([0.02, 2.25, dz]))
    }
    pane.add(mesh(merge(bars, tx), 'wood.painted.white', { wear: 0.8, seed: 271 + i }))
    pane.position.set(-W * 0.5 + 0.07, 0, z)
    root.add(pane)
  }
  return root
}

function makeElevator () {
  const root = group('lobby.elevator')
  const doors = elevatorDoors(301, { w: 1.55, h: 2.45 }).root
  qaTarget(doors, 'lobby/elevator', { kind: 'transition', prompt: '격자문을 연다', room: 'elevator' })
  root.add(doors)
  const gate = []
  const transforms = []
  for (let i = 0; i < 11; i++) {
    gate.push(tube([[0, 0.10, 0], [0, 2.36, 0]], 0.012, 4, 7))
    transforms.push(xf([-0.70 + i * 0.14, 0, 0.075], [0, 0, (i % 2 ? 1 : -1) * 0.03]))
  }
  for (const y of [0.18, 1.23, 2.30]) {
    gate.push(tube([[-0.72, y, 0], [0.72, y, 0]], 0.016, 4, 8))
    transforms.push(xf([0, 0, 0.075]))
  }
  root.add(mesh(merge(gate, transforms), 'brass.tarnished', { wear: 0.9, seed: 302 }))
  root.position.set(7.20, 0, -1.2)
  root.rotation.y = -Math.PI / 2
  return root
}

function makeAnchors () {
  const root = group('lobby.anchors')
  const defs = [
    ['npc/deitch', [-3.35, 0, -4.25], 0, true],
    ['presence/ruiz-lobby', [5.25, 0, 0.35], -Math.PI * 0.5, true],
    ['presence/pryce-lobby', [3.30, 0, 4.10], Math.PI, true],
    ['presence/doyle-lobby', [0.85, 0, 2.65], Math.PI, false],
    ['cin/act2-elevator', [5.75, 0, -1.20], -Math.PI * 0.5, true],
    ['spawn/act1', [0, 0, 8.75], Math.PI, true]
  ]
  for (const [name, pos, rot, visible] of defs) {
    const anchor = new THREE.Object3D()
    anchor.name = name
    anchor.userData.anchor = name
    anchor.position.fromArray(pos)
    anchor.rotation.y = rot
    anchor.visible = visible
    if (name === 'npc/deitch') {
      anchor.userData.qaId = name
      anchor.userData.interact = { id: name, kind: 'npc', npc: 'deitch', prompt: '다이치에게 묻는다' }
    }
    root.add(anchor)
  }
  return root
}

function dress (root, evidence, bindings) {
  root.add(makeDesk())

  const register = place(registerBook(321, { w: 0.43, d: 0.31 }), [-2.75, 1.10, -3.24], -0.10)
  register.userData.qaId = 'lobby/front-desk'
  register.userData.observation = OBSERVATIONS.register
  register.userData.lore = { id: 'lore.lightwell', medium: 'register-margin' }
  root.add(register)
  evidence?.registerPickup?.(register, 'register')
  bindings.push(register)

  const rack = place(keyRack(331, { cols: 8, rows: 5 }), [-3.9, 1.92, BACK + 0.15])
  rack.userData.qaId = 'lobby/behind-desk'
  rack.userData.observation = OBSERVATIONS.keyrack
  root.add(rack)
  evidence?.registerObservation?.(rack, 'keyrack', { dist: 3.2, hold: 0.7 })
  bindings.push(rack)

  const flask = place(makeFlask(), [-3.25, 0.02, -3.05], 0.23)
  flask.userData.qaId = 'lobby/under-desk'
  flask.userData.observation = OBSERVATIONS.flask
  root.add(flask)
  evidence?.registerObservation?.(flask, 'flask', { dist: 2.9, hold: 0.7 })
  bindings.push(flask)

  const phone = place(telephone(341), [-1.15, 1.10, -3.45], -0.20)
  root.add(phone)
  const blotter = mesh(bevelBox(0.82, 0.018, 0.44, 0.009, 2), 'paper.aged', { pos: [-3.75, 1.105, -3.47], wear: 0.75, seed: 342 })
  blotter.userData.observation = OBSERVATIONS.blotter
  interact(blotter, 'lobby/blotter', { kind: 'environment', prompt: '압지를 살핀다' })
  root.add(blotter)

  const couch = place(sofa(351), [3.25, 0, 4.15], Math.PI)
  couch.userData.observation = OBSERVATIONS.sofa
  interact(couch, 'lobby/sofa-arm', { kind: 'environment', prompt: '팔걸이를 살핀다' })
  root.add(couch)

  const radioTable = place(sideTable(361), [2.0, 0, -1.85], 0.08)
  const radio = makeRadio()
  radio.position.y = 0.69
  qaTarget(radio, 'radio-lobby', {
    kind: 'lore', lore: 'lore.pipes', medium: 'radio-lobby', prompt: '주파수를 맞춘다'
  })
  radioTable.add(radio)
  root.add(radioTable)

  const history = place(framedPicture(371, { w: 1.02, h: 0.72 }), [1.75, 2.35, BACK + 0.15])
  qaTarget(history, 'lobby-frame', {
    kind: 'lore', lore: 'lore.1912', medium: 'lobby-frame', prompt: '개업 연혁을 읽는다'
  })
  root.add(history)
}

function makeLights () {
  ambientRig({ sky: [0.024, 0.019, 0.015], ground: [0.010, 0.007, 0.005], intensity: 0.45 })
  return [
    practical('desk', { pos: [-2.75, 1.54, -3.18], target: [-2.65, 1.04, -3.30], kelvin: 2700, lumens: 560, radius: 4.2, name: 'lobby.desk' }),
    practical('chandelier', { pos: [0, 3.45, -2.2], kelvin: 3400, lumens: 2500, radius: 11, name: 'lobby.pendant.back' }),
    practical('chandelier', { pos: [0, 3.45, 4.5], kelvin: 3400, lumens: 2200, radius: 10, name: 'lobby.pendant.front' }),
    practical('elevator', { pos: [6.55, 3.45, -1.2], target: [5.2, 0.6, -1.2], kelvin: 3400, lumens: 820, radius: 5.2, name: 'lobby.elevator' }),
    practical('moon', { pos: [-6, 8, 6], target: [1, 0, 0], kelvin: 8000, lux: 15, name: 'lobby.window' })
  ]
}

export default {
  name: 'lobby',
  order: 70,

  async init (engine) {
    this.engine = engine
    this.root = group('level/lobby')
    this.bindings = []
    this.off = []
    this.doyleSeen = false

    this.root.add(makeShell(), makeCoffers(), makeColumns(), makeWindows(), makeElevator())
    this.colliders = makeCollisionShell()
    this.root.add(this.colliders)
    this.anchors = makeAnchors()
    this.root.add(this.anchors)
    dress(this.root, engine.get('evidence'), this.bindings)
    engine.scene.add(this.root)

    this.physicsHandle = engine.get('physics')?.addStatic?.(this.colliders, 'cuboid') ?? null
    this.lights = makeLights()
    setMood('lobby-night')

    this.off.push(engine.bus.on('act:enter', ({ act }) => {
      if (act === 1) setMood('lobby-night')
    }))
    this.off.push(engine.bus.on('act:phase', ({ act, phase }) => {
      if (act !== 1 || phase !== 'late' || this.doyleSeen) return
      this.doyleSeen = true
      const anchor = this.anchors.children.find(o => o.userData.anchor === 'presence/doyle-lobby')
      if (anchor) anchor.visible = true
      engine.get('characters')?.place?.()
      engine.bus.emit('npc:sighted', { npc: 'doyle', kind: 'wrench' })
      engine.bus.emit('sfx', { id: 'lobby:wrench-pass', pos: [0.85, 0.8, 2.65], gain: 0.7 })
    }))

    engine.bus.emit('sfx', { id: 'radio:lobby-loop', pos: [2.0, 0.9, -1.85], gain: 0.38 })
    engine.bus.emit('room:changed', { room: 'lobby' })
  },

  update () {},

  dispose () {
    for (const off of this.off ?? []) off()
    const evidence = this.engine?.get('evidence')
    for (const obj of this.bindings ?? []) evidence?.unregister?.(obj)
    this.physicsHandle?.remove?.()
    for (const light of this.lights ?? []) light.dispose?.()
    this.root?.parent?.remove(this.root)
  }
}

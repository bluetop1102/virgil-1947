// [LEVEL-LOBBY] 1막 로비. 셸·목공은 lobby-shell.js가 소유한다(ARCHITECTURE §11 분권).
// 이 파일은 모듈 계약 · 근무대 · 라디오 · 소품 배치 · 광원 배치를 담는다.

import * as THREE from 'three'
import { glowMesh, group, groundContact, lathe, merge, mesh, profile, tube, xf } from './kit.js'
import {
  BACK, FRONT, H, W, bb, makeCoffers, makeCollisionShell, makeColumns,
  makeElevatorArch, makeShell, makeWainscot, makeWindows
} from './lobby-shell.js'
import {
  armchair, ashtray, deskLamp, elevatorDoors, framedPicture, journal, keyRack,
  ledger, luggageCart, potPlant, registerBook, rugRunner, sconce, sideTable, sofa, telephone
} from './props.js'
import { ambientRig, practical, setMood } from './atmosphere.js'
import { rng } from '../core/util.js'

// 서랍·패널 테두리 비드
const BEAD_PROFILE = [
  [0, 0], [0.030, 0], [0.030, 0.013], [0.022, 0.021], [0.011, 0.020],
  [0.004, 0.011], [0, 0.008]
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

function makeDesk () {
  const root = group('lobby.front-desk')
  root.add(
    mesh(bb(5.15, 0.95, 0.72, 0.035, 3, 1.45), 'wood.varnished.dark', { pos: [-2.35, 0.52, -3.55], wear: 0.62, seed: 201 }),
    mesh(bb(5.38, 0.10, 0.92, 0.025, 3, 1.45), 'wood.varnished.dark', { pos: [-2.35, 1.04, -3.50], wear: 0.55, seed: 202 })
  )
  // 서랍 전면 5짝. 옛 판은 0.82×0.68 면에 텍스처 한 장이라 도관이 스펙클 노이즈로 뭉갰다
  // (체험 리뷰 D4 "데스크 서랍 전면도 같은 스펙클"). 박스 투영 패널 밭 + 볼렉션 비드 +
  // 놋쇠 손잡이·열쇠구멍으로 값 층을 셋 세운다.
  // 칸마다 메시를 따로 세운다. 5짝을 한 번에 merge 하면 edgeWear 의 모서리 마스크가 다섯 짝을
  // 통째로 감싼 바운딩박스(폭 4.6m)로 정규화돼 **안쪽 네 짝의 좌우 모서리에 마모가 아예 안
  // 앉는다** — 같은 패널이 0.92m 간격으로 다섯 번 복제된 것으로 읽히던 실체가 이것이다(J2).
  // 칸을 쪼개면 짝마다 자기 bbox 로 네 변이 다 닳고, seed·wear 를 갈라 명도층이 따로 선다.
  const r = rng(207)
  for (let i = 0; i < 5; i++) {
    const x = -4.2 + i * 0.92
    // 1947년 목재 서랍은 레일이 닳아 같은 높이·같은 깊이로 서지 않는다. 처짐 ±4mm,
    // 한 짝(3번)만 11mm 튀어나와 그림자 결이 끊긴다 — 반복을 깨는 것은 값보다 정렬이다.
    const sag = (r() - 0.5) * 0.008
    const proud = i === 3 ? 0.011 : (r() - 0.5) * 0.004
    const y = 0.53 + sag
    const z = -3.172 + proud
    root.add(mesh(bb(0.74, 0.60, 0.030, 0.010, 2, 0.80), 'wood.varnished.dark',
      { pos: [x, y, z], wear: 0.74 + r() * 0.22, seed: 203 + i * 7 }))

    const hx = 0.405, hy = 0.325, bz = z + 0.014
    const beads = []
    for (const [a, b] of [
      [[-hx, hy, 0], [hx, hy, 0]],
      [[hx, hy, 0], [hx, -hy, 0]],
      [[hx, -hy, 0], [-hx, -hy, 0]],
      [[-hx, -hy, 0], [-hx, hy, 0]]
    ]) beads.push(profile(BEAD_PROFILE, [a, b], { up: [0, 0, 1] }))
    root.add(mesh(merge(beads), 'wood.varnished.dark',
      { pos: [x, y, bz], wear: 0.62 + r() * 0.20, seed: 205 + i * 11 }))

    // 손잡이는 나사가 풀려 조금씩 다르게 걸린다. 열쇠 escutcheon 은 2·5번 칸에 없다 —
    // 잠기는 칸과 안 잠기는 칸이 섞여 있는 것이 프런트 데스크의 실물 상태다.
    const brass = [], brassM = []
    brass.push(tube([[-0.068, 0, 0], [-0.056, 0, 0.030], [0.056, 0, 0.030], [0.068, 0, 0]], 0.0075, 16, 7))
    brassM.push(xf([0, 0.015, 0.022], [0, 0, (r() - 0.5) * 0.14]))
    if (i !== 1 && i !== 4) {
      brass.push(lathe([[0, 0], [0.017, 0.002], [0.019, 0.009], [0.009, 0.011]], 14))
      brassM.push(xf([0, -0.185, 0.022], [-Math.PI / 2, 0, 0]))
    }
    root.add(mesh(merge(brass, brassM), 'brass.polished',
      { pos: [x, y, z], wear: 0.42 + r() * 0.26, seed: 206 + i * 13 }))
  }
  root.add(mesh(tube([[-4.65, 0.24, -3.08], [-0.05, 0.24, -3.08]], 0.025, 8, 8), 'brass.tarnished', { wear: 0.9, seed: 204 }))
  groundContact(root, { radius: 2.8, radiusZ: 0.62, strength: 0.54 })
  return root
}

function makeFlask () {
  const root = group('lobby.flask')
  root.add(
    mesh(bb(0.14, 0.19, 0.045, 0.025, 4, 0.20), 'steel.galvanized', { pos: [0, 0.095, 0], wear: 1, seed: 231 }),
    mesh(lathe([[0, 0], [0.027, 0.004], [0.025, 0.035], [0, 0.039]], 18), 'brass.tarnished', { pos: [0.038, 0.195, 0], wear: 0.8, seed: 232 })
  )
  groundContact(root, { radius: 0.12, strength: 0.75 })
  return root
}

// 1940년대 테이블톱 콘솔. 체험 리뷰가 "마감 내 그래픽 수정을 1건만 고른다면 이것"으로 지목한
// 오브젝트다 — 로어 3종 중 하나(lore.pipes)를 담는 상호작용점이라 D4·N3·N6이 한 몸이다.
// 값 층: 바니시 캐비닛 / 밝은 배플 / 모직 그릴 천 / 가로 살 / 놋쇠 다이얼 베젤 / 베이클라이트 노브.
function makeRadio () {
  const root = group('lobby.radio')
  const RW = 0.58, RH = 0.40, RD = 0.28
  const fz = RD * 0.5
  root.add(mesh(bb(RW, RH, RD, 0.052, 5, 1.25), 'wood.varnished.dark', { pos: [0, RH * 0.5, 0], wear: 0.55, seed: 251 }))
  // 전면 배플 — 캐비닛보다 밝은 판. 통판으로 두면 뒤의 스피커 천을 덮어 그릴이 사라진다
  // (1차 실측). 개구부(x −0.235~0.025 · y 0.115~0.325)를 남기고 네 조각으로 짠다.
  const baffle = [], baffleM = []
  for (const [w, h, cxp, cyp] of [
    [0.50, 0.055, 0, 0.3525], [0.50, 0.065, 0, 0.0825],
    [0.015, 0.210, -0.2425, 0.220], [0.225, 0.210, 0.1375, 0.220]
  ]) {
    baffle.push(bb(w, h, 0.016, 0.005, 2, 0.30)); baffleM.push(xf([cxp, cyp, fz - 0.006]))
  }
  root.add(mesh(merge(baffle, baffleM), 'wood.painted.white', { wear: 0.72, seed: 252 }))
  // 스피커 천 — 배플보다 2cm 물러난 모직. 살 사이로 이 어두운 면이 보여야 그릴로 읽힌다
  root.add(mesh(bb(0.27, 0.215, 0.008, 0.003, 1, 0.12), 'fabric.wool.suit', { pos: [-0.105, 0.220, fz - 0.022], wear: 0.4, seed: 253, cast: false }))
  const slats = [], slatM = []
  for (let i = 0; i < 4; i++) {
    slats.push(bb(0.262, 0.017, 0.018, 0.004, 1, 0.30))
    slatM.push(xf([-0.105, 0.142 + i * 0.052, fz + 0.001]))
  }
  root.add(mesh(merge(slats, slatM), 'wood.varnished.dark', { wear: 0.68, seed: 254 }))
  // 튜닝 다이얼 — 놋쇠 베젤 + 종이 눈금판 + 유리 + 바늘. "읽을 수 있는 계기"가 하나 있어야
  // 상자가 기계로 읽힌다.
  const dx = 0.155, dy = 0.235
  root.add(
    mesh(lathe([[0.052, 0], [0.062, 0.005], [0.062, 0.017], [0.052, 0.020], [0.047, 0.013]], 26),
      'brass.tarnished', { pos: [dx, dy, fz - 0.008], rot: [Math.PI / 2, 0, 0], wear: 0.45, seed: 255 }),
    // 눈금판은 뒤에서 전구가 비친다 — 1940년대 라디오가 밤에 자기 위치를 알리는 방식이자,
    // 이 로비에서 "밝은 곳 = 상호작용점"을 성립시키는 국소 광원이다(체험 리뷰 G9).
    glowMesh(lathe([[0, 0], [0.052, 0], [0.052, 0.004], [0, 0.004]], 26), 'radio.dial',
      { color: 0x2a1c0c, emissive: 0xffc271, intensity: 1.15, roughness: 0.55,
        pos: [dx, dy, fz - 0.006], rot: [Math.PI / 2, 0, 0] }),
    mesh(lathe([[0, 0], [0.054, 0], [0.054, 0.003], [0, 0.003]], 26), 'glass.clear',
      { pos: [dx, dy, fz + 0.006], rot: [Math.PI / 2, 0, 0], cast: false }),
    mesh(bb(0.005, 0.048, 0.004, 0.001, 1, 0.05), 'brass.polished',
      { pos: [dx + 0.013, dy + 0.013, fz + 0.001], rot: [0, 0, 0.42], wear: 0.3, seed: 257, cast: false })
  )
  // 눈금. 빈 종이 원판은 계기가 아니라 크림색 단추로 읽힌다(1차 실측) — 주파수 눈금 15개를
  // 박아야 바늘이 무엇을 가리키는지가 성립한다.
  const ticks = [], tickM = []
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI * 0.78 + (i / 14) * Math.PI * 1.56
    const long = i % 3 === 0
    ticks.push(bb(0.0028, long ? 0.014 : 0.008, 0.003, 0.0008, 1, 0.02))
    tickM.push(xf([dx + Math.sin(a) * (long ? 0.041 : 0.044), dy + Math.cos(a) * (long ? 0.041 : 0.044), fz - 0.004], [0, 0, -a]))
  }
  root.add(mesh(merge(ticks, tickM), 'bakelite.black', { wear: 0.3, seed: 265, cast: false }))
  // 노브 — 널링 스커트가 있는 베이클라이트. 옛 판은 캐비닛 아래에 반구가 튀어나온 형태라
  // 조작부로 읽히지 않았다. 전면 하단, 놋쇠 칼라 위에 세우고 지표 핀을 하나 박는다.
  for (const [k, x] of [-0.190, 0.190].entries()) {
    const knob = group(`lobby.radio.knob.${k}`)
    const flutes = [], fluteM = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      flutes.push(bb(0.005, 0.022, 0.008, 0.0012, 1, 0.03))
      fluteM.push(xf([Math.cos(a) * 0.029, 0.021, Math.sin(a) * 0.029], [0, -a, 0]))
    }
    knob.add(
      mesh(lathe([[0.030, 0], [0.036, 0.006], [0.033, 0.011]], 22), 'brass.tarnished', { wear: 0.4, seed: 258 + k }),
      mesh(lathe([[0, 0.009], [0.028, 0.011], [0.031, 0.020], [0.029, 0.038], [0.019, 0.045], [0, 0.047]], 24),
        'bakelite.black', { wear: 0.55, seed: 260 + k }),
      mesh(merge(flutes, fluteM), 'bakelite.black', { wear: 0.35, seed: 261 + k }),
      mesh(bb(0.004, 0.004, 0.032, 0.001, 1, 0.04), 'brass.polished', { pos: [0, 0.040, 0.014], wear: 0.3, seed: 262 + k, cast: false })
    )
    knob.position.set(x, 0.092, fz - 0.004)
    knob.rotation.x = Math.PI / 2
    root.add(knob)
  }
  root.add(
    mesh(tube([[-RW * 0.5 + 0.05, RH - 0.030, fz - 0.014], [RW * 0.5 - 0.05, RH - 0.030, fz - 0.014]], 0.0045, 6, 6),
      'brass.tarnished', { wear: 0.5, seed: 263 }),
    mesh(bb(0.096, 0.020, 0.004, 0.001, 1, 0.10), 'brass.polished', { pos: [0, 0.052, fz + 0.002], wear: 0.45, seed: 264 })
  )
  groundContact(root, { radius: 0.36, radiusZ: 0.22, strength: 0.62 })
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
    // 소파 안쪽 좌표(3.30, 4.10)에 두면 실루엣이 소파를 관통한다(1차 실측) — 닳은 팔걸이
    // 쪽(월드 −x 끝) 바로 앞으로 옮긴다. ARCHITECTURE §8 앵커 규약의 이름은 그대로다.
    ['presence/pryce-lobby', [2.05, 0, 5.45], -0.55, true],
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
  const blotter = mesh(bb(0.82, 0.018, 0.44, 0.009, 2, 0.50), 'paper.aged', { pos: [-3.75, 1.105, -3.47], wear: 0.75, seed: 342 })
  blotter.userData.observation = OBSERVATIONS.blotter
  interact(blotter, 'lobby/blotter', { kind: 'environment', prompt: '압지를 살핀다' })
  root.add(blotter)
  root.add(place(ledger(343), [-4.40, 1.096, -3.62], 0.28))
  root.add(place(ashtray(344, { butts: 3 }), [-0.42, 1.096, -3.30], 0.5))

  // 소파 사분면. "데스크 반경 2m만 완성된 방"이라는 판정을 뒤집는 축이다(체험 리뷰 G6) —
  // 러그로 구획을 잡고 안락의자·사이드테이블·화분으로 시선이 머무는 자리를 만든다.
  // 팔걸이 마모는 프런트가 보이는 쪽(월드 −x) 한쪽에만 든다(N6).
  const couch = place(sofa(351, { wornArm: 1 }), [3.25, 0, 4.15], Math.PI)
  couch.userData.observation = OBSERVATIONS.sofa
  interact(couch, 'lobby/sofa-arm', { kind: 'environment', prompt: '팔걸이를 살핀다' })
  root.add(couch)
  // 러그는 놋쇠 인레이(상단 y=0.011) 위로 올린다 — 바닥에 붙이면 인레이가 러그를 뚫고 나온다
  root.add(place(rugRunner(352, { w: 3.6, len: 3.0 }), [4.30, 0.010, 4.55]))
  root.add(place(armchair(353, { fabric: 'leather.worn.brown' }), [5.75, 0, 5.30], -1.75))
  const lampTable = place(sideTable(354), [5.55, 0, 3.35], 0.6)
  root.add(lampTable)
  // 라운지 광원은 실물 스탠드다. practical('sconce')를 방 한복판 높이에 놓으면 벽등 기구가
  // 허공에 뜬 채 렌더돼 그 자체가 D4가 된다(1차 실측).
  lampTable.add(place(deskLamp(355), [0.02, 0.58, -0.02], 2.1))
  lampTable.add(place(ashtray(356, { butts: 5 }), [0.11, 0.58, 0.11], 0.9))
  lampTable.add(place(journal(357), [0.04, 0.166, 0.02], -0.7))
  root.add(place(potPlant(358), [6.65, 0, 7.20], 0.4))
  root.add(place(potPlant(359), [-6.30, 0, 6.90], 2.1))
  root.add(place(luggageCart(360), [-5.85, 0, 2.60], 0.55))

  const radioTable = place(sideTable(361), [2.0, 0, -1.85], 0.08)
  const radio = makeRadio()
  radio.position.y = 0.58
  qaTarget(radio, 'radio-lobby', {
    kind: 'lore', lore: 'lore.pipes', medium: 'radio-lobby', prompt: '주파수를 맞춘다'
  })
  radioTable.add(radio)
  radioTable.add(place(journal(362), [0.03, 0.166, 0.02], 1.2))
  root.add(radioTable)

  const history = place(framedPicture(371, { w: 1.02, h: 0.72 }), [1.75, 2.35, BACK + 0.15])
  qaTarget(history, 'lobby-frame', {
    kind: 'lore', lore: 'lore.1912', medium: 'lobby-frame', prompt: '개업 연혁을 읽는다'
  })
  root.add(history)
  // 연혁판 옆 벽등 — 로어 두 점(연혁판·라디오)이 놓인 사분면에 광원 방향을 준다(G1/G9)
  root.add(place(sconce(374), [2.95, 2.16, BACK + 0.12]))
  const rightArt = place(framedPicture(372, { w: 0.52, h: 0.68 }), [W * 0.5 - 0.13, 2.05, 3.40])
  rightArt.rotation.y = -Math.PI * 0.5
  root.add(rightArt)
  const frontArt = place(framedPicture(373, { w: 0.62, h: 0.46 }), [-2.15, 2.15, FRONT - 0.13])
  frontArt.rotation.y = Math.PI
  root.add(frontArt)
}

// 광원의 위치·개수·색온도만 여기서 정한다 — 노출·볼류메트릭·그림자 품질은 [S2] 소유다.
// 데스크 코너에서만 성립하던 문법(국소 텅스텐 + 사선 필 + 어두운 주변부)을 네 사분면에
// 반복하고, 밝은 자리가 곧 상호작용점이 되게 배치한다(체험 리뷰 G1/G9).
function makeLights () {
  ambientRig({ sky: [0.024, 0.019, 0.015], ground: [0.010, 0.007, 0.005], intensity: 0.45 })
  return [
    // hot 2.4(KINDS 기본) → 0.45. 3차 §0-2: 램프 사발이 얼굴의 1.56배 휘도에 평탄면 18.25%라
    // "화면에서 가장 밝고 가장 넓은 무정보 면"이 인물 옆에 상수로 앉는다. hot 은 기구 발광부
    // 배수라 **투사광은 그대로**다 — S-B 카메라 회피가 전제한 광원 위치·광속·방향 불변.
    // HANDOFF 처방이던 개구 회전은 이 기구에 듣지 않는다: fixtures.js SHADE_FRAG 가
    // abs(dot(N,V)) 라 셰이드 안팎이 같은 밝기로 발광해 어느 쪽으로 돌려도 카메라를 향한 면이
    // uCore 로 켜진다. lumens 하향도 무효였다(등록 A/B shots/sh-ab5: ×0.70 에서 비 1.622→1.604).
    // 스윕(shots/sh-ab5·sh-ab7, interrogation-deitch 고정 크롭): hot 2.4→1.622 · 1.32→1.433 ·
    // 0.96→1.333 · 0.72→1.242 · 0.60→1.186 · 0.45→**1.094** · 0.35→1.013.
    // 0.45 를 고른 이유는 비 1.1 이하를 만족하는 최댓값이라 전구 코어(p95 196.6)가 남기 때문이다.
    practical('desk', { pos: [-2.75, 1.54, -3.18], target: [-2.65, 1.04, -3.30], kelvin: 2700, lumens: 560, radius: 4.2, hot: 0.45, name: 'lobby.desk' }),
    practical('chandelier', { pos: [0, 3.45, -2.2], kelvin: 3400, lumens: 2100, radius: 10, name: 'lobby.pendant.back' }),
    practical('chandelier', { pos: [0, 3.45, 4.5], kelvin: 3400, lumens: 1750, radius: 9, name: 'lobby.pendant.front' }),
    // 라디오 눈금판이 뿜는 빛. 발광면은 glowMesh(radio.dial)이 그리고, 주변에 실제로
    // 떨어지는 광은 이 기구 없는 광원이 만든다 — 기구를 켜면 벽등이 허공에 뜬다(1차 실측).
    practical('desk', {
      pos: [2.02, 0.83, -1.71], target: [2.02, 0.62, -1.35], kelvin: 2400, lumens: 95,
      radius: 1.9, fixture: false, name: 'lobby.radio'
    }),
    // 엘리베이터는 아치 안쪽 광만 남기고 주변을 감쇠시킨다 — 홀 안이 유일한 밝은 면이 된다
    practical('elevator', { pos: [6.95, 2.30, -1.2], target: [6.40, 0.9, -1.2], kelvin: 3600, lumens: 520, radius: 3.1, name: 'lobby.elevator' }),
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

    this.root.add(makeShell(), makeWainscot(), makeCoffers(), makeColumns(), makeWindows(),
      makeElevatorArch(), makeElevator())
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

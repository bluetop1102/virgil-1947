import * as THREE from 'three'

// ── 심문 카메라 ──────────────────────────────────────────────────────
// cinematics.js 에서 분리했다(500줄 계약). 시네마틱과 공유하는 보간·시선 유틸도
// 여기 산다 — 두 곳 다 이 파일에서 가져다 쓴다.

export const EYE = 1.68
// 손떨림 진폭 — 인트로 트래킹과 심문 컷이 같은 값을 쓴다.
export const HAND_AMP = THREE.MathUtils.degToRad(0.15)

const INTERROGATION = Object.freeze({
  // 컷 종류별 정위치 사거리(얼굴 기준). push 는 얼굴로 들어가고 pull 은 방을 보여주며 물러난다.
  // 하한은 물리 몸이 카운터(앞면 z=-3.04)에 끼지 않는 거리다.
  range: { push: 1.82, slide: 2.04, pull: 2.34, low: 2.10 },
  // 진입 각 흡수 — 이 각들을 차례로 재서 얼굴·양손이 다 열리는 첫 자리를 고른다.
  // 데스크 램프(-2.75, 1.54, -3.18)가 정면 진입 각의 시선을 정확히 먹는다(2차 판정 §0-6).
  // 플레이어가 어디서 들어오든 카메라가 각을 흡수해야 복불복이 사라진다.
  arcDeg: [0, 10, -10, 19, -19, 28, -28, 36, -36],
  // 판정 반응 컷 전용 후보각 — 0°를 빼서 최소 13° 이상 각이 바뀌게 강제한다. 진술 컷과
  // 같은 자리에서 렌즈만 움직이면 컷이 아니라 같은 그림이 된다(블라인드 판독: "reverse로
  // 이름 붙은 4·5번도 1·2번과 구분되는 별도 앵글로 보이지 않는다").
  reactArc: [22, -22, 31, -31, 13, -13, 40, -40],
  // 측면 로우앵글(3차 판정 J3③ "네 컷 전부 정면 미디엄 — 거리만 다르다"). 다른 컷과 달리
  // 각을 **인물의 정면 기준 절대값**으로 잡는다(facing) — 진입 각 기준이면 플레이어가 어디서
  // 들어왔느냐에 따라 같은 지시가 30°도 되고 70°도 돼 "측면"이 성립하지 않는다.
  // 큰 각부터 재고, 카운터 뒤로 넘어가는 각은 얼굴 차폐로 스스로 탈락해 앞 각으로 물러난다.
  low: {
    arc: [52, -52, 41, -41, 62, -62, 30, -30, 20, -20],
    drop: 0.50,           // 카운터 상판(1.09) 바로 위 — 손 높이에서 얼굴을 올려다본다
    bias: 0.46,           // 조준점을 얼굴 쪽으로 올려 앙각을 만든다(다른 컷은 손 쪽 0.78)
    hold: 2.0,            // 낮은 자리에 머무는 시간
    rise: 1.25            // 눈높이로 복귀 — player 모듈이 매 프레임 pos.y+EYE 로 카메라를
  },                      // 되쓰므로, 복귀 없이 컷을 놓으면 0.5m 가 한 프레임에 튄다(실측)
  headroom: 0.13,         // 정수리 위 여백(m)
  cover: 2.20,            // 피사체 세로 폭 대비 프레임 세로 배수
  margin: 0.16,           // 손 옆 여유 — 이만큼 떨어진 곳까지 비어 있어야 손이 산다
  lensMin: 27,
  lensMax: 58,
  clear: 0.12,            // 차폐 판정에서 표적 앞 여유(m)
  // 조준점을 손 쪽으로 내린 만큼 인물이 프레임 위로 올라온다. 0.5(정중앙)면 손이 자막
  // 띠와 겹쳐 "손이 안 보인다"로 읽힌다 — 실측 후 상향.
  bias: 0.78,
  reactBias: 0.80,        // 반응 컷은 더 — 카운터가 프레임 하단 전경에 물린다
  reactDrop: 0.09,
  doubtTurn: 0.30,
  breakDrop: 0.08,
  dofBias: 1,
  dofMs: 650
})

const UP = new THREE.Vector3(0, 1, 0)
const _lookM = new THREE.Matrix4()

// 카메라 규약(-Z가 정면)으로 회전을 만든다. Object3D.lookAt 은 카메라가 아닌 객체에서
// +Z를 표적으로 돌려서, 그 결과를 카메라 쿼터니언으로 쓰면 정확히 180° 반대를 본다 —
// 판정 리버스 샷이 다이치를 잃고 로비 반대쪽을 비추던 원인이다(실측: fwd 부호 반전).
function lookQuat (from, to) {
  _lookM.lookAt(from, to, UP)
  return new THREE.Quaternion().setFromRotationMatrix(_lookM)
}

export function clamp01 (v) {
  return Math.min(1, Math.max(0, v))
}

export function smooth (v) {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}

export function yawTo (from, target) {
  return Math.atan2(-(target.x - from.x), -(target.z - from.z))
}

// ── 심문 카메라 ──────────────────────────────────────────────────────
// 선택은 순간이지만 카메라는 끊지 않는다. 모든 반응은 현재 포즈에서 이어지는 단일 보간이다.
export class InterrogationCamera {
  constructor (engine) {
    this.engine = engine
    this.move = null
    this.lieBase = null
    this.npc = null
    this.linkCount = 0
    this.ray = new THREE.Raycaster()
    this.off = [
      engine.bus.on('interrogation:statement', (p) => this._statement(p)),
      engine.bus.on('interrogation:aiming', (p) => this._aim(p)),
      engine.bus.on('interrogation:verdict', (p) => this._verdict(p)),
      engine.bus.on('perf:state', (p) => this._performance(p)),
      engine.bus.on('deduction:link', (p) => this._link(p))
    ]
  }

  _pose () {
    const camera = this.engine.camera
    return {
      pos: camera.position.clone(),
      quat: camera.quaternion.clone(),
      lens: camera.getFocalLength()
    }
  }

  // 프레이밍 표적 — 얼굴·두 손·두 어깨. 리그가 진실원이다(앵커는 리그가 없을 때의 폴백).
  // 어깨를 같이 재지 않으면 얼굴만 아슬하게 비껴간 자리가 뽑혀 램프 볼이 가슴을 통째로
  // 덮은 채 "통과"한다 — 얼굴이 보여도 그 프레임은 못 쓴다.
  // 인물이 향한 쪽의 방위각. 이것이 0°(정면)의 기준이고, 측면 컷은 여기서 각을 잰다.
  // 인물 로컬 +z 가 얼굴 방향이다(rig.js — 얼굴·조끼·안경이 전부 +z 에 붙는다).
  static _facing (object) {
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()))
    return Math.atan2(fwd.x, fwd.z)
  }

  _points (npc) {
    const rig = this.engine.get('characters')?.rigs?.get(npc)
    if (rig?.joints?.head && rig.root?.visible !== false) {
      const at = (k, y) => rig.joints[k]?.localToWorld(new THREE.Vector3(0, y, 0))
      const face = rig.joints.head.localToWorld(new THREE.Vector3(0, 0.105, 0.05))
      const hands = [at('leftWrist', -0.09), at('rightWrist', -0.09)].filter(Boolean)
      const torso = [at('leftShoulder', -0.10), at('rightShoulder', -0.10)].filter(Boolean)
      return {
        face, hands, torso, root: rig.root, top: face.y + INTERROGATION.headroom,
        facing: InterrogationCamera._facing(rig.root)
      }
    }
    let anchor = null
    this.engine.scene.traverse((o) => {
      if (!anchor && o.visible !== false && o.userData?.anchor === `npc/${npc}`) anchor = o
    })
    if (!anchor) return null
    const face = new THREE.Vector3()
    anchor.getWorldPosition(face)
    face.y += 1.52
    return {
      face, hands: [], torso: [], root: null, top: face.y + INTERROGATION.headroom,
      facing: InterrogationCamera._facing(anchor)
    }
  }

  // 시야를 실제로 막는 것만 센다. 깊이를 쓰지 않는 것(먼지 입자·광축·글로우)은 뒤가
  // 비쳐 보이므로 차폐가 아니다 — 이것을 안 거르면 로비 전역에 떠 있는 `atmo.particles`가
  // 모든 후보 각을 "막힘"으로 만들어 회피 탐색이 통째로 무력화된다(실측: 전 각 0.1m 히트).
  static _solid (object) {
    if (!object?.isMesh) return false
    const mat = Array.isArray(object.material) ? object.material[0] : object.material
    if (!mat || mat.depthWrite === false || mat.visible === false) return false
    return !(mat.transparent && (mat.opacity ?? 1) < 0.9)
  }

  // from→to 사이에 렌더되는 물체가 있는가. Raycaster는 visible을 보지 않으므로 조상까지
  // 훑어 숨은 것(충돌 셸 등)을 버린다 — 안 그러면 보이지도 않는 벽이 자리를 다 거른다.
  _blocked (from, to, ignore) {
    const dir = to.clone().sub(from)
    const dist = dir.length()
    if (dist < 0.3) return false
    this.ray.set(from, dir.divideScalar(dist))
    this.ray.near = 0.06
    this.ray.far = dist - INTERROGATION.clear
    for (const hit of this.ray.intersectObject(this.engine.scene, true)) {
      if (!InterrogationCamera._solid(hit.object)) continue
      let hidden = false
      for (let o = hit.object; o; o = o.parent) {
        if (o === ignore || o.visible === false) { hidden = true; break }
      }
      if (!hidden) return true
    }
    return false
  }

  // 표적과 그 좌우 margin 만큼 떨어진 두 점까지 함께 재서 "옆에 바짝 붙은 것"도 센다.
  _crowded (from, to, ignore, margin = INTERROGATION.margin) {
    let hits = this._blocked(from, to, ignore) ? 2 : 0
    const side = new THREE.Vector3(-(to.z - from.z), 0, to.x - from.x)
    if (side.lengthSq() < 1e-6) return hits
    side.normalize().multiplyScalar(margin)
    for (const s of [1, -1]) {
      const probe = to.clone().addScaledVector(side, s)
      if (this._blocked(from, probe, ignore)) hits += 1
    }
    return hits
  }

  // 심문 컷의 정위치를 만든다. 진입 각에서 출발해 arcDeg를 차례로 재고, 얼굴·양손이
  // 전부 열리는 첫 각을 쓴다. 렌즈는 피사체 세로 폭에서 역산해 얼굴과 손이 같이 남는다.
  _stage (npc, kind = 'slide', opts = {}) {
    const pts = this._points(npc)
    if (!pts) return null
    const player = this.engine.get('player')
    const floorY = player?.pos?.y ?? this.engine.camera.position.y - EYE
    const eyeY = floorY + EYE - (opts.drop || 0)
    const radius = (INTERROGATION.range[kind] ?? INTERROGATION.range.slide) + (opts.back || 0)
    const from = this.engine.camera.position
    const base = opts.facing && pts.facing != null
      ? pts.facing
      : Math.atan2(from.x - pts.face.x, from.z - pts.face.z)
    const enter = base + (opts.turn || 0)
    let best = null
    for (const deg of opts.arc ?? INTERROGATION.arcDeg) {
      const az = enter + THREE.MathUtils.degToRad(deg)
      const pos = new THREE.Vector3(
        pts.face.x + Math.sin(az) * radius, eyeY, pts.face.z + Math.cos(az) * radius)
      let score = this._blocked(pos, pts.face, pts.root) ? 6 : 0
      // 손은 여유를 두고 잰다. 시선을 딱 비껴간 자리는 램프 볼이 손 바로 옆에 붙은 채로
      // "통과"하고, 아웃포커스 번짐이 손 윤곽을 먹는다(블라인드 판독 5장 전부 "일부 가림").
      for (const p of pts.hands) score += this._crowded(pos, p, pts.root)
      for (const p of pts.torso) if (this._blocked(pos, p, pts.root)) score += 1
      if (!best || score < best.score) best = { pos, score }
      if (score === 0) break
    }
    const low = pts.hands.length ? Math.min(...pts.hands.map((h) => h.y)) : pts.face.y - 0.42
    const bias = opts.bias ?? INTERROGATION.bias
    const focus = pts.face.clone()
    focus.y = pts.top * (1 - bias) + low * bias
    const dist = best.pos.distanceTo(focus)
    const span = Math.max(0.42, pts.top - low) * INTERROGATION.cover
    const lens = Math.min(INTERROGATION.lensMax, Math.max(INTERROGATION.lensMin,
      this.engine.camera.getFilmHeight() * dist / span * (opts.lens ?? 1)))
    return { pos: best.pos, quat: lookQuat(best.pos, focus), lens }
  }

  _cut (npc, kind, seconds, opts = {}) {
    const pose = this._stage(npc, kind, opts)
    if (!pose) return false
    this._start(pose, seconds, opts.linear === true, opts.then ?? null)
    return true
  }

  // then 은 보간이 끝난 순간 이어붙일 다음 단계를 만든다. 있으면 _syncPlayer 를 미룬다 —
  // 중간 단계에서 플레이어를 옮기면 카메라 높이가 바닥 좌표로 새어 나가고, player 모듈이
  // 다음 프레임에 그 값으로 카메라를 되쓴다.
  _start (target, duration, linear = false, then = null) {
    const from = this._pose()
    this.move = {
      from,
      to: {
        pos: target.pos?.clone() ?? from.pos.clone(),
        quat: target.quat?.clone() ?? from.quat.clone(),
        lens: target.lens ?? from.lens
      },
      duration,
      elapsed: 0,
      linear,
      then
    }
  }

  // 측면 로우앵글: 내려가며 돌기 → 머물기 → 원래 자리로 복귀. 머물기는 from=to 인 0이동
  // 보간이라 update 가 매 프레임 같은 포즈를 다시 세우고, player 모듈이 pos.y+EYE 로
  // 카메라를 되쓰는 것을 그동안 덮는다.
  // **복귀가 계약이다.** 뒤따르는 컷들은 전부 진입 각 기준(arcDeg·reactArc)이라, 이 컷이
  // 측면에 플레이어를 놓고 끝나면 그 52°가 다음 컷의 기준각이 되고 판정 리액션이 74°까지
  // 밀린다(실측). 한 번 찌르고 돌아와야 "정면 연속을 끊는 한 컷"으로 남는다.
  _lowCut (npc) {
    const low = INTERROGATION.low
    const back = this._pose()
    return this._cut(npc, 'low', 1.15, {
      facing: true, arc: low.arc, drop: low.drop, bias: low.bias,
      then: () => this._start(this._pose(), low.hold, false, () => this._start(back, low.rise))
    })
  }

  // 착지. 눈높이보다 낮은 자리에서 보간이 끝나면 player 모듈이 다음 프레임에 pos.y+EYE 로
  // 카메라를 되쓰면서 그 차이가 한 프레임에 통째로 튄다(실측). 어떤 경로로 내려왔든
  // — 로우앵글이든 그 위에 겹친 breaking 하강이든 — 눈높이 복귀를 붙여서 놓는다.
  _land (to) {
    const floorY = this.engine.get('player')?.pos?.y ?? to.pos.y - EYE
    if (to.pos.y > floorY + EYE - 0.14) { this._syncPlayer(to); return }
    const pose = this._stage(this.npc, 'slide', { arc: [0] })
    if (pose) this._start(pose, INTERROGATION.low.rise)
    else this._syncPlayer(to)
  }

  // 진술이 시작될 때마다 컷을 다시 잡는다. 이 자리가 없으면 프레임이 플레이어의 접근
  // 각·직전 컷의 렌즈에 그대로 맡겨져, 같은 진술이 어떤 판정에서는 보이고 어떤 판정에서는
  // 램프에 통째로 가린다(2차 §0-6 · JUDGE J3).
  _statement ({ npc, camera } = {}) {
    if (npc) this.npc = npc
    if (!this.npc) return
    if (camera === 'low') { this._lowCut(this.npc); return }
    this._cut(this.npc, camera === 'push' || camera === 'pull' ? camera : 'slide', 1.05)
  }

  _aim ({ on } = {}) {
    if (on) {
      this.lieBase = this._pose()
      this._cut(this.npc, 'push', INTERROGATION.dofMs / 1000)
      this.engine.bus.emit('camera:dof', { bias: INTERROGATION.dofBias, ms: INTERROGATION.dofMs })
      return
    }
    this.engine.bus.emit('camera:dof', { bias: 0, ms: 500 })
    // 판정이 이미 다음 컷을 잡았으면(lieBase 소거) 되돌리지 않는다 — 되돌리면 판정
    // 리버스 샷이 제시 직전 프레임으로 덮여 반응 컷이 사라진다.
    if (!this.lieBase) return
    this._start(this.lieBase, 0.5)
    this.lieBase = null
  }

  // 모든 판정 컷은 상대에게 앵커된다. 형사 단독 프레임이 나오지 않는 것이 계약이고,
  // 반응 컷은 조준점을 손 쪽으로 내려 카운터 모서리를 전경에 물린다(오버숄더 대체 —
  // 1인칭이라 어깨 너머 샷은 형사 아바타가 없어 성립하지 않는다. G9/J2).
  _verdict ({ npc, choice, correct } = {}) {
    this.npc = npc ?? this.npc
    this.lieBase = null
    const react = {
      bias: INTERROGATION.reactBias, drop: INTERROGATION.reactDrop, arc: INTERROGATION.reactArc
    }
    if (choice === 'TRUTH') { this._cut(this.npc, 'pull', 0.9, { lens: 1.06 }); return }
    if (choice === 'DOUBT') {
      this._cut(this.npc, 'slide', 0.8, { turn: INTERROGATION.doubtTurn, linear: true })
      return
    }
    if (choice !== 'LIE') return
    this.engine.bus.emit('camera:dof', { bias: 0, ms: 500 })
    if (correct) this._cut(this.npc, 'push', 0.6, { ...react, back: -0.16 })
    else this._cut(this.npc, 'pull', 0.8, { ...react, back: 0.32, lens: 0.88 })
  }

  _performance ({ npc, state } = {}) {
    if (npc) this.npc = npc
    if (state !== 'breaking') return
    const pose = this._pose()
    const pending = this.move?.to
    const pos = pending?.pos.clone() ?? pose.pos.clone()
    pos.y -= INTERROGATION.breakDrop
    this._start({
      pos,
      quat: pending?.quat ?? pose.quat,
      lens: pending?.lens ?? pose.lens
    }, 0.72)
  }

  _link ({ ok } = {}) {
    if (!ok) return
    this.linkCount = Math.min(3, this.linkCount + 1)
    const lens = 54 - this.linkCount * 6
    this._start({ lens }, 0.9)
  }

  // 컷이 끝나면 플레이어를 그 자리에 옮겨 앉힌다. 물리 몸까지 옮기지 않으면 다음 프레임에
  // 몸 좌표가 카메라를 원위치로 끌어당겨, 잡아둔 구도가 컷이 끝나는 순간 풀린다(실측).
  _syncPlayer (pose) {
    const player = this.engine.get('player')
    if (!player) return
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(pose.quat)
    const target = pose.pos.clone().add(forward)
    player.teleport?.([pose.pos.x, pose.pos.y - EYE, pose.pos.z], yawTo(pose.pos, target))
    player.body?.setPosition?.(pose.pos.x, (player.body.height ?? 1.78) * 0.5, pose.pos.z)
    if (typeof player.pitch === 'number') {
      const euler = new THREE.Euler().setFromQuaternion(pose.quat, 'YXZ')
      player.pitch = player.pitchT = euler.x
    }
  }

  update (dt) {
    if (!this.move) return
    const move = this.move
    move.elapsed = Math.min(move.duration, move.elapsed + dt)
    const raw = clamp01(move.elapsed / move.duration)
    const t = move.linear ? raw : smooth(raw)
    const camera = this.engine.camera
    camera.position.lerpVectors(move.from.pos, move.to.pos, t)
    camera.quaternion.slerpQuaternions(move.from.quat, move.to.quat, t)
    camera.setFocalLength(THREE.MathUtils.lerp(move.from.lens, move.to.lens, t))
    const envelope = Math.sin(raw * Math.PI)
    camera.rotateY(Math.sin(this.engine.time * Math.PI * 0.8) * HAND_AMP * envelope)
    camera.rotateX(Math.cos(this.engine.time * Math.PI * 0.8 + 0.7) * HAND_AMP * 0.36 * envelope)
    camera.updateMatrixWorld(true)
    if (raw < 1) return
    camera.position.copy(move.to.pos)
    camera.quaternion.copy(move.to.quat)
    camera.setFocalLength(move.to.lens)
    camera.updateMatrixWorld(true)
    this.move = null
    if (move.then) { move.then(); return }
    this._land(move.to)
  }

  dispose () {
    for (const off of this.off) off()
  }
}

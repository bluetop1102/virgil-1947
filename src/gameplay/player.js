// 1인칭 컨트롤러. 수사물이라 이동은 느리고, 카메라는 손에 들린 필름 카메라처럼 반박자 늦는다.
// QA 모드에서는 어떤 입력도 받지 않고 카메라를 건드리지 않는다 — 하네스가 카메라의 유일한 주인이다.

import * as THREE from 'three'
import { clamp, damp } from '../core/util.js'

const EYE = 1.68
const WALK = 1.2            // m/s. 슈터가 아니다
const ACCEL = 9             // 속도 damp lambda
const GRAVITY = 9.81
const RADIUS = 0.32
const BODY_H = 1.78         // 캡슐 전체 높이. 눈은 발바닥에서 EYE
const STRIDE = 0.72         // 보폭(m). 발소리와 헤드밥이 같은 위상 소스를 쓴다
const LOOK_LAMBDA = 7       // 6~8. 즉답하지 않는 카메라
const SENS = 0.0021
const REACH = 3.0
const STEP_UP = 0.28

const BOB_Y = 0.014         // 1.5cm 이하
const BOB_X = 0.008
const BOB_ROLL = 0.0062     // rad, 약 0.36도
const BREATH_HZ = 0.4
const BREATH_Y = 0.003

// 바닥 재질명 → 발소리 카테고리. library.js의 명명 규약을 문자열로만 참조한다(직접 import 금지).
const FLOOR_KINDS = [
  [/carpet|rug/i, 'carpet'],
  [/water|puddle|wet/i, 'water'],
  [/marble|tile|ceramic|porcelain/i, 'tile'],
  [/wood|parquet|varnish/i, 'wood'],
  [/steel|brass|metal|galvan|catwalk|grate/i, 'metal'],
  [/concrete|plaster|stone|asphalt/i, 'concrete']
]

function floorKind (hit) {
  const raw = hit.object.userData?.floor || hit.object.userData?.mat || hit.object.material?.name || ''
  for (const [re, kind] of FLOOR_KINDS) if (re.test(raw)) return kind
  return 'concrete'
}

function interactOf (obj) {
  let o = obj
  for (let i = 0; o && i < 6; i++, o = o.parent) {
    const it = o.userData?.interact
    if (it) return { host: o, id: typeof it === 'string' ? it : it.id, data: it }
  }
  return null
}

export default {
  name: 'player',
  order: 20,

  engine: null,
  pos: new THREE.Vector3(0, 0, 8),
  vel: new THREE.Vector3(),
  vy: 0,
  yaw: 0, pitch: 0, yawT: 0, pitchT: 0,
  dist: 0, stepCount: 0, grounded: true,
  keys: null, bound: null,
  solids: [], hot: [], nextScan: 0,
  floorY: 0,   // 레이캐스트가 바닥을 못 찾았을 때의 최종 바닥. 대기 프로브(y=-500)에서는 이 값을 옮긴다
  focus: null, focusDist: 0,
  ray: null, down: null,
  body: null, physFail: false, floorHit: null,
  _o: new THREE.Vector3(), _d: new THREE.Vector3(), _n: new THREE.Vector3(),

  async init (engine) {
    this.engine = engine
    this.keys = new Set()
    this.ray = new THREE.Raycaster()
    this.down = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 2.4)
    this.ray.far = REACH

    const c = engine.camera
    this.pos.set(c.position.x, c.position.y - EYE, c.position.z)
    this.yaw = this.yawT = c.rotation.y
    this.pitch = this.pitchT = c.rotation.x

    engine.bus.on('room:changed', () => { this.nextScan = 0 })
    if (!engine.qa) this._listen()
  },

  _listen () {
    const cv = this.engine.canvas
    const doc = document
    const onDown = (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      if (e.code === 'KeyE') this._interact()
    }
    const onUp = (e) => this.keys.delete(e.code)
    const onBlur = () => this.keys.clear()
    const onMove = (e) => {
      if (doc.pointerLockElement !== cv) return
      this.yawT -= e.movementX * SENS
      this.pitchT = clamp(this.pitchT - e.movementY * SENS, -1.48, 1.48)
    }
    const onClick = () => {
      if (doc.pointerLockElement !== cv) { cv.requestPointerLock?.(); return }
      this._interact()
    }
    doc.addEventListener('keydown', onDown)
    doc.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    doc.addEventListener('mousemove', onMove)
    cv.addEventListener('click', onClick)
    this.bound = () => {
      doc.removeEventListener('keydown', onDown)
      doc.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      doc.removeEventListener('mousemove', onMove)
      cv.removeEventListener('click', onClick)
    }
  },

  // 씬은 레벨 모듈이 나중에 짓는다. 목록은 주기적으로만 다시 훑는다.
  // three 의 레이캐스터는 visible 을 보지 않는다(three.core.js intersect()). traverse 로 훑으면
  // 꺼진 방의 포털과 그 방에 서 있는 NPC 가 그대로 상호작용 대상으로 남아, 로비에서 942호의
  // 프라이스를 심문할 수 있게 된다. 그래서 여기서 꺼진 가지를 통째로 잘라낸다.
  _scan () {
    const solids = []
    const hot = []
    const walk = (o) => {
      if (o.visible === false) return
      if (o.userData?.interact) hot.push(o)
      if (o.isMesh && o.geometry && !o.userData?.noCollide) solids.push(o)
      for (const c of o.children) walk(c)
    }
    walk(this.engine.scene)
    this.solids = solids
    this.hot = hot
  },

  _ground () {
    if (!this.solids.length) return null
    this.down.ray.origin.set(this.pos.x, this.pos.y + 1.0, this.pos.z)
    const hits = this.down.intersectObjects(this.solids, false)
    return hits.length ? hits[0] : null
  },

  // 물리 모듈이 없을 때의 자체 충돌: 진행 방향으로 무릎·허리 두 높이를 찔러보고 법선으로 미끄러진다.
  _slide (dx, dz) {
    if (!this.solids.length) { this.pos.x += dx; this.pos.z += dz; return }
    const dir = this._d
    const n = this._n
    for (let iter = 0; iter < 2; iter++) {
      const len = Math.hypot(dx, dz)
      if (len < 1e-5) break
      dir.set(dx / len, 0, dz / len)
      let blocked = null
      for (const y of [0.4, 1.1]) {
        this._o.set(this.pos.x, this.pos.y + y, this.pos.z)
        this.ray.set(this._o, dir)
        this.ray.far = len + RADIUS
        const h = this.ray.intersectObjects(this.solids, false)
        if (h.length && h[0].distance < len + RADIUS) { blocked = h[0]; break }
      }
      this.ray.far = REACH
      if (!blocked) break
      if (blocked.face) n.copy(blocked.face.normal).transformDirection(blocked.object.matrixWorld)
      else n.copy(dir).negate()
      n.y = 0
      if (n.lengthSq() < 1e-6) { dx = 0; dz = 0; break }
      n.normalize()
      const dot = dx * n.x + dz * n.z
      dx -= n.x * dot
      dz -= n.z * dot
    }
    this.pos.x += dx
    this.pos.z += dz
  },

  _move (dt, wishX, wishZ) {
    const phys = this.engine.get('physics')
    this.vel.x = damp(this.vel.x, wishX * WALK, ACCEL, dt)
    this.vel.z = damp(this.vel.z, wishZ * WALK, ACCEL, dt)

    // 물리 모듈이 살아 있으면 캡슐 컨트롤러가 권위를 갖는다(중력·계단·경사는 래퍼가 처리한다)
    if (phys?.character && !this.body && !this.physFail) {
      this.body = phys.character(RADIUS, BODY_H)
      if (this.body) this.body.setPosition(this.pos.x, this.pos.y + BODY_H * 0.5, this.pos.z)
      else this.physFail = true
    }
    if (this.body) {
      const p = this.body.move({ x: this.vel.x * dt, y: 0, z: this.vel.z * dt }, dt)
      this.pos.set(p.x, p.y - BODY_H * 0.5, p.z)
      this.grounded = this.body.grounded
      this.vy = this.body.vy
      this.floorHit = this._ground()
      return
    }

    this.vy -= GRAVITY * dt
    this._slide(this.vel.x * dt, this.vel.z * dt)
    this.pos.y += this.vy * dt
    const g = this._ground()
    if (g) {
      const gy = g.point.y
      if (this.pos.y <= gy + STEP_UP) { this.pos.y = gy; this.vy = 0; this.grounded = true }
      else this.grounded = false
      this.floorHit = g
    } else if (this.pos.y < this.floorY) { this.pos.y = this.floorY; this.vy = 0; this.grounded = true }
  },

  _footstep (speed) {
    const n = Math.floor(this.dist / STRIDE)
    if (n === this.stepCount) return
    this.stepCount = n
    const mat = this.floorHit ? floorKind(this.floorHit) : 'concrete'
    this.engine.bus.emit('player:footstep', { material: mat, speed })
  },

  _look () {
    const cam = this.engine.camera
    if (!this.hot.length) { this._setFocus(null, 0); return }
    cam.getWorldPosition(this._o)
    cam.getWorldDirection(this._d)
    this.ray.set(this._o, this._d)
    this.ray.far = REACH
    const hits = this.ray.intersectObjects(this.hot, true)
    for (const h of hits) {
      const it = interactOf(h.object)
      if (it) { this._setFocus(it, h.distance); return }
    }
    this._setFocus(null, 0)
  },

  _setFocus (it, dist) {
    const ev = this.engine.get('evidence')
    const changed = (it?.id ?? null) !== (this.focus?.id ?? null)
    this.focus = it
    this.focusDist = dist
    ev?.onFocus?.(it ? it.host : null, dist)
    if (!changed) return
    const ui = this.engine.get('ui') ?? this.engine.get('hud')
    if (!ui?.setPrompt) return
    if (!it) { ui.setPrompt(null); return }
    const text = ev?.promptFor?.(it.host) ?? it.data?.prompt ?? null
    if (text) ui.setPrompt(text, it.data?.key ?? 'E')
    else ui.setPrompt(null)
  },

  _interact () {
    if (!this.focus) return
    if (this.engine.get('evidence')?.isModal?.() || this.engine.get('interrogation')?.isModal?.()) return
    this.engine.bus.emit('player:interact', { targetId: this.focus.id })
  },

  update (dt, elapsed) {
    const e = this.engine
    if (!e || e.qa) return

    if (elapsed >= this.nextScan) { this._scan(); this.nextScan = elapsed + 1.0 }

    const modal = !!(e.get('evidence')?.isModal?.() || e.get('interrogation')?.isModal?.())
    const k = (c) => (this.keys.has(c) ? 1 : 0)
    let fwd = 0, side = 0
    if (!modal) {
      fwd = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown')
      side = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft')
      const m = Math.hypot(fwd, side)
      if (m > 1) { fwd /= m; side /= m }
    }

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw)
    const wishX = -sy * fwd + cy * side
    const wishZ = -cy * fwd - sy * side
    this._move(dt, wishX, wishZ)

    const hspeed = Math.hypot(this.vel.x, this.vel.z)
    this.dist += hspeed * dt
    this._footstep(hspeed)
    if (modal) this._setFocus(null, 0)
    else this._look()

    const sp = clamp(hspeed / WALK, 0, 1)
    const ph = (this.dist / STRIDE) * Math.PI
    const bobY = Math.sin(ph * 2) * BOB_Y * sp
    const bobX = Math.sin(ph) * BOB_X * sp
    const roll = Math.sin(ph) * BOB_ROLL * sp

    // 멈춰 있어도 화면은 죽지 않는다 — 호흡 0.4Hz, 3mm 부유 + 미세 드리프트
    const idle = 1 - sp
    const br = Math.sin(elapsed * Math.PI * 2 * BREATH_HZ)
    const breathY = br * BREATH_Y * idle
    const driftP = Math.sin(elapsed * 1.7 + 0.6) * 0.0016 * idle
    const driftR = Math.sin(elapsed * 1.13 + 2.1) * 0.0022 * idle

    if (!modal) {
      this.yaw = damp(this.yaw, this.yawT, LOOK_LAMBDA, dt)
      this.pitch = damp(this.pitch, this.pitchT, LOOK_LAMBDA, dt)
    }

    const cam = e.camera
    cam.rotation.set(this.pitch + driftP, this.yaw, roll + driftR, 'YXZ')
    cam.position.set(
      this.pos.x + Math.cos(this.yaw) * bobX,
      this.pos.y + EYE + bobY + breathY,
      this.pos.z - Math.sin(this.yaw) * bobX
    )
  },

  // 레벨/시네마틱이 플레이어를 옮길 때 쓴다. 카메라를 직접 옮기면 다음 프레임에 덮어써진다.
  teleport (pos, yaw = this.yaw) {
    this.pos.set(pos[0], pos[1], pos[2])
    this.vel.set(0, 0, 0)
    this.vy = 0
    this.yaw = this.yawT = yaw
    this.nextScan = 0
  },

  dispose () { this.bound?.() }
}

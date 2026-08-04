// [PHYSICS] rapier3d 통합 — 정적 콜라이더·연출용 강체·문 경첩·캐릭터 컨트롤러·상호작용 레이캐스트.
// 초기화가 실패해도 앱은 죽지 않는다. enabled=false로 살아남고 GAMEPLAY가 자체 충돌로 폴백한다.
// 콘솔 출력 금지(QA가 경고 1건도 실격 처리한다). 실패 사유는 physics.error에 담는다.
import * as THREE from 'three'
import { v3, unit, matOf, boxiness, bakeTrimesh, localPoints, initRapier } from './shapes.js'

const STEP = 1 / 60
const MAX_SUBSTEPS = 4
const SLEEP_LIN = 0.035      // m/s. 이하로 SLEEP_HOLD 지속되면 재운다 — 접지한 소품이 떠는 것을 막는다(D5)
const SLEEP_ANG = 0.12       // rad/s
const SLEEP_HOLD = 0.35      // s
const CULL_DIST = 26         // m. 카메라에서 이 거리 밖의 강체는 잠재운다
const GRAVITY = { x: 0, y: -9.81, z: 0 }

const _pos = new THREE.Vector3()
const _rot = new THREE.Quaternion()
const _scl = new THREE.Vector3()
const _cen = new THREE.Vector3()
const _siz = new THREE.Vector3()
const _tmp = new THREE.Vector3()
const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _ta = new THREE.Vector3()
const _box = new THREE.Box3()
const _one = new THREE.Vector3(1, 1, 1)

// _box를 강체 로컬 프레임 기준으로 채우고, 그 박스에 곱해야 할 스케일을 돌려준다.
// 지오메트리가 없는 그룹은 setFromObject가 이미 월드 스케일을 반영하므로 1을 쓴다.
function fillBox (obj, pos, scl) {
  const g = obj.geometry
  if (g) {
    if (!g.boundingBox) g.computeBoundingBox()
    _box.copy(g.boundingBox)
    return scl
  }
  _box.setFromObject(obj).translate(_tmp.copy(pos).negate())
  return _one
}

const physics = {
  name: 'physics',
  order: 10,
  enabled: false,
  error: null,
  RAPIER: null,
  world: null,

  async init (engine) {
    this.engine = engine
    this.accum = 0
    this.steps = 0
    this.bodies = []         // {body, obj, quiet, dist, synced}
    this.characters = []
    this.meta = new Map()    // collider.handle -> {obj, material}
    this.maxActive = engine?.quality?.name === 'medium' ? 30 : 60
    this._awake = []
    this._dirty = false   // 새 콜라이더는 step 전까지 질의 구조에 안 들어간다. raycast가 이 플래그를 보고 비운다
    try {
      const R = await import('@dimforge/rapier3d-compat')
      await initRapier(R)
      this.RAPIER = R
      this.world = new R.World(GRAVITY)
      this.world.timestep = STEP
      this.world.numSolverIterations = 4
      this._ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })
      this.enabled = true
    } catch (e) {
      this.error = e?.message ?? String(e)
      this.enabled = false
    }
  },

  // 가변 dt를 고정 스텝으로 변환한다. QA가 1/60로 몰면 정확히 1스텝/프레임이 되어 결정론이 유지된다.
  update (dt) {
    if (!this.enabled) return
    this.accum += Math.min(dt, 0.1)
    let n = 0
    while (this.accum >= STEP && n < MAX_SUBSTEPS) {
      this.world.step()
      this.accum -= STEP
      this.steps++
      n++
    }
    if (this.accum > STEP) this.accum = 0   // 프레임 폭주 후 잔여 누적은 버린다(스파이럴 방지)
    if (n === 0) return
    this._dirty = false
    this._sync()
    this._manageSleep(n * STEP)
  },

  // ── 정적 지오메트리 ────────────────────────────────────────────────
  // shape: 'auto' | 'trimesh' | 'cuboid'. auto는 박스성 판정으로 고른다.
  addStatic (object3D, shape = 'auto') {
    if (!this.enabled || !object3D) return null
    object3D.updateWorldMatrix(true, true)
    const made = []
    object3D.traverse(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return
      const c = this._staticCollider(o, shape)
      if (c) made.push(c)
    })
    if (!made.length) return null
    return { colliders: made, remove: () => this._drop(made) }
  },

  _staticCollider (mesh, shape) {
    const R = this.RAPIER
    const g = mesh.geometry
    if (!g.boundingBox) g.computeBoundingBox()
    _box.copy(g.boundingBox)
    const size = _box.getSize(_siz)
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3
    let mode = shape
    if (mode === 'auto') {
      if (Math.min(size.x, size.y, size.z) < 0.02) mode = 'cuboid'   // 벽·바닥 같은 얇은 판은 삼각메시보다 얇은 박스가 안정적
      else if (tris > 4000) mode = 'trimesh'
      else { const r = boxiness(g, _box); mode = (r > 0.85 && r < 1.3) ? 'cuboid' : 'trimesh' }
    }
    let desc
    if (mode === 'cuboid') {
      mesh.matrixWorld.decompose(_pos, _rot, _scl)
      const hx = Math.max(Math.abs(size.x * _scl.x) * 0.5, 0.005)
      const hy = Math.max(Math.abs(size.y * _scl.y) * 0.5, 0.005)
      const hz = Math.max(Math.abs(size.z * _scl.z) * 0.5, 0.005)
      _box.getCenter(_cen).multiply(_scl).applyQuaternion(_rot).add(_pos)
      desc = R.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(_cen.x, _cen.y, _cen.z)
        .setRotation({ x: _rot.x, y: _rot.y, z: _rot.z, w: _rot.w })
    } else {
      const { verts, idx } = bakeTrimesh(mesh)
      // FIX_INTERNAL_EDGES: 삼각형 경계에서 캐릭터가 걸리는 가짜 범프를 없앤다
      desc = R.ColliderDesc.trimesh(verts, idx, R.TriMeshFlags.FIX_INTERNAL_EDGES)
    }
    if (!desc) return null
    desc.setFriction(0.9).setRestitution(0.02)
    const col = this.world.createCollider(desc)
    this.meta.set(col.handle, { obj: mesh, material: matOf(mesh) })
    this._dirty = true
    return col
  },

  // ── 동적 강체(연출용) ──────────────────────────────────────────────
  addBody (object3D, opts = {}) {
    if (!this.enabled || !object3D) return null
    const R = this.RAPIER
    const { mass = 1, shape = 'auto', restitution = 0.15, friction = 0.75 } = opts
    object3D.updateWorldMatrix(true, true)
    object3D.matrixWorld.decompose(_pos, _rot, _scl)

    const g = object3D.geometry
    const s = fillBox(object3D, _pos, _scl)
    const size = _box.getSize(_siz)
    const hx = Math.max(Math.abs(size.x * s.x) * 0.5, 0.004)
    const hy = Math.max(Math.abs(size.y * s.y) * 0.5, 0.004)
    const hz = Math.max(Math.abs(size.z * s.z) * 0.5, 0.004)
    const minH = Math.min(hx, hy, hz)

    let mode = shape
    if (mode === 'auto') {
      const r = g ? boxiness(g, _box) : 1
      mode = (r > 0.85 && r < 1.3) ? 'cuboid' : 'convex'
    }
    let desc = null
    if (mode === 'ball') desc = R.ColliderDesc.ball(Math.max(hx, hy, hz))
    else if (mode === 'capsule') desc = R.ColliderDesc.capsule(Math.max(hy - Math.max(hx, hz), 0.01), Math.max(hx, hz))
    else if (mode === 'convex' && g) desc = R.ColliderDesc.convexHull(localPoints(g))
    if (!desc) desc = R.ColliderDesc.cuboid(hx, hy, hz)

    const body = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(_pos.x, _pos.y, _pos.z)
        .setRotation({ x: _rot.x, y: _rot.y, z: _rot.z, w: _rot.w })
        .setLinearDamping(0.08)
        .setAngularDamping(0.3)
        .setCanSleep(true)
        .setCcdEnabled(minH < 0.05)   // 열쇠처럼 작고 빠른 물건은 터널링한다
    )
    _box.getCenter(_cen).multiply(s)
    const col = this.world.createCollider(
      desc.setMass(Math.max(mass, 0.01))
        .setRestitution(restitution)
        .setFriction(friction)
        .setTranslation(_cen.x, _cen.y, _cen.z),
      body
    )
    this.meta.set(col.handle, { obj: object3D, material: matOf(object3D) })
    this._dirty = true
    const rec = { body, obj: object3D, quiet: 0, dist: 0, synced: false }
    this.bodies.push(rec)
    return {
      body,
      collider: col,
      wake: () => { body.wakeUp(); rec.quiet = 0; rec.synced = false },
      push: (imp, point) => {
        body.wakeUp(); rec.quiet = 0; rec.synced = false
        if (point) body.applyImpulseAtPoint(v3(imp), v3(point), true)
        else body.applyImpulse(v3(imp), true)
      },
      remove: () => this._removeBody(rec, col)
    }
  },

  // ── 캐릭터 컨트롤러 ────────────────────────────────────────────────
  // position()은 캡슐 중심을 돌려준다. 발바닥은 중심 - height/2.
  character (radius = 0.3, height = 1.75) {
    if (!this.enabled) return null
    const R = this.RAPIER
    const world = this.world
    const half = Math.max(height * 0.5 - radius, 0.05)
    const body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, height * 0.5, 0)
    )
    const col = world.createCollider(R.ColliderDesc.capsule(half, radius).setFriction(0.1), body)
    this._dirty = true
    const ctrl = world.createCharacterController(0.02)
    ctrl.setUp({ x: 0, y: 1, z: 0 })
    ctrl.enableAutostep(0.3, 0.12, true)     // 계단 0.3m
    ctrl.enableSnapToGround(0.35)
    ctrl.setMaxSlopeClimbAngle(52 * Math.PI / 180)
    ctrl.setMinSlopeSlideAngle(38 * Math.PI / 180)
    ctrl.setSlideEnabled(true)
    ctrl.setApplyImpulsesToDynamicBodies(true)
    ctrl.setCharacterMass(78)

    const wrap = {
      body,
      collider: col,
      controller: ctrl,
      grounded: false,
      vy: 0,
      radius,
      height,
      pos: new THREE.Vector3(0, height * 0.5, 0),

      // delta: 이번 프레임 이동량(m). dt를 주면 중력·접지 처리를 래퍼가 맡는다.
      move (delta, dt = 0) {
        const d = { x: delta.x || 0, y: delta.y || 0, z: delta.z || 0 }
        if (dt > 0) {
          // 접지 중에는 아주 약한 하향 바이어스만 준다. 큰 하강 성분은 rapier가 "내려가는 중"으로 보고
          // 오토스텝을 건너뛰어 계단·경사 턱에 걸린다. 접지 유지는 snapToGround가 맡는다.
          this.vy = this.grounded && this.vy <= 0 ? -0.05 : this.vy - 9.81 * dt
          d.y += this.vy * dt
        }
        // 프레임이 스텝보다 잦으면 콜라이더 위치가 뒤처진다. 래퍼가 권위를 갖도록 강제 동기화한다.
        body.setTranslation(this.pos, false)
        world.propagateModifiedBodyPositionsToColliders()
        ctrl.computeColliderMovement(col, d)
        const mv = ctrl.computedMovement()
        this.grounded = ctrl.computedGrounded()
        if (this.grounded && this.vy < 0) this.vy = 0
        this.pos.set(this.pos.x + mv.x, this.pos.y + mv.y, this.pos.z + mv.z)
        body.setNextKinematicTranslation(this.pos)
        return this.pos
      },

      position (target) { return target ? target.copy(this.pos) : this.pos },

      setPosition (x, y, z) {
        this.pos.set(x?.x ?? x, x?.y ?? y, x?.z ?? z)
        this.vy = 0
        body.setTranslation(this.pos, false)
        world.propagateModifiedBodyPositionsToColliders()
        return this.pos
      },

      // 마지막 move에서 부딪힌 면. 미끄러짐·발소리 판정에 쓴다.
      contacts () {
        const n = ctrl.numComputedCollisions()
        const out = []
        for (let i = 0; i < n; i++) {
          const c = ctrl.computedCollision(i)
          if (c) out.push({ normal: c.normal1, collider: c.collider })
        }
        return out
      },

      dispose: () => {
        world.removeCharacterController(ctrl)
        world.removeRigidBody(body)
        const i = this.characters.indexOf(wrap)
        if (i >= 0) this.characters.splice(i, 1)
      }
    }
    this.characters.push(wrap)
    return wrap
  },

  // ── 레이캐스트 ────────────────────────────────────────────────────
  // opts.exclude: 자기 자신 제외용 collider 또는 character 래퍼
  raycast (origin, dir, maxDist = 20, opts) {
    if (!this.enabled) return null
    if (this._dirty) this._flush()
    const o = v3(origin)
    const d = unit(v3(dir, 0, -1, 0))
    this._ray.origin = o
    this._ray.dir = d
    const ex = opts?.exclude?.collider ?? opts?.exclude
    const hit = this.world.castRayAndGetNormal(this._ray, maxDist, true, undefined, undefined, ex || undefined)
    if (!hit) return null
    const m = this.meta.get(hit.collider.handle)
    const t = hit.timeOfImpact
    return {
      distance: t,
      point: new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      material: m?.material ?? null,
      object: m?.obj ?? null,
      collider: hit.collider
    }
  },

  // ── 문 경첩 ───────────────────────────────────────────────────────
  // hinge: {pos:[x,y,z] 월드, axis:[0,1,0] 월드}, limits: [min, max] 라디안
  addDoor (object3D, hinge = {}, limits = [-1.62, 0]) {
    if (!this.enabled || !object3D) return null
    const R = this.RAPIER
    object3D.updateWorldMatrix(true, true)
    object3D.matrixWorld.decompose(_pos, _rot, _scl)

    const s = fillBox(object3D, _pos, _scl)
    const size = _box.getSize(_siz)

    const hingeW = v3(hinge.pos, _pos.x, _pos.y, _pos.z)
    const axisW = unit(v3(hinge.axis, 0, 1, 0))
    const restInv = _rot.clone().invert()   // 초기 자세. angle()의 기준이자 조인트 프레임 변환

    // 앵커 바디를 문과 같은 자세로 두면 두 조인트 프레임이 일치해 축 하나로 표현된다.
    const anchor = this.world.createRigidBody(
      R.RigidBodyDesc.fixed()
        .setTranslation(hingeW.x, hingeW.y, hingeW.z)
        .setRotation({ x: _rot.x, y: _rot.y, z: _rot.z, w: _rot.w })
    )
    const leaf = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(_pos.x, _pos.y, _pos.z)
        .setRotation({ x: _rot.x, y: _rot.y, z: _rot.z, w: _rot.w })
        .setLinearDamping(0.4)
        .setAngularDamping(0.9)   // 밀면 관성으로 흔들리다 조용히 선다
        .setCanSleep(true)
    )
    _box.getCenter(_cen).multiply(s)
    const col = this.world.createCollider(
      R.ColliderDesc.cuboid(
        Math.max(Math.abs(size.x * s.x) * 0.5, 0.01),
        Math.max(Math.abs(size.y * s.y) * 0.5, 0.01),
        Math.max(Math.abs(size.z * s.z) * 0.5, 0.01)
      ).setMass(32).setFriction(0.6).setRestitution(0.02)
        .setTranslation(_cen.x, _cen.y, _cen.z),
      leaf
    )
    this.meta.set(col.handle, { obj: object3D, material: matOf(object3D) })
    this._dirty = true

    const a2 = _tmp.set(hingeW.x - _pos.x, hingeW.y - _pos.y, hingeW.z - _pos.z).applyQuaternion(restInv)
    const axisL = _ta.set(axisW.x, axisW.y, axisW.z).applyQuaternion(restInv)
    const jd = R.JointData.revolute(
      { x: 0, y: 0, z: 0 },
      { x: a2.x, y: a2.y, z: a2.z },
      { x: axisL.x, y: axisL.y, z: axisL.z }
    )
    const joint = this.world.createImpulseJoint(jd, anchor, leaf, true)
    if (limits && joint.setLimits) joint.setLimits(limits[0], limits[1])

    const rec = { body: leaf, obj: object3D, quiet: 0, dist: 0, synced: false }
    this.bodies.push(rec)
    return {
      body: leaf,
      joint,
      collider: col,
      // 초기 자세 대비 힌지축 둘레 비틀림각(rad). 열림 판정·삐걱임 사운드가 이 값을 읽는다.
      angle () {
        const q = leaf.rotation()
        _qb.set(q.x, q.y, q.z, q.w).multiply(restInv)
        const tw = _qb.x * axisW.x + _qb.y * axisW.y + _qb.z * axisW.z
        return 2 * Math.atan2(tw, _qb.w)
      },
      push: (imp, point) => {
        leaf.wakeUp(); rec.quiet = 0; rec.synced = false
        if (point) leaf.applyImpulseAtPoint(v3(imp), v3(point), true)
        else leaf.applyImpulse(v3(imp), true)
      },
      remove: () => {
        this.world.removeImpulseJoint(joint, false)
        this.world.removeRigidBody(anchor)
        this._removeBody(rec, col)
      }
    }
  },

  // ── 내부 ──────────────────────────────────────────────────────────
  _sync () {
    for (const r of this.bodies) {
      const asleep = r.body.isSleeping()
      if (asleep && r.synced) continue
      r.synced = asleep
      const o = r.obj
      if (!o) continue
      const t = r.body.translation()
      const q = r.body.rotation()
      _qb.set(q.x, q.y, q.z, q.w)
      if (o.parent) {
        o.position.copy(o.parent.worldToLocal(_tmp.set(t.x, t.y, t.z)))
        o.quaternion.copy(o.parent.getWorldQuaternion(_qa).invert().multiply(_qb))
      } else {
        o.position.set(t.x, t.y, t.z)
        o.quaternion.copy(_qb)
      }
    }
  },

  // 정지한 물체를 명시적으로 재운다. 솔버 잔떨림이 접지 신뢰성을 깨는 것을 막는다.
  _manageSleep (dt) {
    const cam = this.engine?.camera
    const awake = this._awake
    awake.length = 0
    for (const r of this.bodies) {
      const b = r.body
      if (b.isSleeping()) continue
      const lv = b.linvel()
      const av = b.angvel()
      if (Math.hypot(lv.x, lv.y, lv.z) < SLEEP_LIN && Math.hypot(av.x, av.y, av.z) < SLEEP_ANG) {
        r.quiet += dt
        if (r.quiet > SLEEP_HOLD) { b.sleep(); continue }
      } else r.quiet = 0
      if (cam) {
        const t = b.translation()
        r.dist = Math.hypot(t.x - cam.position.x, t.y - cam.position.y, t.z - cam.position.z)
        if (r.dist > CULL_DIST) { b.sleep(); continue }
      }
      awake.push(r)
    }
    if (awake.length > this.maxActive) {
      awake.sort((a, b) => b.dist - a.dist)
      for (let i = 0; i < awake.length - this.maxActive; i++) awake[i].body.sleep()
    }
  },

  // dt=0 스텝. 시뮬레이션은 전진시키지 않고 브로드페이즈만 갱신해 새 콜라이더를 질의 가능하게 만든다.
  _flush () {
    const dt = this.world.timestep
    this.world.timestep = 0
    this.world.step()
    this.world.timestep = dt
    this._dirty = false
  },

  _drop (colliders) {
    for (const c of colliders) {
      this.meta.delete(c.handle)
      this.world.removeCollider(c, false)
    }
  },

  _removeBody (rec, col) {
    if (col) this.meta.delete(col.handle)
    const i = this.bodies.indexOf(rec)
    if (i >= 0) this.bodies.splice(i, 1)
    this.world.removeRigidBody(rec.body)
  },

  stats () {
    if (!this.enabled) return { enabled: false, error: this.error }
    let awake = 0
    for (const r of this.bodies) if (!r.body.isSleeping()) awake++
    return {
      enabled: true,
      steps: this.steps,
      bodies: this.bodies.length,
      awake,
      colliders: this.meta.size,
      characters: this.characters.length
    }
  },

  dispose () {
    if (this.world) this.world.free()
    this.world = null
    this.enabled = false
    this.bodies.length = 0
    this.characters.length = 0
    this.meta.clear()
  }
}

export default physics

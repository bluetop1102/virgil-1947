// PHYSICS 수치 검증. 실제 모듈(src/physics/world.js)을 가짜 엔진에 물려 돌린다.
//   node tools/test-physics.mjs
// 낙하·마찰·경사·계단·수면·경첩을 스텝 시뮬레이션해 값이 물리적으로 합리적인지 본다.
import * as THREE from 'three'
import physics from '../src/physics/world.js'

const STEP = 1 / 60
let fails = 0

function check (label, ok, detail) {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`)
}

function near (label, got, want, tol) {
  check(label, Math.abs(got - want) <= tol, `got ${got.toFixed(4)}, want ${want.toFixed(4)} ±${tol}`)
}

function mesh (w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d))
  m.position.set(x, y, z)
  m.updateMatrixWorld(true)
  return m
}

function run (seconds) {
  const n = Math.round(seconds / STEP)
  for (let i = 0; i < n; i++) physics.update(STEP)
}

// 캐릭터는 move()가 호출돼야 중력·접지가 갱신된다. stop()이 참이면 그 자리에서 멈춘다.
function walk (ch, vx, vz, frames, stop) {
  for (let i = 0; i < frames; i++) {
    const go = !(stop && stop(ch))
    ch.move({ x: go ? vx * STEP : 0, y: 0, z: go ? vz * STEP : 0 }, STEP)
    physics.update(STEP)
  }
}

const engine = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(38, 1.77, 0.05, 400),
  quality: { name: 'cinematic' },
  bus: { on () {}, emit () {} },
  time: 0
}
engine.camera.position.set(0, 1.6, 0)

await physics.init(engine)
check('RAPIER 초기화', physics.enabled, physics.error ?? `rapier ${physics.RAPIER.version()}`)
if (!physics.enabled) process.exit(1)

// ── 1. 바닥·벽 정적 콜라이더 ───────────────────────────────────────
const floor = mesh(60, 0.4, 60, 0, -0.2, 0)
floor.userData.physMaterial = 'marble.lobby.floor'
const floorRef = physics.addStatic(floor)
check('addStatic 바닥 콜라이더 생성', !!floorRef && floorRef.colliders.length === 1)

// 계단 3단(0.3m씩). auto 판정이 trimesh로 가는지도 함께 본다.
const stairs = new THREE.Group()
for (let i = 0; i < 3; i++) stairs.add(mesh(3, 0.3, 0.6, 0, 0.15 + i * 0.3, -4 - i * 0.6))
stairs.updateMatrixWorld(true)
physics.addStatic(stairs)

// 30° 경사로. -z쪽(z≈-2.6)이 바닥과 맞물리고 +z쪽(z≈2.6)이 높다.
const ramp = mesh(3, 0.2, 6, 8, 0, 0)
ramp.rotation.x = -30 * Math.PI / 180
ramp.position.set(8, 1.5, 0)
ramp.updateMatrixWorld(true)
physics.addStatic(ramp, 'cuboid')

// ── 2. 자유 낙하 ──────────────────────────────────────────────────
const ball = mesh(0.2, 0.2, 0.2, -6, 5, 12)
const ballRef = physics.addBody(ball, { mass: 0.4, shape: 'ball', restitution: 0.0, friction: 0.8 })
run(0.5)
// 감쇠(0.08)가 있으므로 해석해보다 살짝 덜 떨어진다. 5% 오차 허용.
const drop = 5 - ball.position.y
near('자유낙하 0.5s 낙하거리', drop, 0.5 * 9.81 * 0.25, 0.08)
run(3)
near('낙하 후 접지 높이(반지름 0.1)', ball.position.y, 0.1, 0.02)
check('낙하체 정지 후 수면', ballRef.body.isSleeping(), `y=${ball.position.y.toFixed(4)}`)

const restY = ball.position.y
run(2)
check('수면 중 위치 드리프트 없음', Math.abs(ball.position.y - restY) < 1e-6,
  `Δy=${Math.abs(ball.position.y - restY).toExponential(2)}`)

// ── 3. 마찰 감속 ──────────────────────────────────────────────────
// μ=0.5(콜라이더 0.5 × 바닥 0.9의 기본 average rule ≈ 0.7), v0=3 → 정지거리 v²/(2μg)
const slider = mesh(0.4, 0.4, 0.4, -12, 0.201, 0)
const sliderRef = physics.addBody(slider, { mass: 2, shape: 'cuboid', restitution: 0, friction: 0.5 })
sliderRef.body.setLinvel({ x: 0, y: 0, z: 3 }, true)
const z0 = slider.position.z
run(4)
const dist = slider.position.z - z0
const mu = (0.5 + 0.9) / 2
const analytic = 9 / (2 * mu * 9.81)
check('마찰 정지거리 합리성', dist > analytic * 0.6 && dist < analytic * 1.6,
  `slid ${dist.toFixed(3)}m, 해석해 ${analytic.toFixed(3)}m`)
check('마찰 후 정지', Math.abs(sliderRef.body.linvel().z) < 0.05 || sliderRef.body.isSleeping())

// ── 4. 캐릭터: 계단 오르기 ─────────────────────────────────────────
const ch = physics.character(0.3, 1.75)
check('character() 생성', !!ch)
ch.setPosition(0, 1.2, -2.0)
walk(ch, 0, 0, 30)
const groundY = ch.pos.y
check('캐릭터 접지', ch.grounded, `y=${groundY.toFixed(3)}`)
near('접지 시 캡슐 중심 = height/2', groundY, 0.875, 0.05)

walk(ch, 0, -1.4, 180, c => c.pos.z <= -5.0)   // 3단(0.9m) 오른 뒤 꼭대기에서 정지
const climbed = ch.pos.y - groundY
check('계단 3단(0.9m) 오르기', climbed > 0.8 && climbed < 1.1, `Δy=${climbed.toFixed(3)}, z=${ch.pos.z.toFixed(2)}`)
check('계단 오른 뒤 접지 유지', ch.grounded)

// ── 5. 캐릭터: 30° 경사 오르기 / 벽 미끄러짐 ───────────────────────
ch.setPosition(8, 1.2, -3.6)
walk(ch, 0, 0, 30)
const rampY0 = ch.pos.y
walk(ch, 0, 1.2, 240, c => c.pos.z >= 2.2)
const rampGain = ch.pos.y - rampY0
// 경사면 윗면은 (z=-2.648, y=0.0866)에서 tan30 기울기로 올라간다. 캡슐 중심은 그 위 height/2.
const surfaceY = 0.0866 + (ch.pos.z + 2.648) * Math.tan(30 * Math.PI / 180) + 0.875
check('30° 경사 등반', rampGain > 1.2, `Δy=${rampGain.toFixed(3)}, z=${ch.pos.z.toFixed(2)}`)
near('경사면 위에 접지', ch.pos.y, surfaceY, 0.12)

// 벽으로 정면 돌진 → 관통하지 않고 미끄러진다
const wall = mesh(6, 3, 0.3, -20, 1.5, -3)
physics.addStatic(wall)
ch.setPosition(-20, 1.2, 0)
walk(ch, 0, 0, 30)
walk(ch, 0.6, -2.0, 180)
check('벽 관통 없음', ch.pos.z > -2.9, `z=${ch.pos.z.toFixed(3)} (벽면 -2.85)`)
check('벽면 따라 미끄러짐', ch.pos.x > -20 + 0.4, `x=${ch.pos.x.toFixed(3)}`)

// ── 6. 레이캐스트 ─────────────────────────────────────────────────
const hit = physics.raycast([-2, 3, 14], [0, -1, 0], 10, { exclude: ch })
check('레이캐스트 적중', !!hit, hit ? `d=${hit.distance.toFixed(3)} mat=${hit.material}` : 'null')
if (hit) {
  near('레이 거리(바닥 상단 y=0)', hit.distance, 3, 0.25)
  check('레이 법선 상방', hit.normal.y > 0.9, `n=(${hit.normal.x.toFixed(2)},${hit.normal.y.toFixed(2)},${hit.normal.z.toFixed(2)})`)
  check('발소리 재질 판정', hit.material === 'marble.lobby.floor', String(hit.material))
}
check('빈 방향 레이캐스트 null', physics.raycast([0, 40, 0], [0, 1, 0], 5) === null)

// ── 7. 문 경첩 ────────────────────────────────────────────────────
const door = mesh(0.9, 2.05, 0.05, 20.45, 1.03, 0)
const doorRef = physics.addDoor(door, { pos: [20, 1.03, 0], axis: [0, 1, 0] }, [-1.6, 0])
check('addDoor 생성', !!doorRef)
near('문 초기 각도', doorRef.angle(), 0, 0.02)
// 힌지(x=20)에서 0.4m 떨어진 손잡이를 +z로 민다 → 토크 -y → 한계 [-1.6, 0] 안쪽으로 열린다
doorRef.push([0, 0, 14], [20.85, 1.03, 0])
run(0.6)
const openA = doorRef.angle()
check('밀면 열린다', openA < -0.25, `angle=${openA.toFixed(3)}rad`)
run(6)
const finalA = doorRef.angle()
check('경첩 한계 내 유지', finalA >= -1.65 && finalA <= 0.05, `angle=${finalA.toFixed(3)}rad`)
check('문 흔들림 감쇠 후 정지', Math.abs(doorRef.body.angvel().y) < 0.05 || doorRef.body.isSleeping(),
  `angvel.y=${doorRef.body.angvel().y.toFixed(4)}`)
check('문 오브젝트에 변환 반영', Math.abs(door.rotation.y - finalA) < 0.1,
  `obj.rotY=${door.rotation.y.toFixed(3)}`)

// ── 8. 거리 컬링 · 활성 예산 ───────────────────────────────────────
const far = mesh(0.3, 0.3, 0.3, 0, 6, 40)
const farRef = physics.addBody(far, { mass: 1 })
run(0.5)
check('원거리 강체 수면(컬링)', farRef.body.isSleeping(), 'camera (0,1.6,0), dist 40m')

const many = []
for (let i = 0; i < 80; i++) {
  const m = mesh(0.12, 0.12, 0.12, (i % 10) * 0.3 - 1.5, 3 + Math.floor(i / 10) * 0.4, 2 + (i % 7) * 0.1)
  many.push(physics.addBody(m, { mass: 0.2 }))
}
run(0.2)
const st = physics.stats()
check('활성 강체 예산 60 이하', st.awake <= 60, `awake=${st.awake} / bodies=${st.bodies}`)
run(6)
const st2 = physics.stats()
check('더미 더미 안정화 후 대부분 수면', st2.awake <= 8, `awake=${st2.awake}`)

// ── 9. 셰이프 자동 선택 · 제거 ─────────────────────────────────────
const stairRef = physics.addStatic(stairs)   // 그룹 자식 수만큼 콜라이더가 나와야 한다
check('그룹 traverse 콜라이더 수', stairRef.colliders.length === 3, `${stairRef.colliders.length}개`)
check('박스 지오메트리 → cuboid 선택', stairRef.colliders[0].shape.type === physics.RAPIER.ShapeType.Cuboid,
  `type=${stairRef.colliders[0].shape.type}`)

const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 64, 12))
knot.position.set(-30, 2, 0)
knot.updateMatrixWorld(true)
const knotRef = physics.addStatic(knot)
check('비박스 지오메트리 → trimesh 선택', knotRef.colliders[0].shape.type === physics.RAPIER.ShapeType.TriMesh,
  `type=${knotRef.colliders[0].shape.type}`)
// 첫 삼각형의 무게중심을 겨냥한다. 정점을 직접 겨누면 모서리 스침으로 빗나갈 수 있다.
const kp = knot.geometry.attributes.position
const ki = knot.geometry.index
const tri = new THREE.Vector3()
for (let i = 0; i < 3; i++) tri.add(new THREE.Vector3().fromBufferAttribute(kp, ki.getX(i)))
tri.multiplyScalar(1 / 3).add(knot.position)
const dir = tri.clone().sub(knot.position).normalize()
const knotHit = physics.raycast(knot.position, dir, 6)
check('trimesh 레이 적중', !!knotHit && knotHit.object === knot,
  knotHit ? `d=${knotHit.distance.toFixed(3)} obj=${knotHit.object === knot ? 'knot' : 'other'}` : 'null')

const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 2))
sphere.position.set(-30, 6, 6)
sphere.updateMatrixWorld(true)
const sphereRef = physics.addBody(sphere, { mass: 0.8 })
check('구형 지오메트리 → convexHull 선택', sphereRef.collider.shape.type === physics.RAPIER.ShapeType.ConvexPolyhedron,
  `type=${sphereRef.collider.shape.type}`)

const before = physics.stats().bodies
sphereRef.remove()
knotRef.remove()
check('remove()로 강체 해제', physics.stats().bodies === before - 1)
run(0.2)
check('해제 후에도 스텝 정상', physics.stats().steps > 0)

// ── 10. 결정론 ────────────────────────────────────────────────────
const p1 = { x: ball.position.x, y: ball.position.y, z: ball.position.z }
physics.update(1 / 240)   // 스텝 미만 dt는 시뮬레이션을 전진시키지 않아야 한다
const p2 = { x: ball.position.x, y: ball.position.y, z: ball.position.z }
check('스텝 미만 dt는 무진행', p1.x === p2.x && p1.y === p2.y && p1.z === p2.z)

// 새 콜라이더 직후 레이캐스트: 질의 구조 갱신(dt=0 스텝)이 시뮬레이션을 흔들면 안 된다
const probe = mesh(1, 1, 1, 0, 20, 0)
physics.addStatic(probe)
const faller = mesh(0.2, 0.2, 0.2, 0, 12, 0)
const fallerRef = physics.addBody(faller, { mass: 1 })
const fy = fallerRef.body.translation().y
const fresh = physics.raycast([0, 24, 0], [0, -1, 0], 8)
check('추가 직후 레이캐스트 적중', !!fresh && fresh.object === probe, fresh ? `d=${fresh.distance.toFixed(3)}` : 'null')
check('질의 갱신이 낙하체를 전진시키지 않음', fallerRef.body.translation().y === fy,
  `Δ=${(fallerRef.body.translation().y - fy).toExponential(2)}`)

console.log(`\n${fails ? `${fails} FAILED` : 'ALL PASS'}  (steps=${physics.stats().steps})`)
physics.dispose()
process.exit(fails ? 1 : 0)

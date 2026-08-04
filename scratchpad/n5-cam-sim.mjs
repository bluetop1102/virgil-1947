// N5 검증: player.js(order 20)가 매 프레임 camera.position을 쓰는 조건에서
// interrogation._camera(order 40)의 BEAT_CAM 오프셋이 실제로 화면에 적용되는가.
import { Interrogation } from '../src/narrative/interrogation.js'

const camera = {
  position: {
    x: -1.45, y: 1.68, z: -2.36,
    set (x, y, z) { this.x = x; this.y = y; this.z = z }
  },
  fov: 38,
  matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
  updateMatrixWorld () {},
  updateProjectionMatrix () {}
}
const engine = { camera, qa: false, get: () => null, bus: { on: () => () => {}, emit: () => {} }, state: {} }

const it = new Interrogation()
it.engine = engine
it.phase = 'choice'
it.npc = 'deitch'
it.rig = it._rig()
it.beat = 'shaken'
it.rig.tgt = { x: 0.22, y: 0, z: 0.14, fov: -3 }   // BEAT_CAM.shaken

const BASE = { x: -1.45, y: 1.68, z: -2.36 }
const dt = 1 / 60
let maxOff = 0, applied = 0, resets = 0
const track = []
for (let f = 0; f < 300; f++) {
  const t = f * dt
  // player.js:287-303 — 호흡 3mm, modal 여부와 무관하게 매 프레임 기록
  const breathY = Math.sin(t * Math.PI * 2 * 0.4) * 0.003
  camera.position.set(BASE.x, BASE.y + breathY, BASE.z)
  const before = { ...camera.position }
  it.update(dt, t)
  const off = Math.hypot(camera.position.x - before.x, camera.position.y - before.y, camera.position.z - before.z)
  if (off > 1e-6) applied++; else resets++
  maxOff = Math.max(maxOff, off)
  if (f % 60 === 0) track.push({ f, off: +off.toFixed(5), fov: +camera.fov.toFixed(3) })
}
console.log(JSON.stringify({
  목표오프셋_m: Math.hypot(0.22, 0, 0.14).toFixed(3),
  실제최대오프셋_m: maxOff.toFixed(5),
  적용프레임: applied, 리셋프레임: resets,
  최종fov: camera.fov.toFixed(3),
  샘플: track
}, null, 1))

// [PHYSICS] world.js 보조 — 벡터 변환·지오메트리 판정·트라이메시 굽기. 순수 함수만 둔다.
import * as THREE from 'three'

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()

export function v3 (a, dx = 0, dy = 0, dz = 0) {
  if (!a) return { x: dx, y: dy, z: dz }
  if (Array.isArray(a)) return { x: a[0], y: a[1], z: a[2] }
  return { x: a.x, y: a.y, z: a.z }
}

export function unit (v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}

// 발소리·상호작용 판정용 재질 이름. 이름 없는 재질은 null로 떨어뜨린다(빈 문자열 반환 금지).
export function matOf (mesh) {
  const u = mesh.userData
  return u?.physMaterial || u?.material || mesh.material?.name || null
}

// 표면적 / 바운딩박스 표면적. 베벨 박스는 1 근방, 계단·가구·장식은 1에서 크게 벗어난다.
export function boxiness (geom, box) {
  const pos = geom.attributes.position
  const idx = geom.index
  const n = idx ? idx.count : pos.count
  let area = 0
  for (let i = 0; i + 2 < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i
    const i1 = idx ? idx.getX(i + 1) : i + 1
    const i2 = idx ? idx.getX(i + 2) : i + 2
    _a.fromBufferAttribute(pos, i0)
    _b.fromBufferAttribute(pos, i1).sub(_a)
    _c.fromBufferAttribute(pos, i2).sub(_a)
    area += _b.cross(_c).length() * 0.5
  }
  const s = box.getSize(_s)
  const ba = 2 * (s.x * s.y + s.y * s.z + s.z * s.x)
  return ba > 1e-9 ? area / ba : 0
}

// 월드 좌표로 구운 삼각메시. 정적 콜라이더는 부모 강체 없이 붙으므로 좌표를 미리 월드로 옮긴다.
export function bakeTrimesh (mesh) {
  const g = mesh.geometry
  const pos = g.attributes.position
  const verts = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    verts[i * 3] = _v.x; verts[i * 3 + 1] = _v.y; verts[i * 3 + 2] = _v.z
  }
  let idx
  if (g.index) idx = new Uint32Array(g.index.array)
  else { idx = new Uint32Array(pos.count); for (let i = 0; i < pos.count; i++) idx[i] = i }
  return { verts, idx }
}

export function localPoints (geom) {
  const pos = geom.attributes.position
  return pos.array instanceof Float32Array ? pos.array : new Float32Array(pos.array)
}

// rapier 0.19 compat의 init()은 wasm-bindgen을 구식 시그니처로 부르며 매번 폐기예정 경고를 찍는다.
// 우리 코드로는 못 고치고 QA는 경고 1건도 실격 처리하므로 그 문장만 삼킨다. 나머지 경고는 그대로 통과.
const DEPRECATED_INIT = 'using deprecated parameters for the initialization function'
export async function initRapier (R) {
  const warn = console.warn
  console.warn = (...a) => { if (!(typeof a[0] === 'string' && a[0].includes(DEPRECATED_INIT))) warn.apply(console, a) }
  try { await R.init() } finally { console.warn = warn }
}

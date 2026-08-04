// 공유 지오메트리 키트. world/chars의 모든 형상은 여기를 거친다.
// 규약: 순수 BoxGeometry 노출 금지(루브릭 D4) — 박스는 전부 bevelBox()로 만든다.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rng, clamp, lerp, smoothstep, noise2D, fbm } from '../core/util.js'
import { mat, wearMat, glow } from './kit-mat.js'

export { mat, wearMat, glow, usingMaterialLibrary } from './kit-mat.js'

const TAU = Math.PI * 2

// ── 지오메트리 ───────────────────────────────────────────────────────────
const _geo = new Map()

export function bevelBox (w, h, d, bevel = 0.012, seg = 1) {
  const b = Math.max(0.0008, Math.min(bevel, Math.min(w, h, d) * 0.45))
  const key = `bb|${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${b.toFixed(4)}|${seg}`
  let g = _geo.get(key)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, b)
    g.computeBoundingBox()
    _geo.set(key, g)
  }
  return g
}

// 단면 프로파일 스윕. 몰딩·걸레받이·문틀·난간·왕관몰딩용.
// 단면은 (u, v) 좌표: u = 런의 측방향 = cross(up, tangent), v = 벽에서 나오는 방향 = cross(tangent, u).
// Frenet 프레임에 맡기면 런 방향마다 단면이 제멋대로 돌아 몰딩이 벽을 파고든다 — 프레임을 직접 고정한다.
export function profile (points, path, opts = {}) {
  const shape = new THREE.Shape()
  points.forEach(([u, v], i) => (i ? shape.lineTo(u, v) : shape.moveTo(u, v)))
  shape.closePath()
  const p0 = new THREE.Vector3(path[0][0], path[0][1], path[0][2])
  const p1 = new THREE.Vector3(path[1][0], path[1][1], path[1][2])
  const T = new THREE.Vector3().subVectors(p1, p0)
  const len = T.length()
  T.normalize()
  const U = new THREE.Vector3().fromArray(opts.up ?? (Math.abs(T.y) > 0.9 ? [0, 0, 1] : [0, 1, 0]))
  const L = new THREE.Vector3().crossVectors(U, T).normalize()
  const D = new THREE.Vector3().crossVectors(T, L).normalize()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: len, bevelEnabled: false, steps: opts.steps ?? 1, curveSegments: opts.curveSegments ?? 1
  })
  g.applyMatrix4(new THREE.Matrix4().makeBasis(L, D, T))
  g.translate(p0.x, p0.y, p0.z)
  g.computeVertexNormals()
  g.computeBoundingBox()
  return g
}

// 선반 회전체. 프로파일 코너에서 하이라이트가 뭉개지지 않도록 점을 중복시켜 넘긴다.
export function lathe (pts, seg = 28, opts = {}) {
  const v = pts.map(p => new THREE.Vector2(Math.max(p[0], 1e-4), p[1]))
  const g = new THREE.LatheGeometry(v, seg, opts.phiStart ?? 0, opts.phiLength ?? TAU)
  g.computeBoundingBox()
  return g
}

// 실린더·관 끝단 모따기 칼라. 잘린 실린더 실루엣은 그 자체로 D4다 — 관이 다른 부재를 만나는
// 지점마다 이 링을 끼워 하이라이트가 끊기는 에지를 만든다.
export function collar (r, opts = {}) {
  const t = opts.t ?? r * 1.5
  const b = opts.b ?? r * 0.45
  return lathe([[r * 0.96, 0], [r + b * 0.55, b * 0.30], [r + b, b * 0.85],
    [r + b, t - b * 0.85], [r + b * 0.55, t - b * 0.30], [r * 0.96, t]], opts.seg ?? 12)
}

// 3단 계단 몰딩 단면. 문틀·프레임·선반 노징처럼 "박스 한 덩이"로 읽히면 안 되는 부재용.
// u = 개구부 바깥 방향(폭), v = 벽에서 튀어나오는 방향(깊이).
export function stepProfile (w, d, steps = 3) {
  const p = [[0, 0]]
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps
    const u = w * (0.30 + 0.70 * t)
    const v = d * (1 - i / steps) * 0.92
    p.push([u - w * 0.10 * (1 - t), v], [u, v], [u, v - d * 0.30 / steps])
  }
  p.push([w, 0])
  return p
}

export function tube (path, radius = 0.02, tubular = 24, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed)
  const g = new THREE.TubeGeometry(curve, tubular, radius, radial, closed)
  g.computeBoundingBox()
  return g
}

// 곡면 리본(종려잎·천 조각). widthFn(t)로 끝으로 갈수록 좁아지게 한다.
export function ribbon (path, widthFn, seg = 16, twist = 0) {
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], p[1], p[2])))
  const frames = curve.computeFrenetFrames(seg, false)
  const pos = [], nor = [], uv = [], idx = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const p = curve.getPointAt(t)
    const w = widthFn(t)
    const b = frames.binormals[i].clone().applyAxisAngle(frames.tangents[i], twist * t)
    const n = frames.normals[i].clone().applyAxisAngle(frames.tangents[i], twist * t)
    for (let s = -1; s <= 1; s += 1) {
      pos.push(p.x + b.x * w * s, p.y + b.y * w * s, p.z + b.z * w * s)
      nor.push(n.x, n.y, n.z)
      uv.push((s + 1) * 0.5, t)
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 3
    idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingBox()
  return g
}

// 여러 조각을 한 드로우콜로 합친다. 같은 재질을 쓰는 반복 요소(네온관·크리스털·격자)의 필수 단계.
export function merge (geos, transforms) {
  const list = []
  for (let i = 0; i < geos.length; i++) {
    let g = geos[i].clone()
    if (transforms && transforms[i]) g.applyMatrix4(transforms[i])
    if (g.index) g = g.toNonIndexed()
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k)
    }
    if (!g.attributes.normal) g.computeVertexNormals()
    const c = g.attributes.position.count
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(c * 2), 2))
    g.morphAttributes = {}
    list.push(g)
  }
  const anyColor = list.some(g => g.attributes.color)
  if (anyColor) {
    for (const g of list) {
      if (g.attributes.color) continue
      const c = g.attributes.position.count
      g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(c * 3).fill(1), 3))
    }
  }
  const out = mergeGeometries(list, false)
  if (out) out.computeBoundingBox()
  return out || list[0]
}

function flipWinding (g) {
  const attrs = [g.attributes.position, g.attributes.normal, g.attributes.uv, g.attributes.color]
  for (let i = 0; i < g.attributes.position.count; i += 3) {
    for (const a of attrs) {
      if (!a) continue
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.array[i * a.itemSize + k]
        a.array[i * a.itemSize + k] = a.array[(i + 2) * a.itemSize + k]
        a.array[(i + 2) * a.itemSize + k] = t
      }
    }
  }
  return g
}

// 뒷면을 실제 면으로 복제한다. 공유 재질의 side를 건드리지 않고 얇은 판(잎·천)을 양면으로 만드는 유일한 방법.
export function twoSided (geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const back = flipWinding(g.clone())
  const n = back.attributes.normal
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i))
  return merge([g, back])
}

// x축 대칭 복제. 음의 행렬식은 와인딩을 뒤집으므로 삼각형 순서를 되돌려 준다(문틀 반대쪽 선틀용).
export function mirrorX (geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  g.scale(-1, 1, 1)
  flipWinding(g)
  g.computeBoundingBox()
  return g
}

export function xf (pos, rot, scale) {
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0))
  const s = scale === undefined ? [1, 1, 1] : (Array.isArray(scale) ? scale : [scale, scale, scale])
  m.compose(new THREE.Vector3(pos?.[0] ?? 0, pos?.[1] ?? 0, pos?.[2] ?? 0), q, new THREE.Vector3(s[0], s[1], s[2]))
  return m
}

// 구겨진 천. 평면 금지 규약(침구·커튼)의 실제 주름을 만든다.
export function crumple (geo, opts = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const pos = g.attributes.position
  const n = noise2D(opts.seed ?? 11)
  const amp = opts.amp ?? 0.02
  const freq = opts.freq ?? 9
  const dir = opts.dir ?? [0, 1, 0]
  const fold = opts.fold ?? 0
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    let d = fbm(n, x * freq, z * freq + y * freq * 0.5, 4)
    if (fold) d += Math.sin(x * fold + fbm(n, x * 2, z * 2, 2) * 3) * 0.35
    pos.setXYZ(i, x + dir[0] * d * amp, y + dir[1] * d * amp, z + dir[2] * d * amp)
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingBox()
  return g
}

// 모서리 마모 마스크를 정점 컬러에 굽는다. 캐시 지오메트리를 오염시키지 않도록 항상 복제.
export function edgeWear (geo, opts = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  g.computeBoundingBox()
  const bb = g.boundingBox
  const sx = Math.max(bb.max.x - bb.min.x, 1e-5)
  const sy = Math.max(bb.max.y - bb.min.y, 1e-5)
  const sz = Math.max(bb.max.z - bb.min.z, 1e-5)
  const n = noise2D(opts.seed ?? 5)
  const amount = opts.amount ?? 1
  const tint = new THREE.Color(opts.tint ?? 0x6a635a)
  const col = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i)
    const ax = Math.abs((px - bb.min.x) / sx * 2 - 1)
    const ay = Math.abs((py - bb.min.y) / sy * 2 - 1)
    const az = Math.abs((pz - bb.min.z) / sz * 2 - 1)
    const s = [ax, ay, az].sort((a, b) => b - a)
    const corner = clamp((s[1] - 0.5) / 0.5, 0, 1)          // 두 축이 동시에 극단 = 모서리
    const grime = fbm(n, px * 7.3, pz * 7.3 + py * 4.1, 4) * 0.5 + 0.5
    const up = nrm ? clamp(nrm.getY(i), 0, 1) : 0            // 윗면에 먼지가 더 앉는다
    const w = clamp((corner * (0.5 + 0.5 * grime) + up * grime * 0.22) * amount, 0, 1)
    c.set(0xffffff).lerp(tint, w)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

// ── 조립 헬퍼 ────────────────────────────────────────────────────────────
export function mesh (geo, name, opts = {}) {
  const wear = opts.wear ?? 0
  const g = wear > 0 ? edgeWear(geo, { amount: wear, seed: opts.seed ?? 5, tint: opts.tint }) : geo
  // vcol: 호출자가 이미 구운 정점 컬러(타일 명도 지터 등)를 그대로 소비시킨다.
  const m = new THREE.Mesh(g, (wear > 0 || opts.vcol) ? wearMat(name) : mat(name))
  m.castShadow = opts.cast !== false
  m.receiveShadow = opts.receive !== false
  if (opts.pos) m.position.set(opts.pos[0], opts.pos[1], opts.pos[2])
  if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2])
  if (opts.scale) {
    const s = opts.scale
    if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s)
  }
  if (opts.name) m.name = opts.name
  return m
}

export function glowMesh (geo, key, opts = {}) {
  const m = new THREE.Mesh(geo, glow(key, opts))
  m.castShadow = false
  m.receiveShadow = false
  if (opts.pos) m.position.set(opts.pos[0], opts.pos[1], opts.pos[2])
  if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2])
  return m
}

export function group (name, ...children) {
  const g = new THREE.Group()
  g.name = name
  for (const c of children) if (c) g.add(c)
  return g
}

// ── 접지 ─────────────────────────────────────────────────────────────────
let _contactGeo = null
let _contactTex = null
const _contactMats = new Map()

// 컨택트 섀도 프로파일. 단일 가우시안 블롭은 실루엣 경계에서 밝기가 유지돼 "붙여넣은 것"으로
// 읽힌다(D5). 실측 AO는 접점에서 거의 검고 좁게 급락한 뒤 넓고 옅은 꼬리를 남기는 2엽 구조다 —
// core(급락)와 halo(꼬리)를 알파에 함께 굽는다.
function contactTex () {
  if (_contactTex) return _contactTex
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const n = noise2D(19)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size * 2 - 1
      const dy = (y + 0.5) / size * 2 - 1
      const d = Math.sqrt(dx * dx + dy * dy)
      const wob = 1 + fbm(n, dx * 2.6, dy * 2.6, 3) * 0.17
      const t = clamp(d / wob, 0, 1)
      const core = clamp(1 - smoothstep(clamp((t - 0.16) / 0.30, 0, 1)), 0, 1)
      const halo = Math.pow(1 - t, 2.6)
      const a = clamp(core * 0.80 + halo * 0.42, 0, 1)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = (a * 255) | 0
    }
  }
  ctx.putImageData(img, 0, 0)
  _contactTex = new THREE.CanvasTexture(c)
  _contactTex.colorSpace = THREE.SRGBColorSpace
  _contactTex.anisotropy = 4
  return _contactTex
}

function contactMat (strength) {
  const k = strength.toFixed(2)
  let m = _contactMats.get(k)
  if (m) return m
  // MultiplyBlending이라야 밝은 타일 위에서도 같은 비율로 어두워진다. 알파 블렌딩은 상수색을
  // 섞어 어두운 바닥에서는 되레 밝아지고 밝은 바닥에서는 덜 어두워진다.
  m = new THREE.MeshBasicMaterial({
    color: 0xffffff, map: contactTex(), transparent: true, opacity: strength,
    blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide
  })
  m.polygonOffset = true
  m.polygonOffsetFactor = -4
  m.polygonOffsetUnits = -4
  _contactMats.set(k, m)
  return m
}

// 오브젝트 하단 컨택트 섀도 데칼(루브릭 D5). 반환값을 잡아 두면 나중에 세기를 조절할 수 있다.
export function groundContact (obj, opts = {}) {
  if (!_contactGeo) _contactGeo = new THREE.PlaneGeometry(1, 1, 1, 1)
  let rx = opts.radius
  let rz = opts.radiusZ ?? opts.radius
  if (rx === undefined) {
    const box = new THREE.Box3().setFromObject(obj)
    rx = Math.max(box.max.x - box.min.x, 0.05) * 0.72
    rz = Math.max(box.max.z - box.min.z, 0.05) * 0.72
  }
  const sp = opts.spread ?? 1
  const m = new THREE.Mesh(_contactGeo, contactMat(clamp(opts.strength ?? 0.72, 0.05, 0.99)))
  m.rotation.x = -Math.PI / 2
  m.scale.set(rx * 2 * sp, rz * 2 * sp, 1)
  m.position.set(opts.x ?? 0, opts.y ?? 0.0035, opts.z ?? 0)
  m.renderOrder = opts.renderOrder ?? 2
  m.castShadow = false
  m.receiveShadow = false
  m.frustumCulled = opts.cull !== false
  m.name = 'contact'
  obj.add(m)
  return m
}

// 다리·발처럼 접점이 여러 개인 오브젝트용. 발마다 좁고 진한 코어를 깔고 몸체 전체에 넓고 옅은
// 오클루전 풀을 하나 더 깐다 — 접점만 있으면 오브젝트가 바닥에서 "떠 있는 다리"로 읽힌다.
export function footContacts (obj, feet, opts = {}) {
  const r = opts.footRadius ?? 0.075
  for (const [fx, fz] of feet) {
    groundContact(obj, { x: fx, z: fz, radius: r, strength: opts.footStrength ?? 0.88, y: opts.y ?? 0.0035 })
  }
  if (opts.pool !== false) {
    let px = 0, pz = 0
    for (const [fx, fz] of feet) { px = Math.max(px, Math.abs(fx)); pz = Math.max(pz, Math.abs(fz)) }
    groundContact(obj, {
      radius: (px + r) * 1.35, radiusZ: (pz + r) * 1.35,
      strength: opts.poolStrength ?? 0.34, y: (opts.y ?? 0.0035) - 0.0008
    })
  }
  return obj
}

// ── 배치 ─────────────────────────────────────────────────────────────────
export function scatter (rngFn, count, area, fn) {
  const out = []
  for (let i = 0; i < count; i++) {
    const s = {
      i,
      x: (area.x ?? 0) + (rngFn() - 0.5) * (area.w ?? 1),
      y: (area.y ?? 0) + (area.h ? (rngFn() - 0.5) * area.h : 0),
      z: (area.z ?? 0) + (rngFn() - 0.5) * (area.d ?? 1),
      rot: rngFn() * TAU,
      tilt: (rngFn() - 0.5) * (area.tilt ?? 0),
      scale: lerp(area.smin ?? 0.85, area.smax ?? 1.15, rngFn()),
      wear: rngFn()
    }
    const o = fn(s)
    if (o) {
      if (o.isObject3D && area.place !== false) {
        o.position.set(s.x, s.y, s.z)
        o.rotation.y += s.rot
        o.scale.multiplyScalar(s.scale)
      }
      out.push(o)
    }
  }
  return out
}

// 반복 배치용 복제. 같은 문·액자·의자가 나란히 서도 동일해 보이지 않게 시드 변주를 준다.
export function clone (obj, seed = 1, opts = {}) {
  const r = rng(seed)
  const o = obj.clone(true)
  const p = opts.pos ?? 0.018
  const rt = opts.rot ?? 0.045
  const sc = opts.scale ?? 0.035
  o.position.x += (r() - 0.5) * p
  o.position.y += (r() - 0.5) * p * 0.35
  o.position.z += (r() - 0.5) * p
  o.rotation.x += (r() - 0.5) * rt * 0.3
  o.rotation.y += (r() - 0.5) * rt
  o.rotation.z += (r() - 0.5) * rt * 0.3
  o.scale.multiplyScalar(1 + (r() - 0.5) * sc)
  return o
}

export function shadows (obj, cast = true, receive = true) {
  obj.traverse(o => {
    if (!o.isMesh || o.name === 'contact') return
    o.castShadow = cast
    o.receiveShadow = receive
  })
  return obj
}

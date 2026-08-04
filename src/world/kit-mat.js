// 키트의 재질 해석층. kit.js가 재수출한다(§11 파일당 500줄 분할).
// MATERIALS의 library.js가 있으면 그것만 쓴다. 아직 없는 동안에도 시각 검증이 멈추면
// 안 되므로 키트 내장 폴백으로 렌더링을 유지한다(library.js 착지 즉시 자동으로 비활성).

import * as THREE from 'three'
import { clamp, noise2D, fbm } from '../core/util.js'

const _libs = import.meta.glob('../materials/*.js')
let _lib = null
for (const k of Object.keys(_libs)) {
  if (k.endsWith('library.js')) {
    try { _lib = await _libs[k]() } catch { _lib = null }
  }
}

const FB = {
  'marble.lobby.floor': [0x24262b, 0.16, 0, { clearcoat: 0.6, clearcoatRoughness: 0.1 }],
  'brass.polished': [0xb08d3f, 0.19, 1, {}],
  'brass.tarnished': [0x6c5930, 0.47, 1, {}],
  'wood.varnished.dark': [0x2c1b12, 0.29, 0, { clearcoat: 0.7, clearcoatRoughness: 0.17 }],
  'wood.painted.white': [0xa8a397, 0.56, 0, { clearcoat: 0.25, clearcoatRoughness: 0.4 }],
  'wallpaper.damask.green': [0x2b3b2d, 0.79, 0, {}],
  'plaster.cracked': [0x8b8478, 0.93, 0, {}],
  'tile.hex.bathroom': [0x99968e, 0.25, 0, { clearcoat: 0.5, clearcoatRoughness: 0.1 }],
  'tile.subway.white': [0xb4b1a8, 0.21, 0, { clearcoat: 0.62, clearcoatRoughness: 0.07 }],
  'concrete.rooftop': [0x53504a, 0.89, 0, {}],
  'steel.rusted': [0x593323, 0.73, 0.7, {}],
  'steel.galvanized': [0x7c8088, 0.43, 1, {}],
  'glass.clear': [0xd6e0e0, 0.04, 0, { transparent: true, opacity: 0.24, side: THREE.DoubleSide }],
  'glass.frosted': [0xd4d8d4, 0.44, 0, { transparent: true, opacity: 0.62, side: THREE.DoubleSide }],
  'mirror.aged': [0x9ea4a2, 0.11, 1, {}],
  'fabric.velvet.red': [0x4a1017, 0.93, 0, { sheen: 1, sheenRoughness: 0.34, sheenColor: 0x8d3c3c }],
  'fabric.wool.suit': [0x23252a, 0.96, 0, { sheen: 0.42, sheenRoughness: 0.72 }],
  'leather.worn.brown': [0x3a2418, 0.63, 0, { clearcoat: 0.25, clearcoatRoughness: 0.55 }],
  'paper.aged': [0xb8aa8b, 0.94, 0, {}],
  'water.dark': [0x09161a, 0.06, 0, { clearcoat: 1, clearcoatRoughness: 0.04 }],
  'grime.overlay': [0x2a251f, 0.98, 0, {}],
  'carpet.corridor.red': [0x431a1a, 0.98, 0, { sheen: 0.5, sheenRoughness: 0.92 }],
  'ceramic.sink': [0xcec9be, 0.13, 0, { clearcoat: 0.82, clearcoatRoughness: 0.05 }],
  'bakelite.black': [0x121213, 0.31, 0, { clearcoat: 0.6, clearcoatRoughness: 0.2 }]
}

let _grunge = null
function grunge () {
  if (_grunge) return _grunge
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const n = noise2D(37)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = fbm(n, x / size * 4.0, y / size * 4.0, 5) * 0.5 + 0.5
      const b = fbm(n, x / size * 21 + 11, y / size * 21 - 7, 3) * 0.5 + 0.5
      const g = clamp(a * 0.68 + b * 0.32, 0, 1)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = (g * 255) | 0
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  _grunge = new THREE.CanvasTexture(c)
  _grunge.wrapS = _grunge.wrapT = THREE.RepeatWrapping
  _grunge.colorSpace = THREE.NoColorSpace
  _grunge.anisotropy = 8
  return _grunge
}

const _fbCache = new Map()
function fallbackMat (name) {
  let m = _fbCache.get(name)
  if (m) return m
  const spec = FB[name]
  if (!spec) {
    m = new THREE.MeshPhysicalMaterial({ color: 0xff00ff, roughness: 0.5 })
    _fbCache.set(name, m)
    return m
  }
  const [color, roughness, metalness, extra] = spec
  m = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra })
  // 러프니스 상수는 루브릭 G3 즉시 감점 — 폴백에도 그런지 변주를 넣는다
  m.roughnessMap = grunge()
  m.bumpMap = grunge()
  m.bumpScale = 0.06
  m.envMapIntensity = metalness > 0.5 ? 1.35 : 1.0
  _fbCache.set(name, m)
  return m
}

export function mat (name) {
  return _lib && _lib.mat ? _lib.mat(name) : fallbackMat(name)
}

export const usingMaterialLibrary = () => !!(_lib && _lib.mat)

// 정점 컬러 마모 마스크를 소비하는 변종. 러프니스를 함께 밀어 마모가 스펙큘러로 읽히게 한다.
const _wearCache = new Map()
export function wearMat (name) {
  let m = _wearCache.get(name)
  if (m) return m
  const src = mat(name)
  try {
    const ud = src.userData
    src.userData = {}                       // Material.copy가 userData를 JSON 왕복시킨다
    try { m = src.clone() } finally { src.userData = ud }
    m.userData = ud                         // 원본 유니폼 참조를 잃지 않도록 되돌린다
    m.vertexColors = true
    const base = m.onBeforeCompile
    const baseKey = m.customProgramCacheKey
    m.onBeforeCompile = function (sh, r) {
      if (base) base.call(this, sh, r)
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n\troughnessFactor = clamp( roughnessFactor + ( 1.0 - dot( vColor.rgb, vec3( 0.3333 ) ) ) * 0.55, 0.035, 1.0 );\n#endif'
      )
    }
    m.customProgramCacheKey = function () { return 'cecil-wear|' + (baseKey ? baseKey.call(this) : '') }
    m.needsUpdate = true
  } catch {
    m = src
  }
  _wearCache.set(name, m)
  return m
}

// 발광면(네온관·전구·유백유리). PBR 표면이 아니라 광원의 가시부라 라이브러리 대상이 아니다.
const _glowCache = new Map()
export function glow (key, opts = {}) {
  let m = _glowCache.get(key)
  if (m) return m
  m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x101010,
    emissive: opts.emissive ?? 0xffbb66,
    emissiveIntensity: opts.intensity ?? 3.0,
    roughness: opts.roughness ?? 0.35,
    metalness: 0,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide
  })
  _glowCache.set(key, m)
  return m
}

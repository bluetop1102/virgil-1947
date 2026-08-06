// 키트의 재질 해석층. kit.js가 재수출한다(§11 파일당 500줄 분할).
// MATERIALS의 library.js가 있으면 그것만 쓴다. 아직 없는 동안에도 시각 검증이 멈추면
// 안 되므로 키트 내장 폴백으로 렌더링을 유지한다(library.js 착지 즉시 자동으로 비활성).

import * as THREE from 'three'
import { mat as libraryMat } from '../materials/library.js'

export function mat (name) {
  return libraryMat(name)
}

export const usingMaterialLibrary = () => true

/**
 * 라이브러리 재질을 안전하게 복제한다. `THREE.Material.copy` 는 두 가지를 사고로 만든다.
 *
 *  1. `userData` 를 **JSON 왕복**시킨다. 우리 userData 에는 applyCecil 이 심은 유니폼 객체가
 *     들어 있고 그 안에 렌더타깃 텍스처가 있다 — 직렬화가 불가능해
 *     "THREE.Texture: Unable to serialize Texture." 경고가 뜨고 유니폼 참조도 끊긴다.
 *  2. `defines` / `onBeforeCompile` / `customProgramCacheKey` / `onBeforeRender` 를
 *     **복사하지 않는다**(three.core.js `Material.copy` 필드 목록으로 확인). 그래서 클론은
 *     CECIL_TRIPLANAR·CECIL_STOCH·CECIL_POM·CECIL_FLOW 와 주입 청크를 통째로 잃고
 *     기본 PBR + 메시 UV 로 되돌아간다.
 *
 * (2)가 복도 스미어의 원인이었다 — 벽 베니어는 uv 0..1 이 17.3m × 1.79m 인 판이라,
 * 트리플래너를 잃는 순간 벽지 한 장이 복도 전체에 늘어나 화면을 가로지르는 가닥이 된다.
 * 재질을 복제하는 자리는 전부 이 함수를 거쳐야 한다. patch 는 원본 onBeforeCompile 이 돈 뒤에
 * 덧붙일 셰이더 수정이고, key 는 그 변종의 프로그램 캐시 키다.
 */
export function cloneMat (src, opts = {}) {
  const ud = src.userData
  src.userData = {}
  let m
  try { m = src.clone() } finally { src.userData = ud }
  m.userData = ud                           // 원본 유니폼 참조를 잃지 않도록 되돌린다
  m.defines = Object.assign({}, src.defines)
  const base = src.onBeforeCompile
  const baseKey = src.customProgramCacheKey
  if (src.onBeforeRender) m.onBeforeRender = src.onBeforeRender
  m.onBeforeCompile = function (sh, r) {
    if (base) base.call(this, sh, r)
    if (opts.patch) opts.patch(sh)
  }
  m.customProgramCacheKey = function () { return (opts.key ?? 'clone') + '|' + (baseKey ? baseKey.call(this) : '') }
  m.needsUpdate = true
  return m
}

// 정점 컬러 마모 마스크를 소비하는 변종. 러프니스를 함께 밀어 마모가 스펙큘러로 읽히게 한다.
const WEAR_PATCH = sh => {
  sh.fragmentShader = sh.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    '#include <roughnessmap_fragment>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n\troughnessFactor = clamp( roughnessFactor + ( 1.0 - dot( vColor.rgb, vec3( 0.3333 ) ) ) * 0.55, 0.035, 1.0 );\n#endif'
  )
}

const _wearCache = new Map()
export function wearMat (name) {
  let m = _wearCache.get(name)
  if (m) return m
  const src = mat(name)
  try {
    m = cloneMat(src, { patch: WEAR_PATCH, key: 'cecil-wear' })
    m.vertexColors = true
  } catch {
    m = src
  }
  // 렌더러가 잡히기 전이면 src는 아직 map도 defines도 없는 껍데기다. 그 상태를 캐시하면
  // 이후 complete()가 원본만 채우고 이 클론은 영원히 빈 채로 남는다 — 캐시는 완성 후에만.
  if (!src.userData.pending) _wearCache.set(name, m)
  return m
}

// 발광면(네온관·전구·유백유리). PBR 표면이 아니라 광원의 가시부라 라이브러리 대상이 아니다.
const _glowCache = new Map()
export function glow (key, opts = {}) {
  let m = _glowCache.get(key)
  if (m) return m
  m = cloneMat(mat('bakelite.black'), { key: `glow:${key}` })
  // 발광면은 절차 표면이 아니므로 레지스트리 클론의 텍스처·주입만 제거해 기존 표준 PBR과 맞춘다.
  for (const prop of [
    'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 'normalMap',
    'displacementMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap'
  ]) m[prop] = null
  m.isMeshPhysicalMaterial = false
  m.type = 'MeshStandardMaterial'
  m.defines = { STANDARD: '' }
  m.onBeforeCompile = THREE.Material.prototype.onBeforeCompile
  m.customProgramCacheKey = THREE.Material.prototype.customProgramCacheKey
  m.userData = {}
  m.color.set(opts.color ?? 0x101010)
  m.emissive.set(opts.emissive ?? 0xffbb66)
  m.emissiveIntensity = opts.intensity ?? 3.0
  m.roughness = opts.roughness ?? 0.35
  m.metalness = 0
  m.envMapIntensity = 1
  m.transparent = opts.opacity !== undefined
  m.opacity = opts.opacity ?? 1
  m.side = opts.side ?? THREE.FrontSide
  m.needsUpdate = true
  _glowCache.set(key, m)
  return m
}

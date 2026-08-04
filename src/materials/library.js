import * as THREE from 'three'
import { QUALITY } from '../core/config.js'
import { bakeSurface, detailNormal, applyCecil, tick, disposeBaked } from './procedural.js'
import { RECIPES_A } from './recipes.a.js'
import { RECIPES_B } from './recipes.b.js'

// 명명 재질 레지스트리. world/chars는 여기서만 재질을 얻는다 (ARCHITECTURE 6절).
//   mat(name)                 캐시된 MeshPhysicalMaterial. 미등록이면 마젠타 + 경고.
//   preload(renderer, quality) 전 재질 베이크. 엔진 init 초기에 한 번.
// 라이브러리이므로 default export를 두지 않는다 — main.js의 모듈 자동등록 대상이 아니다.

const RECIPES = { ...RECIPES_A, ...RECIPES_B }
export const MATERIAL_NAMES = Object.keys(RECIPES)

const cache = new Map()
const ctx = { renderer: null, quality: QUALITY.high, detail: null }

function ensure () {
  if (!ctx.renderer && typeof window !== 'undefined' && window.__ENGINE__) {
    ctx.renderer = window.__ENGINE__.renderer
    ctx.quality = window.__ENGINE__.quality || ctx.quality
  }
  return ctx.renderer
}

function texSize (texRes, mult) {
  const p = Math.pow(2, Math.round(Math.log2(Math.max(1, texRes * mult))))
  return Math.max(128, Math.min(texRes, p))
}

function missing (name) {
  console.warn(`[materials] 미등록 재질: ${name}`)
  const m = new THREE.MeshPhysicalMaterial({ color: 0xff00ff, roughness: 0.35, metalness: 0, emissive: 0xff00ff, emissiveIntensity: 0.5 })
  m.name = `missing:${name}`
  return m
}

function complete (m, name) {
  const r = ensure()
  if (!r || !m.userData.pending) return m
  const def = RECIPES[name]
  const opts = def.opts || {}
  const t = bakeSurface(r, def, texSize(ctx.quality.texRes, def.mult ?? 0.25))
  const rep = opts.repeat || [1, 1]
  for (const tex of [t.albedo, t.normal, t.orm]) tex.repeat.set(rep[0], rep[1])
  m.color.setRGB(1, 1, 1)
  m.map = t.albedo
  m.normalMap = t.normal
  m.normalMapType = THREE.TangentSpaceNormalMap
  m.normalScale.set(opts.normalScale ?? 1, opts.normalScale ?? 1)
  m.roughnessMap = t.orm
  m.roughness = 1
  m.metalness = 1
  applyCecil(m, opts, ctx.quality, detailNormal(r, 512))
  m.userData.pending = false
  return m
}

export function mat (name) {
  let m = cache.get(name)
  if (m) return complete(m, name)
  const def = RECIPES[name]
  if (!def) { m = missing(name); cache.set(name, m); return m }
  // 프리로드 전에 호출돼도 앱은 부팅돼야 한다. 텍스처 없이 생성해 두고 렌더러가 잡히면 채운다.
  m = new THREE.MeshPhysicalMaterial({ color: 0x8a8a8a, roughness: 0.7, metalness: 0, ...(def.mat || {}) })
  m.name = name
  m.userData.pending = true
  cache.set(name, m)
  return complete(m, name)
}

export function preload (renderer, quality) {
  ctx.renderer = renderer
  if (quality) ctx.quality = quality
  ctx.detail = detailNormal(renderer, 512)
  for (const name of MATERIAL_NAMES) mat(name)
  return MATERIAL_NAMES.length
}

export function has (name) { return !!RECIPES[name] }

export function dispose () {
  for (const m of cache.values()) m.dispose()
  cache.clear()
  disposeBaked()
  ctx.renderer = null
  ctx.detail = null
}

export { tick }

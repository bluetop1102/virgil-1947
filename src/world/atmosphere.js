// ATMOSPHERE — 절차 IBL · 실광원 팩토리 · 무드 프리셋 · 대기 파라미터 · 파티클.
// 레벨은 여기 있는 practical/setMood만 쓴다. THREE.PointLight를 직접 만들지 않는다(계약 6.5).

import * as THREE from 'three'
import { kelvin, clamp } from '../core/util.js'
import { MOODS, ROOM_MOOD, DEFAULT_MOOD } from './atmo/moods.js'
import { IblBaker } from './atmo/ibl.js'
import { makeFixture, setFixtureGlow, shaftMesh } from './atmo/fixtures.js'
import { ParticleField } from './atmo/particles.js'
import { RainField } from './atmo/rain.js'
import { buildProbe, OY } from './atmo/probe.js'
import {
  PHOTOMETRIC, SHAFT_GAIN, SHAFT_CD_REF, KINDS, offLocus, flicker, candela
} from './atmo/photometry.js'

const S = {
  e: null, baker: null, field: null, rain: null, pool: [], queue: [], mood: DEFAULT_MOOD,
  rig: null, frame: 0, depth: null, res: new THREE.Vector2(1280, 720),
  atmo: null, probe: null, seed: 0, top: [], groundY: 0
}

function moodDef () { return MOODS[S.mood] || MOODS[DEFAULT_MOOD] }

export function currentMood () { return S.mood }

// 앰비언트 리그: IBL이 채우지 못하는 순수 흑을 들어올리는 바닥값(실격 D6 방어).
export function ambientRig (opts = {}) {
  const sky = opts.sky || [0.03, 0.03, 0.035]
  const ground = opts.ground || [0.012, 0.010, 0.009]
  if (!S.rig) {
    S.rig = { hemi: new THREE.HemisphereLight(0xffffff, 0xffffff, 1) }
    S.rig.hemi.name = 'atmo.hemi'
    S.rig.hemi.position.set(0, 6, 0)
    if (S.e) S.e.scene.add(S.rig.hemi)
  }
  S.rig.hemi.color.setRGB(sky[0], sky[1], sky[2])
  S.rig.hemi.groundColor.setRGB(ground[0], ground[1], ground[2])
  S.rig.hemi.intensity = opts.intensity ?? 0.5
  return S.rig
}

function attach (rec) {
  const sc = S.e.scene
  sc.add(rec.light)
  if (rec.light.target) sc.add(rec.light.target)
  if (rec.fixture) sc.add(rec.fixture)
  if (rec.holder) sc.add(rec.holder)
  if (rec.fill) sc.add(rec.fill)
  if (rec.up) { sc.add(rec.up); sc.add(rec.up.target) }
  const q = S.e.quality
  if (rec.wantShadow) {
    const sz = rec.type === 'dir' ? q.shadowMap : Math.min(q.shadowMap, 1024)
    rec.light.shadow.mapSize.set(sz, sz)
  }
  // 천장광은 한 번 굽고 끝이라(정적 스포트) 해상도를 아껴 쓸 이유가 없다. 반자틀 줄무늬는
  // 스침각이라 섀도맵 텍셀 하나가 천장에서 수 cm 로 늘어난다 — 1024 면 줄무늬가 계단이 된다.
  if (rec.up) rec.up.shadow.mapSize.set(q.shadowMap, q.shadowMap)
}

/**
 * 실광원 팩토리. 반환 {light, helperMesh, shaft, target}
 * opts: {pos, kelvin, lumens, lux, radius, flicker, castShadow, angle, penumbra,
 *        dir, target, shaft, slats:{count,phase,depth}, fixture:false, hot, name}
 */
export function practical (kind, opts = {}) {
  const K = KINDS[kind] || KINDS.sconce
  const pos = opts.pos || [0, 2.4, 0]
  const kel = opts.kelvin ?? K.kelvin
  const col = offLocus(kelvin(kel), opts.spd ?? K.spd)
  const angle = opts.angle ?? K.angle ?? 1.0
  const lm = opts.lumens ?? opts.lux ?? K.lumens ?? K.lux ?? 500
  const radius = opts.radius ?? K.radius ?? 6
  const cd = candela(K, lm, angle) * PHOTOMETRIC
  const seed = (S.seed = (S.seed + 0.6180339887) % 1)

  let light
  if (K.type === 'dir') {
    light = new THREE.DirectionalLight(0xffffff, cd)
    light.shadow.camera.left = -(opts.extent ?? 24); light.shadow.camera.right = (opts.extent ?? 24)
    light.shadow.camera.top = (opts.extent ?? 24); light.shadow.camera.bottom = -(opts.extent ?? 24)
    light.shadow.camera.near = 0.5; light.shadow.camera.far = 120
  } else if (K.type === 'spot') {
    light = new THREE.SpotLight(0xffffff, cd, radius, angle, opts.penumbra ?? K.penumbra ?? 0.6, 2)
    light.shadow.camera.near = 0.08
    light.shadow.camera.far = radius * 1.25
  } else {
    light = new THREE.PointLight(0xffffff, cd, radius, 2)
  }
  light.color.setRGB(col[0], col[1], col[2])
  light.position.set(pos[0], pos[1], pos[2])
  light.name = opts.name || `atmo.${kind}`

  // VSM 그림자는 PointLight를 지원하지 않는다(three가 경고를 뱉는다) — 조용히 강등한다
  const wantShadow = (opts.castShadow ?? K.shadow) && K.type !== 'point'
  light.castShadow = false
  if (wantShadow) {
    light.shadow.bias = -0.0009
    // 0.022 → 0.013. normalBias 는 섀도 조회 지점을 노멀 방향으로 미는 값이라 접촉면에서
    // 그림자를 물체로부터 그만큼 떼어 놓는다(피터패닝). 22mm 는 의자 다리·카트 바퀴 굵기
    // 규모라 접지가 판독되지 않는 원인이 된다(G4 6점 "전 화면 동일 소프트니스로 접촉면 소실").
    // VSM 은 체비쇼프 상한이라 acne 내성이 PCF 보다 높아 이 폭까지 내릴 여유가 있다.
    light.shadow.normalBias = 0.013
    // VSM 블러 반경. 3.5 는 문틀·카트 발치의 컨택트까지 뭉개 접지가 안 읽혔다(G4/D5).
    // VSM 은 반경이 맵 텍셀 고정이라 어차피 거리별 페넘브라를 못 만든다 — 접촉부를 살린다.
    light.shadow.radius = 2.0
    light.shadow.blurSamples = 8
    light.shadow.autoUpdate = false
  }

  const aim = new THREE.Vector3()
  if (opts.target) aim.fromArray(opts.target)
  else {
    const d = new THREE.Vector3().fromArray(opts.dir || K.dir || [0, -1, 0])
    if (d.lengthSq() < 1e-6) d.set(0, -1, 0)
    aim.copy(light.position).add(d.normalize().multiplyScalar(Math.max(radius * 0.5, 1)))
  }
  if (light.target) light.target.position.copy(aim)

  const hot = opts.hot ?? K.hot ?? 3
  const fixture = opts.fixture === false || hot <= 0 ? null : makeFixture(kind, col, hot)
  if (fixture) {
    fixture.position.set(pos[0], pos[1], pos[2])
    if (opts.fixtureRot) fixture.rotation.set(opts.fixtureRot[0], opts.fixtureRot[1], opts.fixtureRot[2])
    fixture.name = `${light.name}.body`
  }

  // 기구 안쪽 보조광. 벽등 스포트는 아래를 향하고 유백유리 디퓨저는 MeshBasicMaterial이라
  // 빛을 방출하지 않는다 — 사발을 무는 놋쇠 갤러리 링에 직접광이 하나도 닿지 않아 링이
  // IBL만 받는 납작한 어두운 띠로 읽힌다(G3/G10). 전구 자리에 사거리 26cm 점광을 하나 놓아
  // 링의 아랫면만 들어올린다. 세기는 광속의 절대 비율이 아니라 링까지의 거리(≈0.14m)에서
  // 벽면 조도의 2배가 되게 잡았다 — 5~10%를 그대로 넣으면 링이 흰색으로 날아간다.
  let fill = null
  const fillAmt = opts.fill ?? K.fill ?? 0
  if (fixture && fillAmt > 0) {
    fill = new THREE.PointLight(0xffffff, (lm / (4 * Math.PI)) * PHOTOMETRIC * fillAmt, opts.fillRadius ?? 0.26, 2)
    fill.color.setRGB(col[0], col[1], col[2])
    fill.position.set(pos[0], pos[1] + (opts.fillY ?? -0.05), pos[2])
    fill.castShadow = false
    fill.name = `${light.name}.fill`
  }

  // 천장 스필. 유백유리 사발도 반매입 돔도 아래로만 쏘는 스포트가 아니다 — 위로 새는 성분이
  // 없으면 천장은 어떤 광원에도 속하지 않아 IBL 단색면이 되고, 무엇보다 **천장 반자틀이
  // 그림자를 던질 광원이 하나도 없다**(G4 "빛을 배치했을 뿐 그림자를 설계하지 않았다").
  // 천장면에 거의 평행하게 지나가는 빛이라 6cm 깊이 띠장도 수십 cm 짜리 줄무늬를 만든다:
  // 광원이 천장에서 h 아래, 띠장이 수평거리 d 일 때 그림자 길이 ≈ d * (h/(h-b) - 1), b=띠장 깊이.
  // 그래서 이 광원은 반드시 천장 가까이(upY 로 미세조정) 있어야 하고, 원뿔이 아니라
  // 스침각 성분이 본체다. castShadow 는 cullLights 가 별도 예산으로 배분한다.
  let up = null
  const upAmt = opts.up ?? K.up ?? 0
  if (upAmt > 0 && K.type !== 'dir') {
    const uAng = Math.min(opts.upAngle ?? K.upAngle ?? 1.30, 1.50)
    const uRad = opts.upRadius ?? K.upRadius ?? Math.max(radius * 0.4, 2.5)
    up = new THREE.SpotLight(0xffffff, cd * upAmt, uRad, uAng, opts.upPenumbra ?? 0.94, 2)
    up.color.setRGB(col[0], col[1], col[2])
    up.position.set(pos[0], pos[1] + (opts.upY ?? K.upY ?? 0.04), pos[2])
    up.target.position.set(pos[0], pos[1] + 2.0, pos[2])
    up.name = `${light.name}.up`
    up.castShadow = false
    up.shadow.camera.near = 0.05
    up.shadow.camera.far = uRad * 1.2
    // normalBias 0.010 은 띠장 깊이(4~5cm)의 1/5 를, 블러 1.2 텍셀은 스침각에서 수 cm 를 먹는다.
    up.shadow.bias = -0.0002
    up.shadow.normalBias = 0.004
    up.shadow.radius = 0.6
    up.shadow.blurSamples = 8
    up.shadow.autoUpdate = false
  }

  let holder = null, shaft = null
  // 셸 세기가 종류별 상수뿐이면 3400lm 천장등과 1120lm 벽등이 같은 밝기의 광축을 만든다 —
  // "샤프트 강도가 이미터 강도와 단조 대응"이 깨진다(G1/G2). 광도비를 완만하게 물린다.
  const shaftAmt = (opts.shaft ?? K.shaft ?? 0) * SHAFT_GAIN *
    clamp(Math.sqrt(cd / SHAFT_CD_REF), 0.45, 1.15)
  if (shaftAmt > 0 && K.type === 'spot') {
    // 사거리(radius)는 감쇠가 0이 되는 거리지 빔이 닿는 거리가 아니다. 11m 사거리 벽등의 셸을
    // 10m로 뽑으면 반각 41°가 반경 8.7m 원뿔이 되어 2.84m 폭 복도를 통째로 덮는다 —
    // 광축이 아니라 화면 전체에 낀 김으로 읽힌다. 레벨이 실제 투사 거리·가시 코어 반각을 준다.
    // 기본값이 사거리·전체 확산각을 그대로 쓰면 원뿔이 방보다 커진다 — 로비 천장등(사거리 7.5,
    // 각 1.10)은 밑면 반경 13.3m 원뿔이 되어 14.4m 폭 로비를 통째로 덮었다. 눈에 읽히는 것은
    // 배광 전체가 아니라 코어이므로, 레벨이 값을 안 주면 코어만 잡는 보수적 기본값을 쓴다.
    const len = Math.min(opts.shaftLen ?? radius * 0.42, 7)
    const half = Math.min(opts.shaftAngle ?? angle * 0.40, 0.42)
    shaft = shaftMesh(col, shaftAmt, len, Math.tan(half) * len * 0.98)
    holder = new THREE.Object3D()
    holder.position.copy(light.position)
    holder.lookAt(aim)
    holder.add(shaft)
    if (opts.slats) {
      const u = shaft.material.uniforms
      u.uSlatFreq.value = opts.slats.count ?? 28
      u.uSlatPhase.value = opts.slats.phase ?? 0
      u.uSlatDepth.value = opts.slats.depth ?? 0.85
    }
  }

  const rec = {
    kind, light, fixture, holder, shaft, fill, up, wantShadow, type: K.type,
    col, hot, radius, prio: K.prio ?? 1, seed, baseI: cd, fillBase: fill ? fill.intensity : 0,
    upBase: up ? up.intensity : 0,
    shape: opts.flickerShape || K.flick, amt: opts.flicker ?? (K.flick === 'none' ? 0 : 0.05),
    shaftBase: shaftAmt, k: -1, packet: null
  }
  S.pool.push(rec)
  if (S.e) attach(rec)
  else S.queue.push(rec)
  return {
    light, helperMesh: fixture, shaft, target: light.target || null,
    dispose: () => disposePractical(rec)
  }
}

// 레벨 언로드·프로브 리그 교체용. 풀에서 빼지 않으면 광원 예산이 죽은 광원에 먹힌다.
function disposePractical (rec) {
  const i = S.pool.indexOf(rec)
  if (i >= 0) S.pool.splice(i, 1)
  S.top = S.top.filter(r => r !== rec)
  for (const o of [rec.light, rec.light.target, rec.fixture, rec.holder, rec.fill, rec.up, rec.up?.target]) o?.parent?.remove(o)
  rec.light.shadow?.dispose?.()
  rec.light.dispose?.()
  rec.fill?.dispose?.()
  rec.up?.shadow?.dispose?.()
  rec.up?.dispose?.()
  rec.shaft?.geometry.dispose()
  rec.shaft?.material.dispose()
  rec.fixture?.traverse(o => { o.geometry?.dispose(); o.material?.dispose() })
}

function publish (m) {
  const a = S.atmo || (S.atmo = {})
  a.density = m.fog.density
  a.heightFalloff = m.fog.heightFalloff
  a.color = m.fog.color.slice()
  a.scattering = m.fog.scattering
  a.anisotropy = m.fog.anisotropy
  a.windDir = m.fog.windDir.slice()
  a.baseHeight = m.fog.baseHeight ?? 0
  a.intensity = m.look.volumetricIntensity
  a.mood = S.mood
  a.sunDir = m.ibl.sun ? m.ibl.sun.dir.slice() : [0, 1, 0]
  a.sunColor = m.ibl.sun ? m.ibl.sun.col.slice() : [0, 0, 0]
  window.__ATMO__ = a
}

// 볼류메트릭 패스는 init 시점의 look 값을 한 번만 굽는다. 무드가 바뀌어도 안개가 안 따라오면
// 프리셋이 절반만 작동한다 — engine.get으로 노출된 인스턴스 상태만 건드려 밀도/이방성을 밀어 넣는다.
// (원계약은 window.__ATMO__ 소비였다. 결과 보고의 CONTRACT_CHANGE_REQUEST 참조)
function syncVolumetric (m) {
  const v = S.e?.get('pipeline')?.effects?.volumetric
  if (!v || !v.params) return
  const f = m.fog
  const p = v.params

  // 소광은 밀도에서 직접 온다. 산란은 소광을 넘길 수 없다 — 단일산란 알베도가 1을 넘으면
  // 안개가 에너지를 만들어 화면 전체가 균일한 우유빛으로 뜬다(G2 "균일 안개 오버레이" + D6 동시 실격).
  // extinctK: 마치 소광 exp(-σd)는 1차라 근경에도 상수항을 얹지만 FogExp2 1-exp(-(σd)²)는 2차라 비켜간다.
  p.extinct = f.density * (f.extinctK ?? 2.4)
  p.scatter = p.extinct * clamp(f.albedo ?? 0.72, 0.02, 0.95)
  // volumetricIntensity는 pipeline의 volApply가 합성 시점에 이미 곱한다. 여기서 또 곱하면 이중 적용.
  p.g = f.anisotropy
  p.ambient = f.ambient ?? 0.42
  // 고도 폴오프는 절대 월드 y를 쓴다. 프로브는 y=-500에 있으므로 기준면을 못 따라가면
  // 지수 그라디언트가 통째로 죽고(항상 최대 밀도) 하늘까지 안개에 잠긴다.
  p.fogY = S.groundY + (f.baseHeight ?? 0)
  p.fogFall = Math.max(f.heightFalloff, 0.02)
  p.nScale = f.noiseScale ?? 0.085
  p.spark = f.spark ?? 3.2
  p.sparkScale = f.sparkScale ?? 1.35
  p.maxDist = f.maxDist ?? 58
  v.fogColor?.setRGB(f.color[0], f.color[1], f.color[2])

  const u = v.mMarch?.uniforms
  if (!u) return
  const push = {
    uExtinct: p.extinct, uScatter: p.scatter, uG: p.g, uAmbient: p.ambient,
    uFogY: p.fogY, uFogFall: p.fogFall, uNScale: p.nScale,
    uSpark: p.spark, uSparkScale: p.sparkScale, uMaxDist: p.maxDist
  }
  for (const k in push) { if (u[k]) u[k].value = push[k] }
}

export function setMood (name) {
  S.mood = MOODS[name] ? name : DEFAULT_MOOD
  const m = moodDef()
  publish(m)
  if (!S.e) return S.mood
  const e = S.e

  const fc = m.fog.color
  if (!e.scene.fog || !e.scene.fog.isFogExp2) e.scene.fog = new THREE.FogExp2(0x000000, m.fog.density)
  e.scene.fog.color.setRGB(fc[0], fc[1], fc[2])
  e.scene.fog.density = m.fog.density

  const L = e.look
  L.exposure = m.exposure
  L.fogDensity = m.fog.density
  L.fogColor = m.fog.color.slice()
  for (const k of ['lift', 'gamma', 'gain', 'saturation', 'contrast', 'halation', 'vignette', 'grainAmount', 'chromatic', 'volumetricIntensity']) {
    if (m.look[k] !== undefined) L[k] = Array.isArray(m.look[k]) ? m.look[k].slice() : m.look[k]
  }
  e.renderer.toneMappingExposure = m.exposure

  const env = S.baker.bake(S.mood, m.ibl, e.quality.texRes >= 2048 ? 256 : 128)
  e.scene.environment = env
  e.scene.environmentIntensity = m.envIntensity
  e.scene.background = m.background ? env : null
  e.scene.backgroundIntensity = 0.9
  e.scene.backgroundBlurriness = 0.02

  ambientRig(m.hemi)
  S.field?.applyMood(m)
  S.rain?.applyMood(m, S.groundY)
  syncVolumetric(m)
  for (const r of S.pool) {
    if (r.shaft) r.shaft.material.uniforms.uWind.value.fromArray(m.fog.windDir).multiplyScalar(2.5)
  }
  return S.mood
}

function cullLights () {
  const e = S.e
  const cam = e.camera
  const budget = e.quality.maxLights ?? 16
  const shadowBudget = e.quality.name === 'cinematic' ? 4 : e.quality.name === 'high' ? 3 : 2
  const dynamic = e.quality.name === 'cinematic' ? 2 : 1

  for (const r of S.pool) {
    if (r.type === 'dir') { r.score = 1e9; r.dist = 0; continue }
    r.dist = r.light.position.distanceTo(cam.position)
    r.score = r.prio * (r.radius + 2) / (r.dist + 1)
  }
  // 천장광 섀도는 본광 예산과 나눠 쓰지 않는다. 나눠 쓰면 근접 벽등 3개가 슬롯을 다 먹고
  // 정작 반자틀 줄무늬를 만드는 광원이 하나도 못 켜진다(G4). 정적 스포트라 첫 프레임에 한 번
  // 굽고 끝이므로 프레임당 비용은 늘지 않는다 — autoUpdate 를 항상 false 로 둔다.
  const upShadowBudget = e.quality.name === 'cinematic' ? 4 : e.quality.name === 'high' ? 2 : 1
  const sorted = S.pool.slice().sort((a, b) => b.score - a.score)
  // 천장 스필의 섀도 우선순위는 카메라 거리가 아니라 그 광원이 천장에 만드는 조도다 —
  // 3400lm 돔이 프레임 한가운데 천장을 맡고, 벽등은 화면 위쪽 띠를 맡는다.
  const upSorted = S.pool.filter(r => r.up).sort((a, b) => (b.upBase / (b.dist + 3)) - (a.upBase / (a.dist + 3)))
  let n = 0, sh = 0, shUp = 0
  for (const r of sorted) {
    const reach = r.type === 'dir' ? Infinity : r.radius * 1.15 + 1.5
    const on = n < budget && r.dist < reach
    // 보조광은 별도 레코드가 아니지만 셰이더 광원 슬롯은 하나 더 먹는다 — 예산에 정직하게 센다
    if (on) n += 1 + (r.fill ? 1 : 0) + (r.up ? 1 : 0)
    if (r.light.visible !== on) r.light.visible = on
    if (r.holder) r.holder.visible = on
    if (r.fill) r.fill.visible = on
    if (r.up) r.up.visible = on
    const wantSh = on && r.wantShadow && sh < shadowBudget
    if (wantSh) {
      if (!r.light.castShadow) { r.light.castShadow = true; r.light.shadow.needsUpdate = true }
      r.light.shadow.autoUpdate = sh < dynamic
      if (!r.light.shadow.autoUpdate && S.frame % 90 === 0) r.light.shadow.needsUpdate = true
      sh++
    } else if (r.light.castShadow) r.light.castShadow = false
  }
  for (const r of upSorted) {
    const wantUp = r.up.visible && r.upBase > 1e-4 && shUp < upShadowBudget
    if (wantUp) {
      if (!r.up.castShadow) { r.up.castShadow = true; r.up.shadow.needsUpdate = true }
      shUp++
    } else if (r.up.castShadow) r.up.castShadow = false
  }
  S.top = sorted.filter(r => r.light.visible && r.type !== 'dir').slice(0, 4)
}

function lightPacket (r) {
  const pk = r.packet || (r.packet = {
    pos: r.light.position, dir: new THREE.Vector3(0, -1, 0), cos: -1,
    range: r.type === 'dir' ? 0 : r.radius,
    col: new THREE.Vector3(r.col[0], r.col[1], r.col[2]), power: 0
  })
  if (r.light.isSpotLight) {
    pk.dir.copy(r.light.target.position).sub(r.light.position).normalize()
    pk.cos = Math.cos(r.light.angle)
  }
  // 파티클 셰이더는 광원 세기를 그대로 받아 역제곱으로 감쇠시킨다. 강한 스팟(수백 cd)을
  // 그대로 넣으면 모티 하나가 HDR 1.05(블룸 임계)를 훌쩍 넘겨 DOF가 거대한 보케 삼각형으로 부풀린다.
  pk.power = r.light.intensity
  return pk
}

function findDepth () {
  const p = S.e.get('pipeline')
  const ctx = p?.ctx || p?.context
  const t = ctx?.targets?.normal?.texture
  return t || null
}

export default {
  name: 'atmosphere',
  order: 65,

  async init (engine) {
    S.e = engine
    S.baker = new IblBaker(engine.renderer)
    S.field = new ParticleField(engine.quality)
    engine.scene.add(S.field.group)
    S.rain = new RainField(engine.quality)
    engine.scene.add(S.rain.group)
    if (S.rig) engine.scene.add(S.rig.hemi)
    for (const r of S.queue) attach(r)
    S.queue.length = 0

    engine.bus.on('room:changed', ({ room }) => {
      const m = ROOM_MOOD[room]
      if (m && m !== S.mood) setMood(m)
    })
    engine.bus.on('interrogation:start', () => setMood('interrogation'))
    engine.bus.on('qa:state', (st) => {
      if (!st) return
      if (st.scene === 'atmo-probe') {
        if (!S.probe) S.probe = buildProbe(engine, practical)
        S.probe.visible = true
        S.groundY = OY
        // 리그를 먼저 세우고 setMood를 한 번만 돌린다 — 새 광원의 shaft에 바람·세기가 붙어야 한다
        S.probe.userData.setRig(MOODS[st.mood] ? st.mood : DEFAULT_MOOD)
      } else if (S.probe) {
        S.probe.visible = false
        S.probe.userData.setRig(null)
        S.groundY = 0
      }
      setMood(st.mood || S.mood)
    })

    setMood(S.mood)
    engine.renderer.getDrawingBufferSize(S.res)
  },

  update (dt, elapsed) {
    const e = S.e
    if (!e) return
    const t = e.time
    S.frame++

    const shaftScale = moodDef().shaftScale
    for (const r of S.pool) {
      if (r.light.visible) {
        const k = flicker(r.shape, t, r.seed, r.amt)
        if (Math.abs(k - r.k) > 0.002) {
          r.light.intensity = r.baseI * k
          if (r.fill) r.fill.intensity = r.fillBase * k
          if (r.up) r.up.intensity = r.upBase * k
          setFixtureGlow(r.fixture, r.col, r.hot, clamp(k, 0.02, 2))
          if (r.shaft) r.shaft.material.uniforms.uIntensity.value = r.shaftBase * shaftScale * k
          r.k = k
        }
      }
      if (r.shaft) r.shaft.material.uniforms.uTime.value = t
    }

    if (S.frame % 12 === 1) {
      cullLights()
      S.depth = findDepth()
      e.renderer.getDrawingBufferSize(S.res)
    }

    const packets = S.top.map(lightPacket)
    const fov = e.camera.fov * Math.PI / 180
    const pix = S.res.y / (2 * Math.tan(fov * 0.5))
    S.field.update(t, e.camera, packets, S.depth, S.res, pix, e.size?.dpr ?? 2)
    S.rain.update(t, e.camera, packets, S.depth, S.res, pix)
    for (const r of S.pool) {
      if (!r.shaft) continue
      const u = r.shaft.material.uniforms
      u.uSceneDepth.value = S.depth
      u.uSoft.value = S.depth ? 1 : 0
      u.uResolution.value.copy(S.res)
      // 셸이 차폐를 무시하면 문틀·카트를 통과한 원뿔이 그대로 그려져 "화면에 얹은 필터"가 된다.
      // 볼류메트릭 패스와 같은 섀도맵을 물려 오클루더 형상의 노치를 새긴다(G2).
      const sm = r.light.castShadow ? r.light.shadow?.map?.texture : null
      u.uShadowOn.value = sm ? 1 : 0
      if (sm) {
        u.uShadowMap.value = sm
        u.uShadowMat.value.copy(r.light.shadow.matrix)
        u.uShadowBias.value = -Math.abs(r.light.shadow.bias ?? 0) - 0.0009
      }
    }
    if (S.atmo) S.atmo.time = t
  },

  resize (w, h) {
    if (S.e) S.e.renderer.getDrawingBufferSize(S.res)
  },

  dispose () {
    S.baker?.dispose()
    S.field?.dispose()
    S.rain?.dispose()
    S.pool.length = 0
  }
}

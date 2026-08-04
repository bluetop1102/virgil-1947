// 볼류메트릭 안개·광축. 하프 해상도 레이마치 + 광원별 섀도맵 샘플링.
// 이 게임의 최대 승부처(루브릭 G2/D8): 균일 안개 오버레이가 아니라 광축 안의 밀도차,
// 복도 끝의 소멸, 광축 안에서만 반짝이는 먼지가 나와야 한다.
//
// 섀도맵 규약: engine.js 가 VSMShadowMap 을 쓴다 → shadow.map 은 RG16F(mean, stdDev)이고
// three 의 getShadow(VSM)와 동일한 체비쇼프 상한을 그대로 재현한다. PointLight 는 three r185 에서
// VSM 을 지원하지 않아 섀도맵이 없다 → 그림자 없는 산란만 기여한다.
import * as THREE from 'three'
import { noiseTexture } from './volnoise.js'
import { VERT, DEPTH_HEAD, marchShader } from './volmarch.js'

const TEMPORAL = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur, uHist, uVel;
uniform float uFeedback;
void main () {
  vec4 c = texture2D(uCur, vUv);
  vec2 vel = texture2D(uVel, vUv).xy;
  vec2 puv = vUv - vel * 0.5;
  vec4 h = texture2D(uHist, puv);
  float ok = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  ok *= step(0.0001, h.a);
  gl_FragColor = mix(c, mix(h, c, 1.0 - uFeedback), ok);
}`

const UPSAMPLE = DEPTH_HEAD + `
uniform sampler2D uSrc, uLowDepth;
uniform vec2 uTexel;
void main () {
  float d = -vposAt(vUv, texture2D(uDepth, vUv).x).z;
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = vUv + vec2(float(x), float(y)) * uTexel;
      float sd = texture2D(uLowDepth, uv).x;
      float w = 1.0 / (0.08 + abs(sd - d) * 3.0);
      sum += texture2D(uSrc, uv) * w;
      wsum += w;
    }
  }
  gl_FragColor = sum / max(wsum, 1e-4);
}`

// 하프 해상도 선형 깊이 캐시 — 업샘플의 바이래터럴 가중에 쓴다
const LOWDEPTH = DEPTH_HEAD + `
void main () { gl_FragColor = vec4(-vposAt(vUv, texture2D(uDepth, vUv).x).z); }`

function rt (w, h) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    format: THREE.RGBAFormat, type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: false
  })
  t.texture.colorSpace = THREE.NoColorSpace
  return t
}

class Quad {
  constructor () {
    this.scene = new THREE.Scene()
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }
  draw (r, mat, target) {
    this.mesh.material = mat
    const auto = r.autoClear
    r.autoClear = false
    r.setRenderTarget(target ?? null)
    r.render(this.scene, this.cam)
    r.autoClear = auto
  }
}


function shader (frag, defines) {
  return new THREE.ShaderMaterial({
    defines: defines ?? {}, vertexShader: VERT, fragmentShader: frag,
    depthTest: false, depthWrite: false, uniforms: {}
  })
}

export default class Volumetric {
  async init (ctx) {
    const q = ctx.quality ?? {}
    const look = ctx.look ?? {}
    this.enabled = q.volumetric !== false
    this.steps = Math.max(8, q.volSteps ?? 32)
    // 스텝당 광원 평가 비용이 지배적이라 마치에 들어가는 광원은 상위 4개로 제한한다.
    // 나머지는 산란 기여가 무시 가능한 순위(그림자 유무 → 세기/거리)로 밀린다.
    this.maxLights = Math.max(1, Math.min(q.maxLights ?? 8, 4))
    this.quad = new Quad()
    this.n3 = noiseTexture(32, 0x5ec11)
    this.key = ''
    this.flip = 0
    this.w = 0; this.h = 0
    this.lights = []
    this.mMarch = null
    this._v = new THREE.Vector3()
    this._t = new THREE.Vector3()

    const fog = look.fogColor ?? [0.03, 0.038, 0.05]
    this.fogColor = new THREE.Color(fog[0], fog[1], fog[2])
    const dens = look.fogDensity ?? 0.022
    const inten = look.volumetricIntensity ?? 1.0
    this.params = {
      density: 1.0,
      extinct: dens * 1.7,
      scatter: dens * 2.2 * inten,
      g: 0.62,
      ambient: 0.55,
      fogY: 0.0,
      fogFall: 0.24,
      nScale: 0.085,
      spark: 3.2,
      sparkScale: 1.35,
      // 배광 지수. 13 은 콘 게이트를 살짝 좁힐 뿐이라 스팟의 넓은 원뿔이 그대로 공기를 덮어
      // "광축"이 아니라 화면 절반을 채우는 헤이즈가 된다(실측: 광축 코어/광축 밖 기여비 0.4:1).
      // 70 이면 반각 약 10° 로 좁혀져 같은 산란 총량이 축상에 모이고, 코어/밖 비가 28:1 이 된다.
      beam: 70.0,
      rim: 0.28,
      // 이미터 유한 반경². 근접 1/d² 특이점 제거용 — 아래 uSrcR2 주석 참조.
      srcR2: 0.20,
      // 광축 내부 밀도 얼룩(산란 항 전용). 무드가 밀어 넣지 않는 패스 상수다 —
      // 이 값은 "빔이 판때기로 보이는가"를 정하는 것이라 공간마다 달라질 이유가 없다.
      // wispScale 0.55 는 약 1.8m 특징 크기다. 빔을 가로지르는 경로가 1~2m 라 한 광선이
      // 얼룩 하나만 통과해 분산이 살아남는다. 더 잘게 쪼개면 경로 평균으로 다시 뭉개진다.
      wisp: 0.7,
      wispScale: 0.55,
      // 셰이드 개구 요철이 배광 각도 θ 에 주는 상대 진폭. aperture() 가 ±0.25 라 1.6 이면
      // θ 가 최대 ±40% 흔들린다 — 반각 9.7° 기준 ±3.9°. 예전 값 1.1 은 세기에 곱하는
      // 방식이었고, 지수 70 앞에서 각도로 환산하면 ±0.5° 라 화면에서 3px 였다(실측:
      // 진폭을 ±0.3 까지 올려도 반치점 직선 잔차가 안 줄었다). 6.0 은 빔이 아니라
      // 원경을 덮는 우유빛 베일이 된다(실측: 콘 박스 +13, 원경 벽이 통째로 들뜬다).
      beamWarp: 1.6,
      // 경계 소프트닝이 포화하는 거리의 역수. 2.5m 밖에서 섭동이 최대가 된다 — 기구
      // 개구부 바로 아래는 경계가 서고 멀어질수록 반그림자가 넓어진다.
      edgeSoft: 1 / 2.5,
      // 안개 시작 거리를 maxDist 의 비율로 잡는다. 절대값으로 박으면 욕실·심문실처럼
      // 방이 작은 무드에서 방 전체가 페이드 구간에 들어가 볼류메트릭이 통째로 죽는다.
      nearFadeK: [0.11, 0.32],
      maxDist: 58
    }

    this.mTemporal = shader(TEMPORAL)
    this.mTemporal.uniforms = {
      uCur: { value: null }, uHist: { value: null }, uVel: { value: null }, uFeedback: { value: 0.84 }
    }
    this.mLow = shader(LOWDEPTH)
    this.mLow.uniforms = { uDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() } }
    this.mUp = shader(UPSAMPLE)
    this.mUp.uniforms = {
      uSrc: { value: null }, uLowDepth: { value: null }, uDepth: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }
    }
  }

  setSize (w, h, ctx) { this._alloc(w, h) }

  _alloc (w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1)
    if (this.w === hw && this.h === hh) return
    this.w = hw; this.h = hh
    for (const t of [this.raw, this.hist0, this.hist1, this.low]) t?.dispose()
    this.raw = rt(hw, hh)
    this.hist0 = rt(hw, hh)
    this.hist1 = rt(hw, hh)
    this.low = rt(hw, hh)
  }

  // 산란 기여가 큰 순으로 상위 N개. 그림자 유무는 가산점일 뿐이다 — 예전엔 usable 에 1e6 을
  // 얹어서 정렬이 사실상 "그림자맵 있는 아무 광원"이 됐고, 그래서 프로브(y=-500) 밖 500m 거리의
  // 테스트베드 키/림 라이트가 4슬롯 중 2개를 먹고 정작 복도 벽등이 밀려났다.
  _collect (ctx) {
    const cam = ctx.camera.position
    const found = []
    // 기여 하한. 인스캐터는 대략 (inten/d²)·σs·phase·경로길이 라서 σs≈0.02, phase≈0.02,
    // 1m 경로면 이 값의 4e-4 배다. 1e-3 미만이면 HDR 1e-7 이하 — 노출을 20배로 올려도 안 보인다.
    const FLOOR = 1e-3
    ctx.scene.traverse(o => {
      if (!o.isLight || !o.visible) return
      if (o.isAmbientLight || o.isHemisphereLight || o.isRectAreaLight || o.isLightProbe) return
      // 바운스 흉내용 보조광(`.fill` / `.up`)은 공기에 실체가 없다. 마치에 넣으면 두 가지를
      // 동시에 잃는다 — (1) 광원 없는 방향의 공기가 균일하게 들뜨는 베일이 되고(G2 6점),
      // (2) 슬롯이 4개뿐이라 화면에 몸통이 보이는 천장 형광등이 밀려나 정작 그 기구의
      // 광축이 안 나온다(실측: 복도 마치 광원 4개가 sconce 3 + sconce.up 1 이었다).
      if (o.userData.aux || /\.(fill|up)$/.test(o.name)) return
      const inten = (o.intensity ?? 0) * (o.isDirectionalLight ? 40 : 1)
      if (inten <= 0) return
      this._v.setFromMatrixPosition(o.matrixWorld)
      let score = inten
      if (!o.isDirectionalLight) {
        const d = this._v.distanceTo(cam)
        // 사거리가 마치 구간에 닿지 않으면 기여는 정확히 0이다(three 의 range 컷오프와 동일)
        const range = o.distance ?? 0
        if (range > 0 && d > range + this.params.maxDist) return
        score = inten / Math.max(1, d * d)
      }
      if (score < FLOOR) return
      const map = o.shadow?.map?.texture
      const usable = !!map && map.isCubeTexture !== true
      // 그림자 없는 광원은 벽 뒤에서도 안개를 밝히므로, 점수가 비슷하면 그림자 있는 쪽을 쓴다.
      // 직전 선택분에 가산점을 준다 — 백열 플리커가 ±5% 라 점수가 붙어 있는 두 광원이
      // 8프레임마다 자리를 바꾸고, 그때마다 광축 하나가 통째로 켜졌다 꺼진다.
      const keep = this._sel?.has(o) ? 1.35 : 1
      found.push({ light: o, score: score * (usable ? 1.6 : 1) * keep, usable })
    })
    found.sort((a, b) => b.score - a.score)
    const out = []
    let sIdx = 0
    this._sel = new Set(found.slice(0, this.maxLights).map(f => f.light))
    for (const f of found.slice(0, this.maxLights)) {
      const o = f.light
      const type = o.isDirectionalLight ? 0 : (o.isSpotLight ? 1 : 2)
      const rec = { obj: o, type, shadowIdx: f.usable ? sIdx++ : -1 }
      out.push(rec)
    }
    return out
  }

  _build (ctx, lights) {
    const nS = lights.filter(l => l.shadowIdx >= 0).length
    const key = lights.map(l => `${l.type}${l.shadowIdx}`).join(',') + '|' + this.steps
    if (key === this.key && this.mMarch) return
    this.key = key
    this.mMarch?.dispose()
    const m = shader(marchShader(lights, nS), { STEPS: this.steps })
    const n = lights.length
    m.uniforms = {
      uDepth: { value: null }, uNoise: { value: null }, uN3: { value: this.n3 },
      uInvProj: { value: new THREE.Matrix4() }, uInvView: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uFogColor: { value: this.fogColor },
      uTime: { value: 0 }, uFrame: { value: 0 }, uHasNoise: { value: 0 },
      uMaxDist: { value: this.params.maxDist }, uDensity: { value: this.params.density },
      uScatter: { value: this.params.scatter }, uExtinct: { value: this.params.extinct },
      uG: { value: this.params.g }, uAmbient: { value: this.params.ambient },
      uFogY: { value: this.params.fogY }, uFogFall: { value: this.params.fogFall },
      uNScale: { value: this.params.nScale }, uSpark: { value: this.params.spark },
      uSparkScale: { value: this.params.sparkScale }, uFar: { value: ctx.camera.far },
      uBeam: { value: this.params.beam }, uRim: { value: this.params.rim },
      uSrcR2: { value: this.params.srcR2 },
      uWisp: { value: this.params.wisp }, uWispScale: { value: this.params.wispScale },
      uBeamWarp: { value: this.params.beamWarp },
      uEdgeSoft: { value: this.params.edgeSoft },
      uNearFade: { value: new THREE.Vector2() }
    }
    if (n > 0) {
      m.uniforms.uLPos = { value: Array.from({ length: n }, () => new THREE.Vector3()) }
      m.uniforms.uLDir = { value: Array.from({ length: n }, () => new THREE.Vector3(0, 1, 0)) }
      m.uniforms.uLCol = { value: Array.from({ length: n }, () => new THREE.Color()) }
      m.uniforms.uLParam = { value: Array.from({ length: n }, () => new THREE.Vector4()) }
      m.uniforms.uLParam2 = { value: Array.from({ length: n }, () => new THREE.Vector4()) }
    }
    if (nS > 0) {
      m.uniforms.uShadow = { value: new Array(nS).fill(null) }
      m.uniforms.uShadowMat = { value: Array.from({ length: nS }, () => new THREE.Matrix4()) }
    }
    this.mMarch = m
  }

  _upload (lights) {
    const u = this.mMarch.uniforms
    for (let i = 0; i < lights.length; i++) {
      const rec = lights[i]
      const o = rec.obj
      this._v.setFromMatrixPosition(o.matrixWorld)
      u.uLPos.value[i].copy(this._v)
      if (rec.type !== 2) {
        const tgt = o.target
        if (tgt) this._t.setFromMatrixPosition(tgt.matrixWorld); else this._t.set(this._v.x, this._v.y - 1, this._v.z)
        u.uLDir.value[i].copy(this._v).sub(this._t).normalize()
      }
      u.uLCol.value[i].copy(o.color).multiplyScalar(o.intensity)
      const range = rec.type === 0 ? 0 : (o.distance ?? 0)
      const decay = rec.type === 0 ? 0 : (o.decay ?? 2)
      const cosOuter = rec.type === 1 ? Math.cos(o.angle) : -1
      u.uLParam.value[i].set(rec.type, range, decay, cosOuter)
      const cosInner = rec.type === 1 ? Math.cos(o.angle * (1 - (o.penumbra ?? 0)) * 0.999) : 1
      const sh = o.shadow
      u.uLParam2.value[i].set(cosInner, rec.shadowIdx, sh ? -Math.abs(sh.bias ?? 0) - 0.0009 : 0, sh?.intensity ?? 1)
      if (rec.shadowIdx >= 0) {
        u.uShadow.value[rec.shadowIdx] = sh.map.texture
        u.uShadowMat.value[rec.shadowIdx].copy(sh.matrix)
      }
    }
  }

  render (ctx) {
    const out = ctx.targets?.vol
    if (!this.enabled || !out) return
    this._alloc(ctx.w, ctx.h)
    const r = ctx.renderer
    const depth = ctx.depthTexture ?? ctx.targets.hdr?.depthTexture
    if (!depth) return

    if ((ctx.frame ?? 0) % 8 === 0 || !this.mMarch) this.lights = this._collect(ctx)
    this._build(ctx, this.lights)
    if (this.lights.length > 0) this._upload(this.lights)

    const m = this.mMarch.uniforms
    m.uDepth.value = depth
    m.uNoise.value = ctx.blueNoise ?? null
    m.uHasNoise.value = ctx.blueNoise ? 1 : 0
    m.uInvProj.value.copy(ctx.matrices.invProj)
    m.uInvView.value.copy(ctx.matrices.invView)
    m.uCamPos.value.setFromMatrixPosition(ctx.camera.matrixWorld)
    m.uTime.value = ctx.engine?.time ?? 0
    m.uFrame.value = (ctx.frame ?? 0) % 64
    // atmosphere 는 uMaxDist 만 무드에서 밀어 넣는다. 안개 시작 거리는 그 비율로 따라가야
    // 무드마다 방 크기에 맞게 스케일한다 — 여기서 매 프레임 재계산하는 이유다.
    const md = m.uMaxDist.value
    m.uNearFade.value.set(md * this.params.nearFadeK[0], md * this.params.nearFadeK[1])
    this.quad.draw(r, this.mMarch, this.raw)

    let src = this.raw
    if (ctx.targets.velocity) {
      const cur = this.flip ? this.hist1 : this.hist0
      const prev = this.flip ? this.hist0 : this.hist1
      const t = this.mTemporal.uniforms
      t.uCur.value = this.raw.texture
      t.uHist.value = prev.texture
      t.uVel.value = ctx.targets.velocity.texture
      this.quad.draw(r, this.mTemporal, cur)
      this.flip ^= 1
      src = cur
    }

    const l = this.mLow.uniforms
    l.uDepth.value = depth
    l.uInvProj.value.copy(ctx.matrices.invProj)
    this.quad.draw(r, this.mLow, this.low)

    const u = this.mUp.uniforms
    u.uSrc.value = src.texture
    u.uLowDepth.value = this.low.texture
    u.uDepth.value = depth
    u.uInvProj.value.copy(ctx.matrices.invProj)
    u.uTexel.value.set(1 / this.w, 1 / this.h)
    this.quad.draw(r, this.mUp, out)
  }

  dispose () {
    for (const t of [this.raw, this.hist0, this.hist1, this.low]) t?.dispose()
    for (const m of [this.mMarch, this.mTemporal, this.mLow, this.mUp]) m?.dispose()
    this.n3?.dispose()
  }
}

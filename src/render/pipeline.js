// 포스트프로세스 그래프. 렌더 타깃·공유 컨텍스트·패스 실행 순서를 소유한다.
// 실행 순서: prepass → gtao → 씬 라이팅 → ssr → volumetric → bloom → dof → motionblur → taa → composite
// EFFECTS 패스(gtao/ssr/volumetric/bloom/dof/motionblur)는 파일이 있을 때만 인스턴스화한다.

import * as THREE from 'three'
import { blueNoiseTexture, goldenOffset, halton } from './bluenoise.js'
import Prepass from './passes/prepass.js'
import Taa from './passes/taa.js'
import Composite from './passes/composite.js'
import ContactAo from './contact.js'
import AutoExposure from './exposure.js'
import { installPcss } from './pcss.js'

// 셰이더 청크 교체는 어떤 프로그램도 빌드되기 전이어야 한다. main.js의 글롭이 render/*를
// 가장 먼저 로드하므로 모듈 최상단이 유일하게 안전한 시점이다.
installPcss()

const PASS_MODULES = import.meta.glob('./passes/*.js')

// [파일명, quality 플래그]
const EFFECT_CHAIN = [
  ['gtao', 'gtao'],
  ['ssr', 'ssr'],
  ['volumetric', 'volumetric'],
  ['bloom', 'bloom'],
  ['dof', 'dof'],
  ['motionblur', 'motionBlur']
]

const FS_VERT = /* glsl */`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

// 차폐를 씬 라이팅에 곱한다. 두 겹이다 — GTAO(넓은 반경, 공간의 굴곡)와 컨택트 AO(0.15m,
// 실루엣 직전 2~4px). 접지가 읽히려면 뒤쪽이 반드시 있어야 한다(루브릭 G4/D5).
// 단순 곱은 차폐부를 죽이므로 Jimenez 멀티바운스로 되살리되, 느와르 씬의 낮은 알베도를
// 가정해 되살림 폭을 줄인다. 알베도를 높이면 접촉부가 회색으로 떠오른다.
const AO_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tAo;
uniform sampler2D tContact;
uniform float uStrength;
uniform float uPow;
uniform float uHasGtao;
uniform float uHasContact;
void main () {
  float g = uHasGtao > 0.5 ? clamp( texture2D( tAo, vUv ).r, 0.0, 1.0 ) : 1.0;
  float c = uHasContact > 0.5 ? clamp( texture2D( tContact, vUv ).r, 0.0, 1.0 ) : 1.0;
  float v = clamp( pow( g, uPow ) * c, 0.0, 1.0 );
  const vec3 albedo = vec3( 0.20, 0.22, 0.26 );
  vec3 a =  2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c2 =  2.7552 * albedo + 0.6903;
  vec3 mb = max( vec3( v ), ( ( v * a + b ) * v + c2 ) * v );
  gl_FragColor = vec4( mix( vec3( 1.0 ), mb, uStrength ), 1.0 );
}
`

const SSR_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSsr;
void main () {
  vec4 s = texture2D( tSsr, vUv );
  gl_FragColor = vec4( s.rgb * clamp( s.a, 0.0, 1.0 ), 1.0 );
}
`

// vol.a는 투과율. 패스가 1.0을 쓰면 순수 가산, 1 미만이면 소멸까지 합성된다.
// 볼류메트릭은 하프 해상도 타깃에 쌓인다. 이걸 평범한 바이리니어로 올리면 깊이 불연속
// (문틀·카트 실루엣)에서 뒤쪽 안개가 앞쪽 오브젝트 위로 1~2px 새어 나온다.
// 그래서 4탭 중 풀해상도 깊이와 가장 가까운 탭에 가중을 몰아주는 nearest-depth 업샘플을 쓴다.
const VOL_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tVol;
uniform sampler2D tNormalDepth;
uniform vec2 uVolTexel;
uniform float uIntensity;
void main () {
  float d0 = texture2D( tNormalDepth, vUv ).a;
  vec4 sum = vec4( 0.0 );
  float wsum = 0.0;
  for ( int j = 0; j < 2; j ++ ) {
    for ( int i = 0; i < 2; i ++ ) {
      vec2 o = ( vec2( float( i ), float( j ) ) - 0.5 ) * uVolTexel;
      float dz = abs( texture2D( tNormalDepth, vUv + o ).a - d0 );
      float w = 1.0 / ( 0.02 + dz * dz * 40.0 );
      sum += texture2D( tVol, vUv + o ) * w;
      wsum += w;
    }
  }
  vec4 v = sum / wsum;
  gl_FragColor = vec4( v.rgb * uIntensity, clamp( v.a, 0.0, 1.0 ) );
}
`

function hdrTarget (w, h, depthBuffer = false) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer,
    stencilBuffer: false,
    generateMipmaps: false
  })
}

const pipeline = {
  name: 'pipeline',
  order: 100,
  ready: false,
  frame: 0,

  async init (engine) {
    this.engine = engine
    const renderer = engine.renderer
    this.renderer = renderer

    // AgX는 composite에서 직접 구현한다. 렌더러 톤매핑이 켜져 있으면 이중 적용된다.
    renderer.toneMapping = THREE.NoToneMapping
    renderer.autoClear = false
    // 프리패스가 그림자 맵을 한 번 더 굽는 것을 막는다. 메인 패스 직전에만 needsUpdate를 세운다.
    renderer.shadowMap.autoUpdate = false

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4)
    this.quad = new THREE.Mesh(geo, null)
    this.quad.frustumCulled = false
    this.quadScene = new THREE.Scene()
    this.quadScene.add(this.quad)
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    const w = Math.max(1, size.x | 0)
    const h = Math.max(1, size.y | 0)

    this.clearColor = new THREE.Color()
    this.tmpColor = new THREE.Color()
    this.noiseOffset = new THREE.Vector2()
    this.jitterSave = new Float64Array(2)

    const self = this
    this.ctx = {
      engine,
      renderer,
      scene: engine.scene,
      camera: engine.camera,
      w,
      h,
      targets: {},
      depthTexture: null,
      frame: 0,
      jitter: { x: 0, y: 0 },
      matrices: {
        proj: new THREE.Matrix4(),
        invProj: new THREE.Matrix4(),
        view: new THREE.Matrix4(),
        invView: new THREE.Matrix4(),
        viewProj: new THREE.Matrix4(),
        prevViewProj: new THREE.Matrix4()
      },
      quality: engine.quality,
      look: engine.look,
      blueNoise: blueNoiseTexture(64, 0x5EC17),
      fsq (material, target) { self.fsq(material, target) }
    }

    this.alloc(w, h)

    this.contact = new ContactAo()
    this.contact.init(this.ctx)
    this.expo = new AutoExposure()
    this.expo.init(this.ctx)
    engine.bus.on('qa:shot', () => this.expo.reset())

    this.aoApply = this.applyMaterial(AO_FRAG, {
      tAo: { value: this.ctx.targets.ao.texture },
      tContact: { value: this.contact.texture },
      uStrength: { value: 1.0 },
      uPow: { value: 1.7 },
      uHasGtao: { value: 0 },
      uHasContact: { value: 1 }
    }, THREE.DstColorFactor, THREE.ZeroFactor)
    this.ssrApply = this.applyMaterial(SSR_FRAG, { tSsr: { value: this.ctx.targets.ssr.texture } },
      THREE.OneFactor, THREE.OneFactor)
    this.volApply = this.applyMaterial(VOL_FRAG, {
      tVol: { value: this.ctx.targets.vol.texture },
      tNormalDepth: { value: this.ctx.targets.normal.texture },
      uVolTexel: { value: new THREE.Vector2() },
      uIntensity: { value: 1 }
    }, THREE.OneFactor, THREE.SrcAlphaFactor)
    this.volApply.uniforms.uVolTexel.value.set(2 / w, 2 / h)

    this.prepass = new Prepass()
    await this.prepass.init(this.ctx)
    this.taa = new Taa()
    await this.taa.init(this.ctx)
    this.ctx.targets.hdrPrev = this.taa.history()
    this.composite = new Composite()
    await this.composite.init(this.ctx)

    this.effects = {}
    for (const [file, flag] of EFFECT_CHAIN) {
      const loader = PASS_MODULES[`./passes/${file}.js`]
      if (!loader || engine.quality[flag] === false) continue
      try {
        const mod = await loader()
        const Ctor = mod && mod.default
        if (typeof Ctor !== 'function') continue
        const inst = new Ctor()
        if (inst.init) await inst.init(this.ctx)
        this.effects[file] = inst
      } catch (e) {
        console.error(`[pipeline] pass ${file}`, e)
      }
    }

    this.aoApply.uniforms.uHasGtao.value = this.effects.gtao ? 1 : 0
    this.ready = true
  },

  applyMaterial (fragmentShader, uniforms, blendSrc, blendDst) {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FS_VERT,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc,
      blendDst,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor
    })
  },

  alloc (w, h) {
    const t = this.ctx.targets
    const hw = Math.max(1, w >> 1)
    const hh = Math.max(1, h >> 1)

    t.hdr = hdrTarget(w, h, true)
    t.hdr.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType)
    const depth = t.hdr.depthTexture
    this.ctx.depthTexture = depth

    // 노멀+깊이(0), 속도(1), 러프니스(2)를 한 FBO에 붙인다. 프리패스가 씬을 한 번만 돈다.
    // 어태치먼트를 늘려도 드로우콜은 그대로다 — 러프니스를 위한 별도 패스는 금지다.
    t.normal = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
      count: 3
    })
    t.normal.textures[1].format = THREE.RGFormat
    t.normal.textures[1].type = THREE.HalfFloatType
    t.normal.textures[1].name = 'velocity'
    t.normal.textures[2].format = THREE.RedFormat
    t.normal.textures[2].type = THREE.UnsignedByteType
    t.normal.textures[2].name = 'roughness'
    // 계약상 velocity·roughness는 독립 타깃이다. 같은 FBO의 어태치먼트를 타깃 뷰로 노출한다.
    const velocity = Object.create(t.normal)
    Object.defineProperty(velocity, 'texture', { value: t.normal.textures[1], enumerable: true })
    t.velocity = velocity
    const roughness = Object.create(t.normal)
    Object.defineProperty(roughness, 'texture', { value: t.normal.textures[2], enumerable: true })
    t.roughness = roughness

    t.ao = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.UnsignedByteType,
      format: THREE.RedFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false
    })
    t.ssr = hdrTarget(w, h)
    t.vol = hdrTarget(hw, hh)
    t.bloom = hdrTarget(w, h)

    this.ctx.w = w
    this.ctx.h = h

    // 미기록 타깃을 샘플하는 패스가 있어도 쓰레기 값이 나오지 않도록 초기화한다.
    this.clearTarget(t.ao, 1, 1, 1, 1)
    this.clearTarget(t.ssr, 0, 0, 0, 0)
    this.clearTarget(t.vol, 0, 0, 0, 1)
    this.clearTarget(t.bloom, 0, 0, 0, 1)
    this.clearTarget(t.hdr, 0, 0, 0, 1)
    this.renderer.setRenderTarget(null)
  },

  clearTarget (target, r, g, b, a) {
    const renderer = this.renderer
    const prev = renderer.getClearColor(this.tmpColor).clone()
    const prevA = renderer.getClearAlpha()
    renderer.setRenderTarget(target)
    renderer.setClearColor(this.clearColor.setRGB(r, g, b), a)
    renderer.clear(true, true, false)
    renderer.setClearColor(prev, prevA)
  },

  freeTargets () {
    const t = this.ctx.targets
    for (const k of ['hdr', 'normal', 'ao', 'ssr', 'vol', 'bloom']) {
      if (t[k] && t[k].dispose) t[k].dispose()
    }
    if (t.hdr && t.hdr.depthTexture) t.hdr.depthTexture.dispose()
  },

  fsq (material, target) {
    const renderer = this.renderer
    material.depthTest = false
    material.depthWrite = false
    renderer.setRenderTarget(target || null)
    this.quad.material = material
    renderer.render(this.quadScene, this.fsCam)
  },

  resize (w, h) {
    if (!this.ready) return
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    const nw = Math.max(1, size.x | 0)
    const nh = Math.max(1, size.y | 0)
    if (nw === this.ctx.w && nh === this.ctx.h) return
    this.freeTargets()
    this.alloc(nw, nh)
    this.contact.setSize(nw, nh)
    this.aoApply.uniforms.tAo.value = this.ctx.targets.ao.texture
    this.aoApply.uniforms.tContact.value = this.contact.texture
    this.ssrApply.uniforms.tSsr.value = this.ctx.targets.ssr.texture
    this.volApply.uniforms.tVol.value = this.ctx.targets.vol.texture
    this.volApply.uniforms.tNormalDepth.value = this.ctx.targets.normal.texture
    this.volApply.uniforms.uVolTexel.value.set(2 / nw, 2 / nh)
    this.prepass.setSize(nw, nh, this.ctx)
    this.taa.setSize(nw, nh, this.ctx)
    this.composite.setSize(nw, nh, this.ctx)
    for (const k in this.effects) this.effects[k].setSize?.(nw, nh, this.ctx)
  },

  updateMatrices () {
    const { camera, matrices } = this.ctx
    camera.updateMatrixWorld()
    matrices.invView.copy(camera.matrixWorld)
    matrices.view.copy(camera.matrixWorld).invert()
    matrices.proj.copy(camera.projectionMatrix)
    matrices.invProj.copy(camera.projectionMatrixInverse)
    matrices.viewProj.multiplyMatrices(matrices.proj, matrices.view)
  },

  // Halton(2,3) 서브픽셀 지터. 정지 카메라에서 taaSamples 프레임이면 한 주기가 닫힌다.
  // ctx.matrices는 지터 이전 값을 유지한다 — 속도 버퍼와 TAA 리프로젝션이 지터를 이동으로 오인하면 안 된다.
  applyJitter () {
    const ctx = this.ctx
    const q = ctx.quality
    const e = ctx.camera.projectionMatrix.elements
    this.jitterSave[0] = e[8]
    this.jitterSave[1] = e[9]
    if (!q.taa) { ctx.jitter.x = 0; ctx.jitter.y = 0; return }
    const n = Math.max(1, q.taaSamples | 0)
    const i = (this.frame % n) + 1
    const jx = (halton(i, 2) - 0.5) * 2 / ctx.w
    const jy = (halton(i, 3) - 0.5) * 2 / ctx.h
    e[8] += jx
    e[9] += jy
    ctx.camera.projectionMatrixInverse.copy(ctx.camera.projectionMatrix).invert()
    ctx.jitter.x = jx
    ctx.jitter.y = jy
  },

  // 원복은 저장한 두 성분만 되돌린다. updateProjectionMatrix()로 되돌리면 시네마틱이
  // 직접 써넣은 커스텀 렌즈 행렬(시프트·아나모픽)까지 fov 기본값으로 날아간다.
  removeJitter () {
    const ctx = this.ctx
    const e = ctx.camera.projectionMatrix.elements
    e[8] = this.jitterSave[0]
    e[9] = this.jitterSave[1]
    ctx.camera.projectionMatrixInverse.copy(ctx.matrices.invProj)
  },

  // 프레임 상태 전진. order 100이라 카메라를 움직이는 모듈이 전부 끝난 뒤에 행렬이 굳는다.
  update () {
    if (!this.ready) return
    const ctx = this.ctx
    ctx.frame = ++this.frame
    ctx.matrices.prevViewProj.copy(ctx.matrices.viewProj)
    this.updateMatrices()
    goldenOffset(this.frame, this.noiseOffset)
    ctx.blueNoise.offset.copy(this.noiseOffset)
    ctx.targets.hdrPrev = this.taa.history()
  },

  render (dt) {
    const ctx = this.ctx
    if (!this.ready) {
      this.renderer.render(this.engine.scene, this.engine.camera)
      return
    }
    const { renderer, scene, camera, targets, look } = ctx
    const fx = this.effects

    this.applyJitter()

    this.prepass.render(ctx)
    if (fx.gtao) fx.gtao.render(ctx)
    this.contact.render(ctx)

    const prevClear = renderer.getClearColor(this.tmpColor).clone()
    const prevAlpha = renderer.getClearAlpha()
    renderer.setRenderTarget(targets.hdr)
    renderer.setClearColor(this.clearColor.setRGB(0, 0, 0), 1)
    renderer.clear(true, true, false)
    renderer.setClearColor(prevClear, prevAlpha)
    renderer.shadowMap.needsUpdate = true
    renderer.render(scene, camera)

    this.aoApply.uniforms.tContact.value = this.contact.texture
    this.fsq(this.aoApply, targets.hdr)
    if (fx.ssr) { fx.ssr.render(ctx); this.fsq(this.ssrApply, targets.hdr) }
    if (fx.volumetric) {
      fx.volumetric.render(ctx)
      this.volApply.uniforms.uIntensity.value = look.volumetricIntensity ?? 1
      this.fsq(this.volApply, targets.hdr)
    }
    if (fx.bloom) fx.bloom.render(ctx)
    if (fx.dof) fx.dof.render(ctx)
    if (fx.motionblur) fx.motionblur.render(ctx)

    this.taa.render(ctx)

    this.composite.src = this.taa.output.texture
    this.composite.bloomTex = fx.bloom ? targets.bloom.texture : null
    // 노출은 톤매퍼 바로 앞에서 결정한다. 계측 대상은 composite가 실제로 읽는 텍스처와 같아야
    // 하고, 계측값 자체는 노출 이전 값이라 되먹임 진동이 생기지 않는다.
    this.composite.exposure = this.expo.measure(ctx, this.composite.src, dt || 1 / 60) * (look.exposure ?? 1)
    this.composite.render(ctx)

    this.removeJitter()
    renderer.setRenderTarget(null)
  },

  dispose () {
    if (!this.ready) return
    this.freeTargets()
    this.prepass.dispose?.()
    this.taa.dispose?.()
    this.composite.dispose?.()
    this.contact.dispose()
    this.expo.dispose()
    for (const k in this.effects) this.effects[k].dispose?.()
    this.aoApply.dispose()
    this.ssrApply.dispose()
    this.volApply.dispose()
    this.ctx.blueNoise.dispose()
    this.quad.geometry.dispose()
    this.ready = false
  }
}

export default pipeline

// SSR — 뷰스페이스 레이마치 + 이진 정제, 러프니스 인지 콘 트레이싱.
// hdr 을 밉 체인이 있는 하프 해상도 사본으로 뜬 뒤 러프니스·거리로 lod 를 골라 흐린 반사를 얻는다.
// 결과 ctx.targets.ssr — rgb=반사색, a=신뢰도(프레넬·반사율 포함). 루브릭 G5.
import * as THREE from 'three'

const VERT = `
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const HEAD = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
vec3 vpos (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return c.xyz / c.w;
}`

// 파이어플라이를 눌러 밉 체인이 번지지 않게 한다 (Karis 톤 가중 평균의 단일 탭 근사).
const COPY = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform float uClamp;
void main () {
  vec3 c = texture2D(uSrc, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * (uClamp / max(uClamp, l)), 1.0);
}`

const MARCH = HEAD + `
uniform sampler2D uNormal, uRough, uChain, uNoise;
uniform mat4 uProj, uInvView;
uniform float uFrame, uHasNoise, uMaxDist, uThick, uStrength, uLodScale, uMaxLod, uFar;
uniform float uRoughCut, uRoughBand, uRoughLod, uRoughFloor;

float blue (float o) {
  vec2 fc = gl_FragCoord.xy + o * 23.0;
  float n = uHasNoise > 0.5
    ? texture2D(uNoise, fract(fc / 64.0)).x
    : fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
  return fract(n + uFrame * 0.61803399);
}

void main () {
  vec3 P = vpos(vUv);
  float d = -P.z;
  vec3 N = texture2D(uNormal, vUv).xyz;
  float nl = length(N);
  if (d <= 0.0 || d >= uFar * 0.98 || nl < 0.2) { gl_FragColor = vec4(0.0); return; }
  N /= nl;
  vec3 V = normalize(P);
  vec3 R = reflect(V, N);

  // 프리패스가 어태치먼트 2에 실효 러프니스를 굽는다(클리어코트는 코트 롭으로 mix된 값). 그걸 그대로 쓴다.
  // 노멀 방향 추정을 쓰던 시절엔 카펫이 수평면이라는 이유만으로 rough 0.07 = 거울로 취급됐다.
  vec3 wn = normalize((uInvView * vec4(N, 0.0)).xyz);
  float up = clamp(wn.y, 0.0, 1.0);
  float rough = clamp(texture2D(uRough, vUv).x, 0.0, 1.0);

  // 러프니스 마스크. 컷오프를 넘으면 반사 강도를 uRoughFloor 까지 떨어뜨리고 밉을 강제로 올린다.
  float rm = smoothstep(uRoughCut, uRoughCut + uRoughBand, rough);
  float cosV = clamp(dot(-V, N), 0.0, 1.0);
  float f0 = mix(0.04, 0.10, up);
  float fres = f0 + (1.0 - f0) * pow(1.0 - cosV, 5.0);
  float refl = fres * (1.0 - rough * 0.85) * mix(1.0, uRoughFloor, rm) * uStrength;
  if (refl < 0.002) { gl_FragColor = vec4(0.0); return; }

  float jit = blue(0.0);
  vec3 P0 = P + N * (0.02 + 0.006 * d);
  float hitT = -1.0, prevT = 0.0;
  vec2 hitUv = vec2(0.0);
  float edge = 1.0;

  for (int i = 1; i <= STEPS; i++) {
    float t = (float(i) - 1.0 + jit) / float(STEPS);
    float dist = uMaxDist * t * t + 0.02;
    vec3 rp = P0 + R * dist;
    if (rp.z > -0.02) break;                     // 카메라 뒤로 나간 레이
    vec4 c = uProj * vec4(rp, 1.0);
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) { edge = 0.0; break; }
    float sceneZ = -vpos(suv).z;
    float diff = -rp.z - sceneZ;
    if (diff > 0.0 && diff < uThick + sceneZ * 0.035) { hitT = dist; hitUv = suv; break; }
    prevT = dist;
  }

  if (hitT < 0.0) { gl_FragColor = vec4(0.0); return; }

  float lo = prevT, hi = hitT;
  for (int k = 0; k < 5; k++) {
    float mid = (lo + hi) * 0.5;
    vec3 rp = P0 + R * mid;
    vec4 c = uProj * vec4(rp, 1.0);
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    float sceneZ = -vpos(suv).z;
    if (-rp.z - sceneZ > 0.0) { hi = mid; hitUv = suv; } else lo = mid;
  }
  hitT = hi;

  vec3 hn = texture2D(uNormal, hitUv).xyz;
  if (length(hn) > 0.2 && dot(normalize(hn), R) > 0.05) { gl_FragColor = vec4(0.0); return; }

  // 러프니스·이동거리로 콘 각을 정하고 밉 체인에서 흐린 반사를 뽑는다.
  // 컷오프를 넘는 면은 uRoughLod 만큼 밉을 더 올려 형상이 판독되지 않게 뭉갠다.
  float lod = clamp(log2(1.0 + rough * rough * hitT * uLodScale) + rm * uRoughLod, 0.0, uMaxLod);
  vec3 col = textureLod(uChain, hitUv, lod).rgb;

  vec2 e = smoothstep(vec2(0.0), vec2(0.14), hitUv) * (1.0 - smoothstep(vec2(0.86), vec2(1.0), hitUv));
  float conf = edge * e.x * e.y;
  conf *= 1.0 - smoothstep(0.55, 1.0, dot(R, -V));      // 카메라로 되돌아오는 레이는 신뢰 불가
  conf *= 1.0 - smoothstep(uMaxDist * 0.55, uMaxDist, hitT);
  gl_FragColor = vec4(col, clamp(conf * refl, 0.0, 1.0));
}`

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
  gl_FragColor = mix(c, mix(h, c, 1.0 - uFeedback), ok);
}`

const UPSAMPLE = HEAD + `
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main () {
  float d = -vpos(vUv).z;
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = vUv + vec2(float(x), float(y)) * uTexel;
      vec4 s = texture2D(uSrc, uv);
      float sd = -vpos(uv).z;
      float w = 1.0 / (0.05 + abs(sd - d) * 4.0);
      sum += s * w; wsum += w;
    }
  }
  gl_FragColor = sum / max(wsum, 1e-4);
}`

function rt (w, h, mips) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    format: THREE.RGBAFormat, type: THREE.HalfFloatType,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: !!mips
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

export default class Ssr {
  async init (ctx) {
    const q = ctx.quality ?? {}
    this.enabled = q.ssr !== false && (q.ssrSteps ?? 0) > 0
    this.steps = Math.max(8, q.ssrSteps ?? 24)
    this.quad = new Quad()
    this.flip = 0
    this.w = 0; this.h = 0
    this.cleared = false

    this.mCopy = shader(COPY)
    this.mCopy.uniforms = { uSrc: { value: null }, uClamp: { value: 8.0 } }
    this.mZero = shader('precision highp float;\nvoid main () { gl_FragColor = vec4(0.0); }')

    this.mMarch = shader(MARCH, { STEPS: this.steps })
    this.mMarch.uniforms = {
      uDepth: { value: null }, uNormal: { value: null }, uRough: { value: null },
      uChain: { value: null }, uNoise: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() },
      uInvView: { value: new THREE.Matrix4() }, uNoiseScale: { value: new THREE.Vector2(1, 1) },
      uFrame: { value: 0 }, uHasNoise: { value: 0 }, uMaxDist: { value: 16 }, uThick: { value: 0.35 },
      uStrength: { value: 1.0 }, uLodScale: { value: 2.2 }, uMaxLod: { value: 5 }, uFar: { value: 100 },
      uRoughCut: { value: 0.40 }, uRoughBand: { value: 0.20 },
      uRoughLod: { value: 4.0 }, uRoughFloor: { value: 0.09 }
    }
    this.mTemporal = shader(TEMPORAL)
    this.mTemporal.uniforms = {
      uCur: { value: null }, uHist: { value: null }, uVel: { value: null }, uFeedback: { value: 0.82 }
    }
    this.mUp = shader(UPSAMPLE)
    this.mUp.uniforms = {
      uSrc: { value: null }, uLow: { value: null }, uDepth: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }
    }
  }

  setSize (w, h, ctx) { this._alloc(w, h) }

  _alloc (w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1)
    if (this.w === hw && this.h === hh) return
    this.w = hw; this.h = hh
    for (const t of [this.chain, this.raw, this.hist0, this.hist1]) t?.dispose()
    this.chain = rt(hw, hh, true)
    this.raw = rt(hw, hh)
    this.hist0 = rt(hw, hh)
    this.hist1 = rt(hw, hh)
    this.mMarch.uniforms.uMaxLod.value = Math.max(0, Math.floor(Math.log2(Math.max(hw, hh))) - 2)
  }

  render (ctx) {
    const out = ctx.targets?.ssr
    // 러프니스가 없으면 샘플이 0(=완전 거울)로 읽혀 화면 전체가 반사판이 된다. 그럴 바엔 끈다.
    if (!out || !ctx.targets.normal || !ctx.targets.roughness || !ctx.targets.hdr) return
    const r = ctx.renderer
    if (!this.enabled) {
      // 프리셋에서 꺼져 있으면 잔상이 남지 않도록 한 번 비운다
      if (!this.cleared) { this.quad.draw(r, this.mZero, out); this.cleared = true }
      return
    }
    this._alloc(ctx.w, ctx.h)

    this.mCopy.uniforms.uSrc.value = ctx.targets.hdr.texture
    this.quad.draw(r, this.mCopy, this.chain)

    const m = this.mMarch.uniforms
    m.uDepth.value = ctx.depthTexture ?? ctx.targets.hdr.depthTexture
    m.uNormal.value = ctx.targets.normal.texture
    m.uRough.value = ctx.targets.roughness?.texture ?? null
    m.uChain.value = this.chain.texture
    m.uNoise.value = ctx.blueNoise ?? null
    m.uHasNoise.value = ctx.blueNoise ? 1 : 0
    m.uInvProj.value.copy(ctx.matrices.invProj)
    m.uProj.value.copy(ctx.matrices.proj)
    m.uInvView.value.copy(ctx.matrices.invView)
    m.uFrame.value = (ctx.frame ?? 0) % 64
    m.uFar.value = ctx.camera.far
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

    const u = this.mUp.uniforms
    u.uSrc.value = src.texture
    u.uDepth.value = m.uDepth.value
    u.uInvProj.value.copy(ctx.matrices.invProj)
    u.uTexel.value.set(1 / this.w, 1 / this.h)
    this.quad.draw(r, this.mUp, out)
  }

  dispose () {
    for (const t of [this.chain, this.raw, this.hist0, this.hist1]) t?.dispose()
    for (const m of [this.mCopy, this.mZero, this.mMarch, this.mTemporal, this.mUp]) m?.dispose()
  }
}

// 속도 기반 모션블러 — 타일맥스/네이버맥스 후 McGuire(2012) 재구성 필터.
// 셔터 180도 기준(노출 = 프레임의 절반). TAA 이전에 적용된다는 전제로 hdr 에 되쓴다.
import * as THREE from 'three'

const VERT = `
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 속도(NDC) → uv 변위는 0.5배. 셔터 각도를 곱해 노출 구간만 남긴다.
const TILE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uShutter;
void main () {
  vec2 best = vec2(0.0);
  float bl = 0.0;
  for (int y = 0; y < TILE; y++) {
    for (int x = 0; x < TILE; x++) {
      vec2 o = (vec2(float(x), float(y)) - float(TILE) * 0.5 + 0.5) * uTexel;
      vec2 v = texture2D(uVel, vUv + o).xy * 0.5 * uShutter;
      float l = dot(v, v);
      if (l > bl) { bl = l; best = v; }
    }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`

const NEIGHBOR = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTile;
uniform vec2 uTexel;
void main () {
  vec2 best = vec2(0.0);
  float bl = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 v = texture2D(uTile, vUv + vec2(float(x), float(y)) * uTexel).xy;
      float l = dot(v, v);
      if (l > bl) { bl = l; best = v; }
    }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`

const BLUR = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc, uVel, uNeighbor, uDepth, uNoise;
uniform mat4 uInvProj;
uniform vec2 uRes;
uniform float uShutter, uFrame, uHasNoise, uMaxLen, uRollMin, uRollLo;

// HDR 하프플로트 오버플로 방어. 재구성 필터의 가중 w 는 0 이 될 수 있어 Inf*0 = NaN 이 되고,
// 이 패스는 결과를 hdr 에 되쓰므로 그 NaN이 TAA 히스토리로 넘어가 영구화된다(ssr 과 같은 기전).
vec3 fin (vec3 c) { return (c.r + c.g + c.b < 3.0e38) ? max(c, vec3(0.0)) : vec3(0.0); }
float lin (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return -(c.z / c.w);
}
float blue () {
  vec2 fc = gl_FragCoord.xy;
  float n = uHasNoise > 0.5
    ? texture2D(uNoise, fract(fc / 64.0)).x
    : fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
  return fract(n + uFrame * 0.61803399);
}
float cone (float d, float v) { return clamp(1.0 - d / max(v, 1e-4), 0.0, 1.0); }
float cyl (float d, float v) { return 1.0 - smoothstep(0.95 * v, 1.05 * v, d); }
float softZ (float za, float zb) { return clamp(1.0 - 2.0 * (za - zb) / max(min(za, zb), 1e-3), 0.0, 1.0); }

void main () {
  vec3 c0 = fin(texture2D(uSrc, vUv).rgb);
  vec2 vn = texture2D(uNeighbor, vUv).xy;
  float lnp = length(vn * uRes);
  if (lnp < 0.8) { gl_FragColor = vec4(c0, 1.0); return; }
  if (lnp > uMaxLen) { vn *= uMaxLen / lnp; lnp = uMaxLen; }

  // 셔터 롤오프. 180도 고정은 인트로 트래킹처럼 화면이 통째로 흐르는 구간에서 형체를 뭉개
  // "필터/결함"으로 읽힌다(G8, 리뷰 15-cin-t14.jpg). 실제 촬영도 빠른 팬에서는 셔터를 닫는다.
  // 느린 이동(uRollLo 미만)에서는 정확히 1.0 이라 걷는 속도의 블러는 그대로 남는다.
  float roll = mix(1.0, uRollMin, smoothstep(uRollLo, uMaxLen, lnp));
  vn *= roll;
  lnp *= roll;

  vec2 vc = texture2D(uVel, vUv).xy * 0.5 * uShutter * roll;
  float lcp = max(length(vc * uRes), 0.5);
  float z0 = lin(vUv);
  float jit = blue() - 0.5;

  vec3 sum = c0 * (1.0 / max(lcp, 1.0));
  float wsum = 1.0 / max(lcp, 1.0);

  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) + 0.5 + jit) / float(TAPS) - 0.5;
    vec2 uv = vUv + vn * t;
    float d = abs(t) * lnp;
    float zs = lin(uv);
    vec2 vs = texture2D(uVel, uv).xy * 0.5 * uShutter * roll;
    float lsp = max(length(vs * uRes), 0.5);
    float fg = softZ(z0, zs);            // 탭이 앞에 있음 → 탭의 속도로 번짐
    float bg = softZ(zs, z0);            // 탭이 뒤에 있음 → 중앙 속도로 번짐
    float w = fg * cone(d, lsp) + bg * cone(d, lcp) + cyl(d, lsp) * cyl(d, lcp) * 2.0;
    sum += fin(texture2D(uSrc, uv).rgb) * w;
    wsum += w;
  }
  gl_FragColor = vec4(sum / max(wsum, 1e-4), 1.0);
}`

const BLIT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
void main () { gl_FragColor = texture2D(uSrc, vUv); }`

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

export default class MotionBlur {
  async init (ctx) {
    const q = ctx.quality ?? {}
    this.enabled = q.motionBlur !== false
    this.tile = 8
    // 18탭. 10탭에서는 인트로 트래킹의 긴 궤적이 이산 사본으로 갈라져 인형 셔츠·엘리베이터
    // 아치에 계단 띠가 생겼다(t=14 프레임 실측). 프리셋 medium·low 는 motionBlur=false 라
    // 이 비용은 cinematic·high 에만 든다.
    this.taps = 18
    this.quad = new Quad()
    this.w = 0; this.h = 0

    this.mTile = shader(TILE, { TILE: this.tile })
    this.mTile.uniforms = {
      uVel: { value: null }, uTexel: { value: new THREE.Vector2() }, uShutter: { value: 0.5 }
    }
    this.mNeighbor = shader(NEIGHBOR)
    this.mNeighbor.uniforms = { uTile: { value: null }, uTexel: { value: new THREE.Vector2() } }
    this.mBlur = shader(BLUR, { TAPS: this.taps })
    this.mBlur.uniforms = {
      uSrc: { value: null }, uVel: { value: null }, uNeighbor: { value: null },
      uDepth: { value: null }, uNoise: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() },
      uShutter: { value: 0.5 }, uFrame: { value: 0 }, uHasNoise: { value: 0 }, uMaxLen: { value: 90 },
      // 롤오프 하한(=최소 셔터 배수)과 시작 길이. 0.30 은 180도 → 54도다.
      uRollMin: { value: 0.30 }, uRollLo: { value: 24 }
    }
    this.mBlit = shader(BLIT)
    this.mBlit.uniforms = { uSrc: { value: null } }
  }

  setSize (w, h, ctx) { this._alloc(w, h) }

  _alloc (w, h) {
    if (this.w === w && this.h === h) return
    this.w = w; this.h = h
    for (const t of [this.tileRT, this.nbRT, this.full]) t?.dispose()
    const tw = Math.max(1, Math.ceil(w / this.tile)), th = Math.max(1, Math.ceil(h / this.tile))
    this.tileRT = rt(tw, th)
    this.nbRT = rt(tw, th)
    this.full = rt(w, h)
    // 5.5% → 4.0%. 롤오프 0.30 과 합쳐 실효 최대 블러가 1440p 기준 36px → 17px 가 된다.
    const maxLen = Math.max(16, Math.round(h * 0.040))
    this.mBlur.uniforms.uMaxLen.value = maxLen
    this.mBlur.uniforms.uRollLo.value = maxLen * 0.30
  }

  render (ctx) {
    const hdr = ctx.targets?.hdr
    const vel = ctx.targets?.velocity
    if (!this.enabled || !hdr || !vel) return
    this._alloc(ctx.w, ctx.h)
    const r = ctx.renderer

    const t = this.mTile.uniforms
    t.uVel.value = vel.texture
    t.uTexel.value.set(1 / ctx.w, 1 / ctx.h)
    this.quad.draw(r, this.mTile, this.tileRT)

    const n = this.mNeighbor.uniforms
    n.uTile.value = this.tileRT.texture
    n.uTexel.value.set(1 / this.tileRT.width, 1 / this.tileRT.height)
    this.quad.draw(r, this.mNeighbor, this.nbRT)

    const b = this.mBlur.uniforms
    b.uSrc.value = hdr.texture
    b.uVel.value = vel.texture
    b.uNeighbor.value = this.nbRT.texture
    b.uDepth.value = ctx.depthTexture ?? hdr.depthTexture
    b.uNoise.value = ctx.blueNoise ?? null
    b.uHasNoise.value = ctx.blueNoise ? 1 : 0
    b.uInvProj.value.copy(ctx.matrices.invProj)
    b.uRes.value.set(ctx.w, ctx.h)
    b.uFrame.value = (ctx.frame ?? 0) % 64
    this.quad.draw(r, this.mBlur, this.full)

    this.mBlit.uniforms.uSrc.value = this.full.texture
    this.quad.draw(r, this.mBlit, hdr)
  }

  dispose () {
    for (const t of [this.tileRT, this.nbRT, this.full]) t?.dispose()
    for (const m of [this.mTile, this.mNeighbor, this.mBlur, this.mBlit]) m?.dispose()
  }
}

// 물리 기반 블룸 — Call of Duty(Siggraph 2014) 밉 체인.
// 13탭 다운샘플(첫 단계는 Karis 평균으로 파이어플라이 억제) → 텐트 필터 업샘플 누적.
// 임계값은 소프트 니로 부드럽게 넘긴다. 하드컷은 밝기 경계에 링을 만든다.
//
// 출력 규약: ctx.targets.bloom 은 "가산 항"이다. composite 는 hdr.rgb + bloom.rgb 로 더하면 된다.
// (여기서 이미 uStrength 로 스케일을 마쳤다. 과다 가산은 D6 대비 붕괴로 직결되므로 보수적으로 잡았다.)
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
uniform sampler2D uSrc;
uniform vec2 uTexel;
vec3 T (vec2 o) {
  vec3 c = texture2D(uSrc, vUv + o * uTexel).rgb;
  // HDR Inf/NaN 방어 — Inf는 Karis 가중 1/(1+lum)과 곱해져 NaN이 되고 체인 전체를 감염시킨다.
  // NaN은 비교에 실패하므로 합이 유한한지로 거른다.
  return (c.r + c.g + c.b < 3.0e38) ? max(c, vec3(0.0)) : vec3(0.0);
}
`

const DOWN = HEAD + `
uniform float uKaris, uThreshold, uKnee, uPrefilter;
float lum (vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 knee (vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float k = uThreshold * uKnee + 1e-5;
  float soft = clamp(br - uThreshold + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k);
  return c * max(soft, br - uThreshold) / max(br, 1e-5);
}
void main () {
  vec3 a = T(vec2(-2.0,  2.0)), b = T(vec2(0.0,  2.0)), c = T(vec2(2.0,  2.0));
  vec3 d = T(vec2(-2.0,  0.0)), e = T(vec2(0.0,  0.0)), f = T(vec2(2.0,  0.0));
  vec3 g = T(vec2(-2.0, -2.0)), h = T(vec2(0.0, -2.0)), i = T(vec2(2.0, -2.0));
  vec3 j = T(vec2(-1.0,  1.0)), k = T(vec2(1.0,  1.0));
  vec3 l = T(vec2(-1.0, -1.0)), m = T(vec2(1.0, -1.0));
  vec3 r;
  if (uKaris > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25;
    vec3 g4 = (j + k + l + m) * 0.25;
    float w0 = 0.125 / (1.0 + lum(g0)), w1 = 0.125 / (1.0 + lum(g1));
    float w2 = 0.125 / (1.0 + lum(g2)), w3 = 0.125 / (1.0 + lum(g3));
    float w4 = 0.5 / (1.0 + lum(g4));
    r = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    r = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  if (uPrefilter > 0.5) r = knee(r);
  gl_FragColor = vec4(max(r, vec3(0.0)), 1.0);
}`

const UP = HEAD + `
uniform sampler2D uBase;
uniform float uRadius, uHasBase, uStrength;
void main () {
  vec3 t = (T(vec2(-1.0,  1.0) * uRadius) + T(vec2(0.0,  1.0) * uRadius) * 2.0 + T(vec2(1.0,  1.0) * uRadius)
          + T(vec2(-1.0,  0.0) * uRadius) * 2.0 + T(vec2(0.0, 0.0)) * 4.0 + T(vec2(1.0,  0.0) * uRadius) * 2.0
          + T(vec2(-1.0, -1.0) * uRadius) + T(vec2(0.0, -1.0) * uRadius) * 2.0 + T(vec2(1.0, -1.0) * uRadius)) / 16.0;
  vec3 base = uHasBase > 0.5 ? texture2D(uBase, vUv).rgb : vec3(0.0);
  gl_FragColor = vec4((t + base) * uStrength, 1.0);
}`

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

function shader (frag) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms: {}
  })
}

export default class Bloom {
  async init (ctx) {
    const q = ctx.quality ?? {}
    this.enabled = q.bloom !== false
    this.mips = Math.max(2, Math.min(q.bloomMips ?? 5, 8))
    this.quad = new Quad()
    this.down = []
    this.up = []
    this.w = 0; this.h = 0

    this.mDown = shader(DOWN)
    this.mDown.uniforms = {
      uSrc: { value: null }, uTexel: { value: new THREE.Vector2() },
      uKaris: { value: 0 }, uThreshold: { value: 1.05 }, uKnee: { value: 0.62 }, uPrefilter: { value: 0 }
    }
    this.mUp = shader(UP)
    this.mUp.uniforms = {
      uSrc: { value: null }, uBase: { value: null }, uTexel: { value: new THREE.Vector2() },
      uRadius: { value: 1.0 }, uHasBase: { value: 0 }, uStrength: { value: 1 }
    }
    // 렌즈 광학으로 읽혀야 한다(G8). 화면 전체를 들어올리는 값이 아니라 하이라이트 주변만 번지는 값.
    this.strength = 0.26
  }

  setSize (w, h, ctx) { this._alloc(w, h) }

  _alloc (w, h) {
    if (this.w === w && this.h === h) return
    this.w = w; this.h = h
    for (const t of this.down) t.dispose()
    for (const t of this.up) t.dispose()
    this.down = []; this.up = []
    let mw = w, mh = h
    for (let i = 0; i < this.mips; i++) {
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1)
      if (mw < 4 || mh < 4) break
      this.down.push(rt(mw, mh))
    }
    for (let i = 0; i < this.down.length - 1; i++) {
      this.up.push(rt(this.down[i].width, this.down[i].height))
    }
  }

  render (ctx) {
    const out = ctx.targets?.bloom
    if (!this.enabled || !out || !ctx.targets.hdr) return
    this._alloc(ctx.w, ctx.h)
    if (this.down.length < 2) return
    const r = ctx.renderer
    const d = this.mDown.uniforms

    for (let i = 0; i < this.down.length; i++) {
      const src = i === 0 ? ctx.targets.hdr : this.down[i - 1]
      d.uSrc.value = src.texture
      d.uTexel.value.set(1 / src.width, 1 / src.height)
      d.uKaris.value = i === 0 ? 1 : 0
      d.uPrefilter.value = i === 0 ? 1 : 0
      this.quad.draw(r, this.mDown, this.down[i])
    }

    const u = this.mUp.uniforms
    u.uRadius.value = 1.0
    for (let i = this.up.length - 1; i >= 0; i--) {
      const src = i === this.up.length - 1 ? this.down[i + 1] : this.up[i + 1]
      u.uSrc.value = src.texture
      u.uTexel.value.set(1 / src.width, 1 / src.height)
      u.uBase.value = this.down[i].texture
      u.uHasBase.value = 1
      u.uStrength.value = 0.5      // 두 층을 더하므로 에너지 보존을 위해 절반
      this.quad.draw(r, this.mUp, this.up[i])
    }

    const top = this.up[0]
    u.uSrc.value = top.texture
    u.uTexel.value.set(1 / top.width, 1 / top.height)
    u.uHasBase.value = 0
    u.uStrength.value = this.strength
    this.quad.draw(r, this.mUp, out)
  }

  dispose () {
    for (const t of this.down) t.dispose()
    for (const t of this.up) t.dispose()
    this.mDown?.dispose(); this.mUp?.dispose()
  }
}

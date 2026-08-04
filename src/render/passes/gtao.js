// GTAO — Jimenez/Activision 지평선 기반 앰비언트 오클루전.
// 하프 해상도 마치 → 깊이·노멀 인지 바이래터럴 → 속도 리프로젝션 시간축 누적 → 깊이 인지 업샘플.
// 결과는 ctx.targets.ao 에 1=차폐없음 으로 기록한다. 컨택트 섀도(루브릭 G4/D5)가 여기서 나온다.
import * as THREE from 'three'

const VERT = `
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 뷰 포지션 복원과 블루노이즈 디더는 네 패스가 공유한다.
const HEAD = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
const float PI = 3.14159265359;
const float HPI = 1.57079632679;
vec3 vpos (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return c.xyz / c.w;
}`

const MARCH = HEAD + `
uniform sampler2D uNormal;
uniform sampler2D uNoise;
uniform vec2 uProj;
uniform float uRadius, uThick, uPower, uFrame, uHasNoise, uFar, uMaxRad;

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
  // 배경(깊이 미기록)·노멀 없는 픽셀은 완전 개방으로 둔다
  if (d <= 0.0 || d >= uFar * 0.98 || nl < 0.2) { gl_FragColor = vec4(1.0, d, 0.0, 1.0); return; }
  N /= nl;
  vec3 V = normalize(-P);
  // 접합선 어두움은 코너에서 수 cm 폭이다. 노멀 오프셋 0.0035+0.0012d 도 5m 에서 9.5mm 라
  // 러너 트림(19mm)·반자틀(41~53mm) 같은 얕은 단차의 절반을 그대로 먹는다 — 그만큼
  // 그 단차의 지평선이 안 잡히고 접촉부가 사라진다. 셸프 아크네를 막을 최소치만 남긴다.
  P += N * (0.0012 + 0.0004 * d);

  vec2 rad = clamp(0.5 * uRadius / d * uProj, vec2(0.0012), vec2(uMaxRad));
  float rot = blue(0.0);
  float off = blue(1.0);
  // 월드 폴오프 창. 스침각 면(복도 바닥·천장)에서는 화면 반경 안의 샘플 대부분이 월드로는
  // 수 m 라 이 창 밖으로 밀려나 거부된다 — 창이 좁으면 유효 샘플이 거의 남지 않아 벽-바닥
  // 접합선이 AO 를 아예 못 받는다(실측: 접합선 함몰 0%). 창을 넓히고 대신 화면 반경
  // (uMaxRad)으로 접촉 스케일을 잡는다.
  float fS = uRadius * 0.55, fE = uRadius * 1.35;
  float vis = 0.0;

  for (int s = 0; s < SLICES; s++) {
    float phi = (float(s) + rot) * PI / float(SLICES);
    vec2 dir = vec2(cos(phi), sin(phi));
    vec3 axis = cross(vec3(dir, 0.0), V);
    float al = length(axis);
    if (al < 1e-4) continue;
    axis /= al;
    vec3 pn = N - axis * dot(N, axis);
    float pnl = length(pn);
    if (pnl < 1e-4) continue;
    vec3 T = cross(V, axis);
    float n = (dot(pn, T) < 0.0 ? -1.0 : 1.0) * acos(clamp(dot(pn, V) / pnl, -1.0, 1.0));

    float cp = -1.0, cm = -1.0;
    for (int t = 0; t < STEPS; t++) {
      float f = (float(t) + off) / float(STEPS);
      f *= f;                                  // 접촉부에 샘플을 몰아준다
      vec2 duv = dir * rad * f;

      vec3 sp = vpos(vUv + duv) - P;
      float lp = length(sp);
      float hp = dot(sp, V) / max(lp, 1e-5);
      hp = mix(-1.0, hp, clamp((fE - lp) / max(fE - fS, 1e-4), 0.0, 1.0));
      cp = hp > cp ? hp : mix(cp, hp, uThick);   // 얇은 오브젝트 과차폐 완화

      vec3 sm = vpos(vUv - duv) - P;
      float lm = length(sm);
      float hm = dot(sm, V) / max(lm, 1e-5);
      hm = mix(-1.0, hm, clamp((fE - lm) / max(fE - fS, 1e-4), 0.0, 1.0));
      cm = hm > cm ? hm : mix(cm, hm, uThick);
    }

    float ap = n + min( acos(clamp(cp, -1.0, 1.0)) - n,  HPI);
    float am = n + max(-acos(clamp(cm, -1.0, 1.0)) - n, -HPI);
    float sn = sin(n), cnn = cos(n);
    vis += pnl * 0.25 * ((-cos(2.0 * am - n) + cnn + 2.0 * am * sn)
                       + (-cos(2.0 * ap - n) + cnn + 2.0 * ap * sn));
  }
  vis = clamp(vis / float(SLICES), 0.0, 1.0);
  gl_FragColor = vec4(pow(vis, uPower), d, 0.0, 1.0);
}`

const BLUR = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uAo;
uniform sampler2D uNormal;
uniform vec2 uStep;
void main () {
  vec2 c = texture2D(uAo, vUv).xy;
  vec3 n0 = texture2D(uNormal, vUv).xyz;
  float sum = c.x, wsum = 1.0;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    // 하프 해상도 4탭은 최종 화면에서 ±8px 이다. 0.16 커널은 그 폭을 거의 균등 가중해
    // 10px 짜리 접촉선(5m 앞 19mm 트림)을 통째로 평균으로 만든다 — 좁혀서 선을 남긴다.
    float wk = exp(-0.42 * fi * fi);
    for (int j = 0; j < 2; j++) {
      vec2 uv = vUv + uStep * fi * (j == 0 ? 1.0 : -1.0);
      vec2 s = texture2D(uAo, uv).xy;
      vec3 sn = texture2D(uNormal, uv).xyz;
      float wd = exp(-abs(s.y - c.y) * 14.0 / max(c.y, 0.4));
      float wn = pow(max(dot(sn, n0), 0.0), 8.0);
      float w = wk * wd * wn;
      sum += s.x * w; wsum += w;
    }
  }
  gl_FragColor = vec4(sum / max(wsum, 1e-4), c.y, 0.0, 1.0);
}`

const TEMPORAL = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur, uHist, uVel;
uniform float uFeedback;
void main () {
  vec2 c = texture2D(uCur, vUv).xy;
  vec2 vel = texture2D(uVel, vUv).xy;
  vec2 puv = vUv - vel * 0.5;                 // NDC 속도 → uv 오프셋
  vec2 h = texture2D(uHist, puv).xy;
  float ok = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  ok *= step(abs(h.y - c.y) / max(c.y, 0.1), 0.06) * step(0.0005, h.y);
  gl_FragColor = vec4(mix(c.x, mix(h.x, c.x, 1.0 - uFeedback), ok), c.y, 0.0, 1.0);
}`

const UPSAMPLE = HEAD + `
uniform sampler2D uAo;
uniform vec2 uTexel;
void main () {
  float d = -vpos(vUv).z;
  float sum = 0.0, wsum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 s = texture2D(uAo, vUv + vec2(float(x), float(y)) * uTexel).xy;
      float w = 1.0 / (0.02 + abs(s.y - d) * 6.0);
      sum += s.x * w; wsum += w;
    }
  }
  gl_FragColor = vec4(clamp(sum / max(wsum, 1e-4), 0.0, 1.0));
}`

function rt (w, h, type) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    format: THREE.RGBAFormat, type: type ?? THREE.HalfFloatType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: false
  })
  t.texture.colorSpace = THREE.NoColorSpace
  return t
}

// autoClear 를 끈 자체 쿼드. 공유 타깃의 깊이 첨부를 건드리지 않기 위해 fsq 대신 직접 그린다.
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

export default class Gtao {
  async init (ctx) {
    const q = ctx.quality ?? {}
    this.enabled = q.gtao !== false
    this.quad = new Quad()
    this.slices = Math.max(1, q.gtaoSlices ?? 3)
    this.steps = Math.max(2, q.gtaoSteps ?? 8)
    this.flip = 0
    this.w = 0; this.h = 0

    this.mMarch = shader(MARCH, { SLICES: this.slices, STEPS: this.steps })
    this.mMarch.uniforms = {
      uDepth: { value: null }, uNormal: { value: null }, uNoise: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Vector2() },
      // uRadius = 월드 폴오프 창, uMaxRad = 화면공간 상한. 둘을 분리한 이유는 위 MARCH 주석 참조.
      // (합쳐 두면 근경에서 상한에만 걸려 창이 좁아지고, 창을 넓히면 복도 전체가 서로를 가린다.)
      //
      // 화면 상한 0.055 는 하프 해상도에서 가로 70px — 그 반경으로 적분하면 결과가 "접촉부
      // 어두움"이 아니라 넓은 감광이 된다(A/B: 벽-바닥 접합 함몰 76%인데 러너 가장자리는 2%).
      // 0.020 으로 조이면 같은 접합 함몰을 유지한 채 러너 가장자리 15~20%, 반자틀 밑 함몰
      // 53%→61% 로 올라온다. 대신 세기(uPower)로 보상해야 원경의 넓은 차폐가 안 죽는다.
      //
      // 3.6 → 4.2. 라운드5 에서 IBL/hemi 를 올려(moods envIntensity 0.44→0.78) 근경 사다리를
      // 세웠는데, 앰비언트는 정의상 접촉부부터 씻는다 — 같은 리비전 A/B 에서 벽-바닥 접합 함몰이
      // 84.1% → 81.6% 로 내려갔다. 세기만 되올리면 함몰 84.6% 로 회복되고(scratchpad/lit2/fin W5)
      // 덤으로 원경의 국소대비도 4.87 → 4.46 으로 내려가 대기 원근이 같이 선다.
      uRadius: { value: 0.9 }, uThick: { value: 0.05 }, uPower: { value: 4.2 },
      uMaxRad: { value: 0.020 },
      uFrame: { value: 0 }, uHasNoise: { value: 0 }, uFar: { value: 100 }
    }
    this.mBlur = shader(BLUR)
    this.mBlur.uniforms = {
      uAo: { value: null }, uNormal: { value: null }, uStep: { value: new THREE.Vector2() }
    }
    this.mTemporal = shader(TEMPORAL)
    this.mTemporal.uniforms = {
      uCur: { value: null }, uHist: { value: null }, uVel: { value: null },
      uFeedback: { value: 0.88 }
    }
    this.mUp = shader(UPSAMPLE)
    this.mUp.uniforms = {
      uAo: { value: null }, uDepth: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }
    }
  }

  setSize (w, h, ctx) { this._alloc(w, h) }

  _alloc (w, h) {
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1)
    if (this.w === hw && this.h === hh) return
    this.w = hw; this.h = hh
    for (const t of [this.raw, this.tmp, this.hist0, this.hist1]) t?.dispose()
    this.raw = rt(hw, hh)
    this.tmp = rt(hw, hh)
    this.hist0 = rt(hw, hh)
    this.hist1 = rt(hw, hh)
  }

  render (ctx) {
    const ao = ctx.targets?.ao
    if (!this.enabled || !ao || !ctx.targets.normal) return
    this._alloc(ctx.w, ctx.h)
    const r = ctx.renderer
    const proj = ctx.matrices.proj

    const m = this.mMarch.uniforms
    m.uDepth.value = ctx.depthTexture ?? ctx.targets.hdr?.depthTexture
    m.uNormal.value = ctx.targets.normal.texture
    m.uNoise.value = ctx.blueNoise ?? null
    m.uHasNoise.value = ctx.blueNoise ? 1 : 0
    m.uInvProj.value.copy(ctx.matrices.invProj)
    m.uProj.value.set(proj.elements[0], proj.elements[5])
    m.uFrame.value = (ctx.frame ?? 0) % 64
    m.uFar.value = ctx.camera.far
    this.quad.draw(r, this.mMarch, this.raw)

    const b = this.mBlur.uniforms
    b.uNormal.value = ctx.targets.normal.texture
    b.uAo.value = this.raw.texture
    b.uStep.value.set(1 / this.w, 0)
    this.quad.draw(r, this.mBlur, this.tmp)
    b.uAo.value = this.tmp.texture
    b.uStep.value.set(0, 1 / this.h)
    this.quad.draw(r, this.mBlur, this.raw)

    const cur = this.flip ? this.hist1 : this.hist0
    const prev = this.flip ? this.hist0 : this.hist1
    const t = this.mTemporal.uniforms
    t.uCur.value = this.raw.texture
    t.uHist.value = prev.texture
    t.uVel.value = ctx.targets.velocity?.texture ?? null
    t.uFeedback.value = ctx.targets.velocity ? 0.88 : 0.0
    this.quad.draw(r, this.mTemporal, cur)
    this.flip ^= 1

    const u = this.mUp.uniforms
    u.uAo.value = cur.texture
    u.uDepth.value = m.uDepth.value
    u.uInvProj.value.copy(ctx.matrices.invProj)
    u.uTexel.value.set(1 / this.w, 1 / this.h)
    this.quad.draw(r, this.mUp, ao)
  }

  dispose () {
    for (const t of [this.raw, this.tmp, this.hist0, this.hist1]) t?.dispose()
    for (const m of [this.mMarch, this.mBlur, this.mTemporal, this.mUp]) m?.dispose()
  }
}

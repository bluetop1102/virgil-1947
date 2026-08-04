// 시간축 요소. 먼지 모티·담배연기. 비 계열(스트릭·리플·스플래시·렌즈)은 rain.js가 소유한다.
// 모티는 광축 안에서만 살아난다 — 4개 우선 광원을 정점에서 적분해 산란을 흉내낸다.

import * as THREE from 'three'
import { rng } from '../../core/util.js'

export const LIGHT_PARS = `
uniform vec4 uLP[4];   // xyz=위치, w=사거리(0=무한)
uniform vec4 uLC[4];   // rgb=색, w=세기
uniform vec4 uLD[4];   // xyz=스팟 축, w=cos(외각). w<-0.5면 점광원
uniform vec3 uAmbient;

uniform float uGain, uCeil, uAmbScale, uVisRef, uKnee;

// 직전 scatter() 호출이 채우는 광원 볼륨 마스크. 0 = 광축 밖, 1 = 콘 코어.
// 소비처가 알파에 물려 "조명이 닿지 않는 구석에도 같은 밀도로 뜨는 오버레이"를 막는다.
float gVis;

// 광원 세기는 three와 같은 역제곱으로 감쇠시킨다. 최소 반경(0.6m)을 두지 않으면 광원에
// 붙은 입자 하나가 발산해 블룸·DOF가 그걸 화면만 한 보케로 부풀린다.
vec3 scatter (vec3 wp, vec3 V, float fwd) {
  vec3 lit = uAmbient * uAmbScale;
  float acc = 0.0;
  for (int i = 0; i < 4; i++) {
    if (uLC[i].w <= 0.0) continue;
    vec3 toL = uLP[i].xyz - wp;
    float d2 = max(dot(toL, toL), 1e-4);
    vec3 L = toL * inversesqrt(d2);
    float att = 1.0 / max(d2, 0.36);
    if (uLP[i].w > 0.0) att *= pow(clamp(1.0 - d2 / (uLP[i].w * uLP[i].w), 0.0, 1.0), 2.0);
    float cone = 1.0;
    if (uLD[i].w > -0.5) {
      float cd = dot(-L, uLD[i].xyz);
      cone = smoothstep(uLD[i].w, mix(uLD[i].w, 1.0, 0.40), cd);
    }
    // 미 산란 근사: 역광에서 강한 전방 로브. 광축 밖에서는 cone이 0이라 모티가 죽는다
    float hg = 0.16 + fwd * pow(max(dot(V, -L), 0.0), 6.0);
    lit += uLC[i].rgb * uLC[i].w * att * cone * hg * uGain;
    // 마스크는 시선각(hg)을 빼고 순수 조도만 쌓는다 — 역광이 아닌 방향의 광축도 광축이다
    acc += uLC[i].w * att * cone;
  }
  gVis = clamp(acc / max(uVisRef, 1e-4), 0.0, 1.0);
  float m = max(lit.r, max(lit.g, lit.b));
  // 하드 클램프는 조도가 천장을 넘는 순간 모든 입자를 같은 값으로 눌러 붙인다. 스팟 하나가
  // 수백 cd라 실내에서는 사실상 전부 포화하고, 결과가 "같은 흰색 덩어리 20개"가 된다(D8).
  // 소프트 니는 순서를 보존하므로 같은 상한 안에서도 값 층이 남는다.
  if (uKnee > 0.5) return lit * (uCeil / (uCeil + m));
  // 천장을 두면 광축 안 모티는 여전히 하이라이트로 남고, 발산만 잘린다
  return m > uCeil ? lit * (uCeil / m) : lit;
}`

export const SOFT_PARS = `
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uSoft, uSoftFade;
float softFade (float vz) {
  if (uSoft < 0.5) return 1.0;
  float sceneZ = abs(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).a);
  if (sceneZ < 0.001) return 1.0;
  return clamp((sceneZ - vz) / uSoftFade, 0.0, 1.0);
}`

export const WRAP = `
vec3 wrapBox (vec3 p, vec3 box, vec3 c) {
  vec3 d = p - c + box * 0.5;
  return c + mod(mod(d, box) + box, box) - box * 0.5;
}`

function seedAttr (n, seed, comps = 3) {
  const r = rng(seed)
  const a = new Float32Array(n * comps)
  for (let i = 0; i < n * comps; i++) a[i] = r()
  return new THREE.BufferAttribute(a, comps)
}

function basePositions (n, box, seed) {
  const r = rng(seed)
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    a[i * 3] = (r() - 0.5) * box[0]
    a[i * 3 + 1] = (r() - 0.5) * box[1]
    a[i * 3 + 2] = (r() - 0.5) * box[2]
  }
  return new THREE.BufferAttribute(a, 3)
}

export function commonUniforms (box) {
  return {
    uTime: { value: 0 },
    uBox: { value: new THREE.Vector3().fromArray(box) },
    uCam: { value: new THREE.Vector3() },
    uWind: { value: new THREE.Vector3(0.05, 0.01, 0.03) },
    uPix: { value: 600 },
    uOpacity: { value: 1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uAmbient: { value: new THREE.Vector3(0.02, 0.02, 0.025) },
    uLP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uLC: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uLD: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -1, 0, -1)) },
    uSceneDepth: { value: null },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uSoft: { value: 0 },
    uSoftFade: { value: 0.6 },
    uGain: { value: 1.0 },
    uCeil: { value: 2.2 },
    uAmbScale: { value: 1.0 },
    uVisRef: { value: 0.55 },
    uKnee: { value: 0 }
  }
}

export function tune (o) {
  o.frustumCulled = false
  o.castShadow = false
  o.receiveShadow = false
  o.renderOrder = 10
  o.userData.noPrepass = true
  o.userData.atmoParticles = true
  return o
}

// ── 먼지 모티 ────────────────────────────────────────────────────────────
function dust (count, box, seed) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', basePositions(count, box, seed))
  g.setAttribute('aSeed', seedAttr(count, seed + 17))
  const u = commonUniforms(box)
  u.uSize = { value: 0.0042 }
  u.uMaxPx = { value: 8 }         // 4 CSS px × dpr. 상한이 26이면 근경 모티가 화면의 흰 원반이 된다
  u.uFocus = { value: 0 }         // camera.userData.focus. 0이면 DOF가 오토포커스 중이다
  u.uNearRef = { value: 2.4 }     // 오토포커스는 화면 중앙(원경)을 잡는다 — 이 거리 안쪽이 근경 흐림 구간
  u.uApertureK = { value: 1.7 }
  // 광축 밖 모티를 눌러 앰비언트만으로 뜨는 오버레이를 막는다(0.15 = 광원 볼륨 밖 잔광)
  u.uAmbScale.value = 0.15
  // 소프트 파티클: 0.6m는 벽에서 60cm 떨어진 모티까지 지운다. 접촉면 근처에서만 사라지게 한다
  u.uSoftFade.value = 0.15
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: u,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uMaxPx, uFocus, uNearRef, uApertureK;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${LIGHT_PARS}
      ${WRAP}
      void main () {
        float t = uTime;
        float f = 0.25 + aSeed.y * 0.9;
        vec3 p = position;
        p.x += sin(t * f * 0.70 + aSeed.x * 6.283) * 0.34 + uWind.x * t;
        p.y += sin(t * f * 0.46 + aSeed.x * 3.141) * 0.22 + uWind.y * t;
        p.z += cos(t * f * 0.61 + aSeed.x * 4.712) * 0.34 + uWind.z * t;
        vec3 wp = wrapBox(p, uBox, uCam);
        vec3 V = normalize(uCam - wp);
        vLit = scatter(wp, V, 1.35);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        vTw = 0.45 + 0.55 * pow(abs(sin(t * (1.1 + aSeed.z * 3.0) + aSeed.x * 12.0)), 1.5);

        // 파티클은 depthWrite:false 라 DOF가 뒤 지오메트리의 CoC를 물려준다 — 0.8m 앞 모티가
        // 6m 벽의 초점을 따라가 언제나 선명하다. 정점에서 자기 CoC를 계산해 스스로 부풀고 옅어진다.
        float defoc = uFocus > 0.0
          ? abs(vZ - uFocus) / max(vZ, 0.08)
          : max(uNearRef - vZ, 0.0) / uNearRef;
        float coc = defoc * uApertureK;

        // 하한 1px에 전부 걸리면 크기 분포가 죽어 같은 점 3000개가 된다. 하한 아래는
        // 크기 대신 알파로 줄여 서브픽셀 입자를 보존한다.
        float want = uSize * (0.35 + aSeed.z) * uPix / max(vZ, 0.08) * (1.0 + coc);
        float px = clamp(want, 1.0, uMaxPx);
        gl_PointSize = px;
        vA = clamp(want / px, 0.0, 1.0) * mix(0.15, 1.0, gVis) / ((1.0 + coc) * (1.0 + coc));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${SOFT_PARS}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        // smoothstep(1.0, 0.05, r)는 2px 스프라이트에서 모든 프래그먼트가 같은 알파를 받아
        // 각진 정사각형이 된다. 가우시안은 중심에서 가장자리까지 연속으로 떨어진다.
        float a = exp(-4.5 * r * r);
        a *= uOpacity * vTw * vA * softFade(vZ);
        gl_FragColor = vec4(vLit * uTint, a);
      }`
  })
  return tune(new THREE.Points(g, m))
}

// ── 담배연기 ─────────────────────────────────────────────────────────────
function smoke (count, box, seed) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', basePositions(count, box, seed + 3))
  g.setAttribute('aSeed', seedAttr(count, seed + 41))
  const u = commonUniforms(box)
  u.uSize = { value: 0.085 }
  u.uRise = { value: 0.11 }
  u.uMaxPx = { value: 96 }        // 담배 한 개비의 연기가 화면 절반을 먹으면 스티커로 읽힌다
  u.uRefPx = { value: 46 }        // 이 크기에서 알파 1배. 커질수록 같은 질량이 넓게 퍼져 옅어진다
  // 연기는 담뱃불이 아니라 방의 빛을 받아 보인다 — 광축 밖에서는 거의 사라져야 한다
  u.uAmbScale.value = 0.30
  // scatter()는 조도를 그대로 돌려준다 — 램버트 면이라면 albedo/π 가 붙어야 할 자리다. 그래서
  // 퍼프 하나가 같은 자리 흰 벽보다 5~8배 밝게 나오고, NormalBlending 합성에서 노출 백색점을
  // 넘겨 흰 덩어리가 된다. 그 덩어리를 블룸·DOF가 다시 별/나비 모양으로 부풀렸다(D8 실격 보고분).
  // 실측: room-dusk 에서 smoke 만 숨기면 벽면의 40~60px 흰 스프라이트가 전부 사라진다.
  u.uGain.value = 0.18
  u.uCeil.value = 0.26
  u.uKnee.value = 1
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
    uniforms: u,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uRise, uMaxPx, uRefPx;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${LIGHT_PARS}
      ${WRAP}
      void main () {
        float t = uTime;
        float life = fract(aSeed.x + t * (0.020 + aSeed.y * 0.028));
        vec3 p = position;
        p.y += life * uBox.y * uRise * 6.0;
        p.x += sin(t * 0.19 + aSeed.x * 6.283) * 0.55 + uWind.x * t * 2.2;
        p.z += cos(t * 0.23 + aSeed.z * 6.283) * 0.55 + uWind.z * t * 2.2;
        vec3 wp = wrapBox(p, uBox, uCam);
        vec3 V = normalize(uCam - wp);
        vLit = scatter(wp, V, 0.55);
        vLife = life;
        vRot = aSeed.z * 6.283;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        float px = clamp(uSize * (0.5 + aSeed.y + life * 1.6) * uPix / max(vZ, 0.08), 2.0, uMaxPx);
        gl_PointSize = px;
        // 같은 연기 질량이 넓게 퍼지면 그만큼 옅어져야 한다. 크기만 키우고 알파를 두면
        // 근경 퍼프가 불투명 흰 덩어리가 된다. 광축 밖에서는 방의 빛을 못 받아 거의 사라진다.
        vA = clamp(uRefPx / px, 0.14, 1.0) * mix(0.10, 1.0, gVis);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${SOFT_PARS}
      void main () {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        c = mat2(co, -s, s, co) * c;
        float r = length(c) * 2.0;
        float th = atan(c.y, c.x);
        // 옛 코드는 반경을 3-로브로 변조한 뒤 smoothstep(wob, 0.0, r)로 잘랐다 —
        // 경계가 하드해서 흰 삼각형/나비 스티커가 됐다(D8). 연기에는 경계가 없다:
        // 가우시안 코어에 저진폭 방위 흔들림만 얹어 실루엣만 비대칭으로 만든다.
        float wob = 1.0 + 0.13 * sin(th * 3.0 + vRot * 2.0) + 0.08 * sin(th * 7.0 - vRot * 1.3);
        float q = r / wob;
        float a = exp(-3.1 * q * q) * uOpacity * vA;
        a *= smoothstep(0.0, 0.16, vLife) * smoothstep(1.0, 0.55, vLife);
        a *= softFade(vZ);
        gl_FragColor = vec4(vLit * uTint, a);
      }`
  })
  return tune(new THREE.Points(g, m))
}

export class ParticleField {
  constructor (quality) {
    const s = Math.max(quality?.particles ?? 1, 0.05)
    this.group = new THREE.Group()
    this.group.name = 'atmo.particles'
    this.sys = {
      // 3000개는 복도 무드의 박스(7×3.4×26 = 619m³)에서 4.9개/m³ 다. 시야 8m 안에 드는
      // 절두체 부피가 약 32m³ 라 프레임에 잡히는 모티가 150개 남짓이고, 그중 광축 안에서
      // 밝게 뜨는 것은 수십 개뿐이라 2560×1440 등배에서 육안으로 하나도 안 보였다(D8).
      dust: dust(Math.round(4200 * s), [16, 5, 16], 991),
      smoke: smoke(Math.round(220 * s), [10, 3.2, 10], 227)
    }
    for (const k of Object.keys(this.sys)) this.group.add(this.sys[k])
    this.base = { dust: 0.55, smoke: 0.30 }
  }

  applyMood (mood) {
    const p = mood.particles
    const box = p.box || [16, 5, 16]
    for (const k of Object.keys(this.sys)) {
      const o = this.sys[k]
      const w = (p[k] ?? 0)
      o.visible = w > 0.001
      o.material.uniforms.uOpacity.value = this.base[k] * w
      o.material.uniforms.uWind.value.fromArray(mood.fog.windDir).multiplyScalar(3.5)
    }
    this.sys.dust.material.uniforms.uBox.value.set(box[0], box[1], box[2])
    this.sys.smoke.material.uniforms.uBox.value.set(box[0] * 0.7, box[1] * 0.8, box[2] * 0.7)
    // 틴트는 안개색의 "색상"만 쓰고 세기는 고정한다. fog.color의 크기가 무드마다 40배 넘게
    // 달라서 고정 배율(옛 26)을 곱하면 로비에서는 주황 오버레이가 되고 복도에서는 먼지가 사라진다.
    const t = mood.fog.color
    const mx = Math.max(t[0], t[1], t[2], 1e-5)
    // 0.34 → 0.55. 복도 무드에서 모티가 등배로 한 개도 안 읽혔다. 상한은 0.55 다 —
    // 그 이상은 광축 밖 모티까지 살아나 옛 오버레이 문제(균일 밀도의 주황 점)가 재발한다.
    const K = 0.55
    this.sys.dust.material.uniforms.uTint.value.set(
      (0.35 + 0.65 * t[0] / mx) * K, (0.35 + 0.65 * t[1] / mx) * K, (0.35 + 0.65 * t[2] / mx) * K)
    this.sys.smoke.material.uniforms.uTint.value.set(0.85, 0.86, 0.90)
    const amb = mood.hemi.sky
    for (const k of Object.keys(this.sys)) {
      this.sys[k].material.uniforms.uAmbient.value.set(amb[0] * 1.4, amb[1] * 1.4, amb[2] * 1.4)
    }
  }

  update (time, cam, lights, depth, res, pixScale, dpr = 2) {
    const du = this.sys.dust.material.uniforms
    du.uMaxPx.value = 4 * dpr
    du.uFocus.value = cam.userData?.focus ?? 0
    for (const k of Object.keys(this.sys)) {
      const u = this.sys[k].material.uniforms
      u.uTime.value = time
      u.uCam.value.copy(cam.position)
      u.uPix.value = pixScale
      u.uSceneDepth.value = depth
      u.uSoft.value = depth ? 1 : 0
      u.uResolution.value.copy(res)
      for (let i = 0; i < 4; i++) {
        const l = lights[i]
        if (!l) { u.uLC.value[i].set(0, 0, 0, 0); continue }
        u.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.range)
        u.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.power)
        u.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos)
      }
    }
  }

  dispose () {
    for (const k of Object.keys(this.sys)) {
      this.sys[k].geometry.dispose()
      this.sys[k].material.dispose()
    }
  }
}

import * as THREE from 'three'
import { NOISE, PATTERN, SUPPORT, triplanarPatch, stochasticTile, pomPatch } from './glsl.js'

// GPU 절차 텍스처 생성기.
// CPU 픽셀 루프 대신 풀스크린 셰이더로 RenderTarget에 베이크한다. 2048²에서도 한 프레임 안에 끝난다.
// 한 번의 MRT 패스로 albedo(sRGB) / normal+height / ORM 세 장을 동시에 뽑는다.

const QUAD = new THREE.BufferGeometry()
QUAD.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
const QUAD_CAM = new THREE.Camera()

const VERT = `precision highp float;
in vec3 position;
out vec2 vUv;
void main () { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const HEAD = `precision highp float;
precision highp int;
in vec2 vUv;
uniform float uSeed;
uniform float uTexel;
uniform float uBump;
uniform vec4 uP;
${NOISE}
${PATTERN}
#define FBM(uv, f, o) cFbm((uv) * (f), (f), o)
#define FBMR(uv, f, o) cFbmR((uv) * (f), (f), o)
#define WOR(uv, f, j) cWorley((uv) * (f), (f), j)
#define CRK(uv, f, w, j) cCrack((uv) * (f), (f), w, j)
#define WRP(uv, f, a, o) (cWarp((uv) * (f), (f), a, o) / (f))
`

const MRT_MAIN = `
vec3 cSobel (vec2 uv) {
  float e = uTexel;
  float h00 = H(uv + vec2(-e, -e)), h10 = H(uv + vec2(0.0, -e)), h20 = H(uv + vec2(e, -e));
  float h01 = H(uv + vec2(-e, 0.0)),                              h21 = H(uv + vec2(e, 0.0));
  float h02 = H(uv + vec2(-e,  e)), h12 = H(uv + vec2(0.0,  e)), h22 = H(uv + vec2(e, e));
  float gx = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) * 0.25;
  float gy = ((h02 + 2.0 * h12 + h22) - (h00 + 2.0 * h10 + h20)) * 0.25;
  return normalize(vec3(-gx * uBump, -gy * uBump, 1.0));
}
layout(location = 0) out vec4 oAlb;
layout(location = 1) out vec4 oNrm;
layout(location = 2) out vec4 oOrm;
void main () {
  vec3 alb = vec3(0.5); float rgh = 0.5, mtl = 0.0, ao = 1.0, alp = 1.0;
  SURF(vUv, alb, rgh, mtl, ao, alp);
  oAlb = vec4(alb, alp);
  oNrm = vec4(cSobel(vUv) * 0.5 + 0.5, clamp(H(vUv), 0.0, 1.0));
  oOrm = vec4(clamp(ao, 0.0, 1.0), clamp(rgh, 0.02, 1.0), clamp(mtl, 0.0, 1.0), 1.0);
}`

const _targets = []
let _quad = null

function quadMesh (material) {
  if (!_quad) { _quad = new THREE.Mesh(QUAD, material); _quad.frustumCulled = false; _quad._scene = new THREE.Scene(); _quad._scene.add(_quad) }
  _quad.material = material
  return _quad._scene
}

function texSetup (t, colorSpace) {
  t.colorSpace = colorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.generateMipmaps = true
  t.channel = 0
  return t
}

function drawTo (renderer, rt, material) {
  const prevRT = renderer.getRenderTarget()
  const prevAC = renderer.autoClear
  renderer.autoClear = false
  renderer.setRenderTarget(rt)
  renderer.render(quadMesh(material), QUAD_CAM)
  renderer.setRenderTarget(prevRT)
  renderer.autoClear = prevAC
  material.dispose()
}

// 단일 타깃 베이크. fragmentShader는 `out vec4 oCol`에 기록해야 한다.
export function bake (renderer, fragmentShader, uniforms = {}, size = 512, colorSpace = THREE.NoColorSpace) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, generateMipmaps: true
  })
  texSetup(rt.texture, colorSpace)
  const u = { uSeed: { value: 0 }, uTexel: { value: 1 / size }, uBump: { value: 1 }, uP: { value: new THREE.Vector4() } }
  for (const k in uniforms) u[k] = uniforms[k]
  const m = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, uniforms: u,
    fragmentShader: `${HEAD}\nlayout(location = 0) out vec4 oCol;\n${fragmentShader}`,
    depthTest: false, depthWrite: false
  })
  drawTo(renderer, rt, m)
  _targets.push(rt)
  return rt.texture
}

// MRT 베이크. glsl은 float H(vec2)와 SURF(uv, out alb, out rgh, out mtl, out ao, out alp)를 정의한다.
export function bakeSurface (renderer, recipe, size) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    count: 3, type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
    depthBuffer: false, stencilBuffer: false, generateMipmaps: true
  })
  // 그레이징 각 바닥이 밉맵으로 뭉개지면 원거리에서 패턴이 죽는다 — 이방성은 최대치로 쓴다.
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  texSetup(rt.textures[0], THREE.SRGBColorSpace).anisotropy = aniso
  texSetup(rt.textures[1], THREE.NoColorSpace).anisotropy = aniso
  texSetup(rt.textures[2], THREE.NoColorSpace).anisotropy = aniso
  const p = recipe.p || [0, 0, 0, 0]
  const m = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT,
    fragmentShader: `${HEAD}\n${recipe.glsl}\n${MRT_MAIN}`,
    uniforms: {
      uSeed: { value: recipe.seed ?? 1 },
      uTexel: { value: 1 / size },
      uBump: { value: (recipe.bump ?? 1) * size / 1024 },
      uP: { value: new THREE.Vector4(p[0], p[1], p[2], p[3]) }
    },
    depthTest: false, depthWrite: false
  })
  drawTo(renderer, rt, m)
  _targets.push(rt)
  return { albedo: rt.textures[0], normal: rt.textures[1], orm: rt.textures[2] }
}

// 모든 재질이 공유하는 근거리 미세 노멀(+높이). 한 번만 굽는다.
let _detail = null
export function detailNormal (renderer, size = 512) {
  if (_detail) return _detail
  _detail = bake(renderer, `
float H (vec2 uv) {
  float f = FBM(uv, vec2(96.0), 4) * 0.55 + FBM(uv, vec2(320.0), 2) * 0.30;
  vec3 w = WOR(uv, vec2(150.0), 1.0);
  return f + (1.0 - smoothstep(0.0, 0.35, w.x)) * 0.12;
}
void main () {
  float e = 1.0 / 512.0;
  float gx = (H(vUv + vec2(e, 0.0)) - H(vUv - vec2(e, 0.0))) * 26.0;
  float gy = (H(vUv + vec2(0.0, e)) - H(vUv - vec2(0.0, e))) * 26.0;
  oCol = vec4(normalize(vec3(-gx, -gy, 1.0)) * 0.5 + 0.5, H(vUv));
}`, {}, size, THREE.NoColorSpace)
  _detail.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  return _detail
}

export function disposeBaked () {
  for (const rt of _targets) rt.dispose()
  _targets.length = 0
  _detail = null
}

// ── 재질 셰이더 주입 ──────────────────────────────────────────────
// 타일링 파괴(트리플래너 / 스토캐스틱 / 월드 그런지), 디테일 노멀 UDN, POM을 onBeforeCompile로 심는다.

const CHUNK_MAP = `
  vec3 cWN = normalize(vCWNrm);
  vec2 cuv = vMapUv;
#ifdef CECIL_POM
  {
    mat3 ctf = cTangentFrame(-vViewPosition, normalize(vNormal), vMapUv);
    vec3 vts = normalize(vViewPosition * ctf);
    float pf = 1.0 - smoothstep(2.2, 6.5, length(vViewPosition));
    cuv = cPom(normalMap, vMapUv, vts, uCB.x, pf);
  }
#endif
#if defined(CECIL_TRIPLANAR)
  vec3 ctb = cTriBlend(cWN);
  vec4 a4 = cTriSample(map, vCWPos, ctb, uCA.x);
  vec4 o4 = cTriSample(roughnessMap, vCWPos, ctb, uCA.x);
  float chgt, cnv;
  cecilNrm = cTriNormal(normalMap, vCWPos, cWN, ctb, uCA.x, chgt, cnv);
#elif defined(CECIL_STOCH)
  vec3 sw; vec2 s1, s2, s3;
  cTriGrid(cuv, sw, s1, s2, s3);
  vec2 ddx = dFdx(cuv), ddy = dFdy(cuv);
  vec4 a4 = cStoch(map, cuv, ddx, ddy, sw, s1, s2, s3);
  vec4 o4 = cStoch(roughnessMap, cuv, ddx, ddy, sw, s1, s2, s3);
  vec4 n4 = cStoch(normalMap, cuv, ddx, ddy, sw, s1, s2, s3);
  float cnv = length(n4.xyz * 2.0 - 1.0);
  cecilNrm = normalize(n4.xyz * 2.0 - 1.0);
#else
  vec4 a4 = texture2D(map, cuv);
  vec4 o4 = texture2D(roughnessMap, cuv);
  vec4 n4 = texture2D(normalMap, cuv);
  float cnv = length(n4.xyz * 2.0 - 1.0);
  cecilNrm = normalize(n4.xyz * 2.0 - 1.0);
#endif
#ifdef CECIL_FLOW
  {
    vec2 f1 = cuv + vec2(0.021, 0.013) * uCTime * uCB.z;
    vec2 f2 = cuv * 1.73 - vec2(0.017, 0.029) * uCTime * uCB.z;
    vec3 na = texture2D(normalMap, f1).xyz * 2.0 - 1.0;
    vec3 nb = texture2D(normalMap, f2).xyz * 2.0 - 1.0;
    cecilNrm = cUdn(normalize(na), nb, 0.75);
  }
#endif
  {
    float df = 1.0 - smoothstep(1.4, 5.5, length(vViewPosition));
    #ifdef CECIL_TRIPLANAR
      vec3 an = abs(cWN);
      vec2 duv = an.x > max(an.y, an.z) ? vCWPos.zy : (an.y > an.z ? vCWPos.xz : vCWPos.xy);
      vec3 dn = texture2D(uCDetail, duv * uCA.w).xyz * 2.0 - 1.0;
      vec3 ct = normalize(cross(cWN, abs(cWN.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
      cecilNrm = normalize(cecilNrm + (ct * dn.x + cross(cWN, ct) * dn.y) * uCB.y * df);
    #else
      vec3 dn = texture2D(uCDetail, cuv * uCA.w).xyz * 2.0 - 1.0;
      cecilNrm = cUdn(cecilNrm, dn, uCB.y * df);
    #endif
  }
  float cg = cGrunge(vCWPos, uCA.y);
  float damp = smoothstep(0.46, 0.92, cMacroLow(vCWPos, uCA.y)) * uCC.y;
  // 벽 하단 습기 자국 / 몰딩 근처 그을음. UV가 아니라 월드 높이에 걸어야 벽지 한 롤을 가로지르는
  // 띠가 되고, 텍스처 반복 주기와 무관해져 D3 반복 인지를 끊는다. uCD.y/uCD.w=0이면 완전 무효.
  float wob = cVal3(vCWPos * vec3(0.55, 2.1, 0.55)) - 0.5;
  float rise = clamp((uCD.x + wob * 0.24 - vCWPos.y) * uCD.y, 0.0, 1.0); rise *= rise;
  float soot = clamp((vCWPos.y - uCD.z + wob * 0.20) * uCD.w, 0.0, 1.0); soot *= soot;
  cecilAlb = a4.rgb * mix(1.0 - uCA.z, 1.0 + uCA.z * 0.30, cg);
  cecilAlb *= mix(vec3(1.0), vec3(0.66, 0.73, 0.84), damp);
  cecilAlb *= mix(vec3(1.0), vec3(0.50, 0.42, 0.31), rise * 0.85);
  cecilAlb *= mix(vec3(1.0), vec3(0.55, 0.545, 0.545), soot * 0.80);
  cecilAlp = a4.a;
  cecilAo = mix(1.0 - uCB.w, 1.0, o4.r) * mix(1.0 - uCA.z * 0.45, 1.0, cg) * (1.0 - damp * 0.18) * (1.0 - rise * 0.22 - soot * 0.10);
  float crg = clamp(o4.g * mix(1.0 + uCA.z * 0.55, 1.0 - uCA.z * 0.30, cg) + rise * 0.16 + soot * 0.10, 0.015, 1.0);
  cecilRgh = cToksvig(cnv, mix(crg, crg * 0.52, damp), uCC.x);
  cecilMtl = o4.b;
  diffuseColor.rgb *= cecilAlb;
  diffuseColor.a *= cecilAlp;
`

const CHUNK_NORMAL = `
#ifdef CECIL_TRIPLANAR
  normal = normalize((viewMatrix * vec4(cecilNrm, 0.0)).xyz);
#else
  normal = normalize(tbn * cecilNrm);
#endif
`

const CHUNK_AO = `
  float ambientOcclusion = cecilAo;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_CLEARCOAT )
    clearcoatSpecularIndirect *= ambientOcclusion;
  #endif
  #if defined( USE_SHEEN )
    sheenSpecularIndirect *= ambientOcclusion;
  #endif
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
  #endif
`

const VERT_HEAD = `
varying vec3 vCWPos;
varying vec3 vCWNrm;
`

// opts.band = [습기 상단 월드Y, 습기 띠 높이, 그을음 하단 월드Y, 그을음 띠 높이]
function bandParams (b) {
  if (!b) return [-1e4, 0, 1e4, 0]
  return [b[0], 1 / Math.max(b[1], 1e-3), b[2], 1 / Math.max(b[3], 1e-3)]
}

export function applyCecil (material, opts, quality, detailTex) {
  const pom = !!(opts.parallax && quality.parallax)
  const key = [opts.triplanar ? 'T' : '', opts.stochastic ? 'S' : '', pom ? 'P' + quality.parallaxSteps : '', opts.flow ? 'F' : ''].join('')
  const u = {
    uCDetail: { value: detailTex },
    uCTime: { value: 0 },
    uCA: { value: new THREE.Vector4(opts.triplanar || 1, opts.grungeScale ?? 0.35, opts.grunge ?? 0.16, opts.detailTile ?? 4) },
    uCB: { value: new THREE.Vector4(opts.parallax ?? 0, opts.detail ?? 0.5, opts.flow ?? 0, opts.ao ?? 0.6) },
    uCC: { value: new THREE.Vector4(opts.toks ?? 1.4, opts.damp ?? 0.30, 0, 0) },
    uCD: { value: new THREE.Vector4(...bandParams(opts.band)) }
  }
  material.userData.cecil = u
  material.defines = material.defines || {}
  if (opts.triplanar) material.defines.CECIL_TRIPLANAR = ''
  else if (opts.stochastic) material.defines.CECIL_STOCH = ''
  if (pom) material.defines.CECIL_POM = ''
  if (opts.flow) material.defines.CECIL_FLOW = ''

  const head = [
    VERT_HEAD,
    'uniform sampler2D uCDetail;',
    'uniform float uCTime;',
    'uniform vec4 uCA;',
    'uniform vec4 uCB;',
    'uniform vec4 uCC;',
    'uniform vec4 uCD;',
    'vec3 cecilAlb; vec3 cecilNrm; float cecilRgh; float cecilMtl; float cecilAo; float cecilAlp;',
    NOISE, SUPPORT,
    opts.triplanar ? triplanarPatch({ sharpness: opts.triSharp ?? 6 }) : '',
    opts.stochastic ? stochasticTile({ blendPower: opts.stochPower ?? 7 }) : '',
    pom ? pomPatch(quality.parallaxSteps) : ''
  ].join('\n')

  material.onBeforeCompile = (shader) => {
    for (const k in u) shader.uniforms[k] = u[k]
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec3 cnrm = objectNormal;
        #ifdef USE_INSTANCING
          cnrm = mat3( instanceMatrix ) * cnrm;
        #endif
        vCWNrm = normalize( mat3( modelMatrix ) * cnrm );`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 cwp = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          cwp = instanceMatrix * cwp;
        #endif
        #ifdef USE_BATCHING
          cwp = batchingMatrix * cwp;
        #endif
        vCWPos = ( modelMatrix * cwp ).xyz;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <map_fragment>', CHUNK_MAP)
      .replace('#include <normal_fragment_maps>', CHUNK_NORMAL)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = cecilRgh;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = cecilMtl;')
      .replace('#include <aomap_fragment>', CHUNK_AO)
  }
  material.customProgramCacheKey = () => 'cecil' + key
  if (opts.flow) {
    material.onBeforeRender = () => { u.uCTime.value = tickTime() }
  }
  material.needsUpdate = true
  return material
}

let _time = null
export function tick (t) { _time = t }
function tickTime () { return _time !== null ? _time : (typeof window !== 'undefined' && window.__ENGINE__ ? window.__ENGINE__.time : 0) }

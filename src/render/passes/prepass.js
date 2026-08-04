// 지오메트리 프리패스 — 뷰스페이스 노멀 + 선형 깊이(attachment 0), 스크린스페이스 속도(attachment 1),
// 실효 러프니스(attachment 2).
// MRT 한 번으로 세 버퍼를 채운다. 씬을 두 번 도는 것보다 드로우콜이 절반이고,
// 어태치먼트를 늘리는 것만으로는 드로우콜이 늘지 않는다.

import * as THREE from 'three'

const VERT = /* glsl */`
#include <common>
#include <batching_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

uniform mat4 uCurrMVP;
uniform mat4 uPrevMVP;

uniform mat3 uRoughUv;

out vec3 vNormal;
out vec4 vCurrClip;
out vec4 vPrevClip;
out float vViewDepth;
out vec2 vRoughUv;

void main () {
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphinstance_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>

  vNormal = transformedNormal;
  vViewDepth = - mvPosition.z;
  vRoughUv = ( uRoughUv * vec3( uv, 1.0 ) ).xy;

  // 속도는 지터 없는 행렬로 뽑는다. 래스터라이즈는 지터된 projectionMatrix(project_vertex)로 하되
  // 벡터 자체에는 지터가 섞이면 안 된다 — TAA가 그 지터를 이동으로 오인한다.
  vec4 objPos = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    objPos = batchingMatrix * objPos;
  #endif
  #ifdef USE_INSTANCING
    objPos = instanceMatrix * objPos;
  #endif
  vCurrClip = uCurrMVP * objPos;
  vPrevClip = uPrevMVP * objPos;
}
`

const FRAG = /* glsl */`
precision highp float;

uniform sampler2D uRoughMap;
uniform float uHasRoughMap;
uniform float uRough;
uniform float uCoat;
uniform float uCoatRough;

in vec3 vNormal;
in vec4 vCurrClip;
in vec4 vPrevClip;
in float vViewDepth;
in vec2 vRoughUv;

layout(location = 0) out vec4 oNormalDepth;
layout(location = 1) out vec2 oVelocity;
layout(location = 2) out float oRoughness;

void main () {
  vec3 n = normalize( vNormal );
  if ( ! gl_FrontFacing ) n = - n;

  vec2 vel = vec2( 0.0 );
  if ( vCurrClip.w > 1e-5 && vPrevClip.w > 1e-5 ) {
    vel = vCurrClip.xy / vCurrClip.w - vPrevClip.xy / vPrevClip.w;
  }

  // three와 같은 규약: roughnessMap.g 가 베이스 러프니스에 곱해진다.
  float rough = uRough;
  if ( uHasRoughMap > 0.5 ) rough *= texture( uRoughMap, vRoughUv ).g;
  // SSR이 실제로 보는 건 코트 롭이다 — 얇은 바니시·페인트 막이 있으면 그쪽이 반사를 지배한다.
  rough = mix( rough, uCoatRough, uCoat );

  oNormalDepth = vec4( n, vViewDepth );
  oVelocity = vel;
  oRoughness = clamp( rough, 0.0, 1.0 );
}
`

const CLEAR_FRAG = /* glsl */`
precision highp float;
uniform float uFar;
layout(location = 0) out vec4 oNormalDepth;
layout(location = 1) out vec2 oVelocity;
layout(location = 2) out float oRoughness;
void main () {
  oNormalDepth = vec4( 0.0, 0.0, 1.0, uFar );
  oVelocity = vec2( 0.0 );
  oRoughness = 1.0;
}
`

const CLEAR_VERT = /* glsl */`
void main () { gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`

function isOpaqueMesh (o) {
  const m = o.material
  if (!m) return false
  if (Array.isArray(m)) return m.every(x => !x.transparent)
  return !m.transparent
}

export default class Prepass {
  async init (ctx) {
    this.prev = new WeakMap()
    this.hidden = []
    this.vp = new THREE.Matrix4()
    this.tmp = new THREE.Matrix4()

    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uCurrMVP: { value: new THREE.Matrix4() },
        uPrevMVP: { value: new THREE.Matrix4() },
        uRoughMap: { value: null },
        uRoughUv: { value: new THREE.Matrix3() },
        uHasRoughMap: { value: 0 },
        uRough: { value: 1 },
        uCoat: { value: 0 },
        uCoatRough: { value: 0 }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      fog: false
    })

    // 오버라이드 재질은 오브젝트 전부가 공유하므로, 프레임 MVP는 오브젝트 직전에 밀어넣고
    // uniformsNeedUpdate로 업로드를 강제해야 한다 (three는 재질이 같으면 유니폼을 재업로드하지 않는다).
    this.mat.onBeforeRender = (renderer, scene, camera, geometry, object, group) => {
      const u = this.mat.uniforms
      const curr = this.tmp.multiplyMatrices(this.vp, object.matrixWorld)
      let prev = this.prev.get(object)
      if (prev === undefined) {
        prev = new THREE.Matrix4().copy(curr)
        this.prev.set(object, prev)
      }
      u.uPrevMVP.value.copy(prev)
      u.uCurrMVP.value.copy(curr)
      prev.copy(curr)

      // overrideMaterial이 걸려도 object.material은 원본이다. 여기서만 원본을 읽어
      // 러프니스를 어태치먼트 2로 흘린다. PBR이 아닌 재질(전구·유리 셸)은 1.0 — 반사하지 않는다.
      let src = object.material
      if (Array.isArray(src)) src = src[group ? group.materialIndex : 0]
      const map = src && src.roughnessMap
      u.uRough.value = src && src.roughness !== undefined ? src.roughness : 1
      u.uCoat.value = src && src.clearcoat ? src.clearcoat : 0
      u.uCoatRough.value = src && src.clearcoatRoughness !== undefined ? src.clearcoatRoughness : 0
      u.uHasRoughMap.value = map ? 1 : 0
      u.uRoughMap.value = map || null
      if (map) {
        if (map.matrixAutoUpdate) map.updateMatrix()
        u.uRoughUv.value.copy(map.matrix)
      } else {
        u.uRoughUv.value.identity()
      }
      this.mat.uniformsNeedUpdate = true
    }

    this.clearMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { uFar: { value: ctx.camera.far } },
      vertexShader: CLEAR_VERT,
      fragmentShader: CLEAR_FRAG,
      depthTest: false,
      depthWrite: false
    })
  }

  setSize () {}

  render (ctx) {
    const { renderer, scene, camera, targets } = ctx
    this.vp.copy(ctx.matrices.viewProj)
    this.clearMat.uniforms.uFar.value = camera.far

    // 유리·파티클·라인은 노멀/깊이 버퍼를 오염시킨다 (GTAO·SSR가 실제 벽 대신 유리면을 맞음)
    const hidden = this.hidden
    hidden.length = 0
    scene.traverse((o) => {
      if (!o.visible) return
      if (o.isSprite || o.isPoints || o.isLine || (o.isMesh && !isOpaqueMesh(o))) {
        o.visible = false
        hidden.push(o)
      }
    })

    const bg = scene.background
    const om = scene.overrideMaterial
    scene.background = null
    scene.overrideMaterial = this.mat

    renderer.setRenderTarget(targets.normal)
    renderer.clear(false, true, false)
    ctx.fsq(this.clearMat, targets.normal)
    renderer.setRenderTarget(targets.normal)
    renderer.render(scene, camera)

    scene.overrideMaterial = om
    scene.background = bg
    for (let i = 0; i < hidden.length; i++) hidden[i].visible = true
    hidden.length = 0
  }

  dispose () {
    this.mat.dispose()
    this.clearMat.dispose()
  }
}

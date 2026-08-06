import{L as e,X as t,Y as n,pn as r}from"./three.core-_aCheQum.js";var i=`
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
`,a=`
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
`,o=`
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
`,s=`
void main () { gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;function c(e){let t=e.material;return t?Array.isArray(t)?t.every(e=>!e.transparent):!t.transparent:!1}var l=class{async init(c){this.prev=new WeakMap,this.hidden=[],this.vp=new t,this.tmp=new t,this.mat=new r({glslVersion:e,uniforms:{uCurrMVP:{value:new t},uPrevMVP:{value:new t},uRoughMap:{value:null},uRoughUv:{value:new n},uHasRoughMap:{value:0},uRough:{value:1},uCoat:{value:0},uCoatRough:{value:0}},vertexShader:i,fragmentShader:a,side:2,fog:!1}),this.mat.onBeforeRender=(e,n,r,i,a,o)=>{let s=this.mat.uniforms,c=this.tmp.multiplyMatrices(this.vp,a.matrixWorld),l=this.prev.get(a);l===void 0&&(l=new t().copy(c),this.prev.set(a,l)),s.uPrevMVP.value.copy(l),s.uCurrMVP.value.copy(c),l.copy(c);let u=a.material;Array.isArray(u)&&(u=u[o?o.materialIndex:0]);let d=u&&u.roughnessMap;s.uRough.value=u&&u.roughness!==void 0?u.roughness:1,s.uCoat.value=u&&u.clearcoat?u.clearcoat:0,s.uCoatRough.value=u&&u.clearcoatRoughness!==void 0?u.clearcoatRoughness:0,s.uHasRoughMap.value=+!!d,s.uRoughMap.value=d||null,d?(d.matrixAutoUpdate&&d.updateMatrix(),s.uRoughUv.value.copy(d.matrix)):s.uRoughUv.value.identity(),this.mat.uniformsNeedUpdate=!0},this.clearMat=new r({glslVersion:e,uniforms:{uFar:{value:c.camera.far}},vertexShader:s,fragmentShader:o,depthTest:!1,depthWrite:!1})}setSize(){}render(e){let{renderer:t,scene:n,camera:r,targets:i}=e;this.vp.copy(e.matrices.viewProj),this.clearMat.uniforms.uFar.value=r.far;let a=this.hidden;a.length=0,n.traverse(e=>{e.visible&&(e.isSprite||e.isPoints||e.isLine||e.isMesh&&!c(e))&&(e.visible=!1,a.push(e))});let o=n.background,s=n.overrideMaterial;n.background=null,n.overrideMaterial=this.mat,t.setRenderTarget(i.normal),t.clear(!1,!0,!1),e.fsq(this.clearMat,i.normal),t.setRenderTarget(i.normal),t.render(n,r),n.overrideMaterial=s,n.background=o;for(let e=0;e<a.length;e++)a[e].visible=!0;a.length=0}dispose(){this.mat.dispose(),this.clearMat.dispose()}};export{l as t};
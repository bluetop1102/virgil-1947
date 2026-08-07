import{$ as e,En as t,G as n,In as r,L as i,N as a,Rn as o,St as s,W as c,an as l,c as u,dn as d,o as f,pn as p,tn as m}from"./three.core-BesWO3HN.js";import{a as h,i as g,n as _,o as v,r as y,t as b}from"./glsl-6T1IWhSU.js";var x=new f;x.setAttribute(`position`,new a([-1,-1,0,3,-1,0,-1,3,0],3));var S=new u,C=`precision highp float;
in vec3 position;
out vec2 vUv;
void main () { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,w=`precision highp float;
precision highp int;
in vec2 vUv;
uniform float uSeed;
uniform float uTexel;
uniform float uBump;
uniform vec4 uP;
${b}
${_}
#define FBM(uv, f, o) cFbm((uv) * (f), (f), o)
#define FBMR(uv, f, o) cFbmR((uv) * (f), (f), o)
#define WOR(uv, f, j) cWorley((uv) * (f), (f), j)
#define CRK(uv, f, w, j) cCrack((uv) * (f), (f), w, j)
#define WRP(uv, f, a, o) (cWarp((uv) * (f), (f), a, o) / (f))
`,T=`
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
}`,E=[],D=null;function O(t){return D||(D=new e(x,t),D.frustumCulled=!1,D._scene=new p,D._scene.add(D)),D.material=t,D._scene}function k(e,t){return e.colorSpace=t,e.wrapS=e.wrapT=l,e.minFilter=n,e.magFilter=c,e.generateMipmaps=!0,e.channel=0,e}function A(e,t,n){let r=e.getRenderTarget(),i=e.autoClear;e.autoClear=!1,e.setRenderTarget(t),e.render(O(n),S),e.setRenderTarget(r),e.autoClear=i,n.dispose()}function j(e,n,a={},c=512,l=``){let u=new o(c,c,{type:t,format:s,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!0});k(u.texture,l);let d={uSeed:{value:0},uTexel:{value:1/c},uBump:{value:1},uP:{value:new r}};for(let e in a)d[e]=a[e];return A(e,u,new m({glslVersion:i,vertexShader:C,uniforms:d,fragmentShader:`${w}\nlayout(location = 0) out vec4 oCol;\n${n}`,depthTest:!1,depthWrite:!1})),E.push(u),u.texture}function M(e,n,a){let c=new o(a,a,{count:3,type:t,format:s,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!0}),l=Math.min(16,e.capabilities.getMaxAnisotropy());k(c.textures[0],d).anisotropy=l,k(c.textures[1],``).anisotropy=l,k(c.textures[2],``).anisotropy=l;let u=n.p||[0,0,0,0];return A(e,c,new m({glslVersion:i,vertexShader:C,fragmentShader:`${w}\n${n.glsl}\n${T}`,uniforms:{uSeed:{value:n.seed??1},uTexel:{value:1/a},uBump:{value:(n.bump??1)*a/1024},uP:{value:new r(u[0],u[1],u[2],u[3])}},depthTest:!1,depthWrite:!1})),E.push(c),{albedo:c.textures[0],normal:c.textures[1],orm:c.textures[2]}}var N=null;function P(e,t=512){return N||(N=j(e,`
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
}`,{},t,``),N.anisotropy=Math.min(4,e.capabilities.getMaxAnisotropy()),N)}function F(){for(let e of E)e.dispose();E.length=0,N=null}var I=`
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
  // 스펙큘러 AA(커널 러프니스). Toksvig 는 밉맵이 평균낸 **텍스처** 노멀 분산만 되돌린다 —
  // 한 픽셀 안에서 노멀을 흔드는 주체가 지오메트리일 때(격자 살·자루 직조·스침각 몰딩)는
  // 손대지 못해 하이라이트가 1px 반딧불과 순백 막대로 남는다(심사 D1 / G8).
  // 화면공간 노멀 변화율을 러프니스 하한으로 환산해 그 픽셀에서만 하이라이트를 넓힌다.
  {
#ifndef FLAT_SHADED
    vec3 gnx = dFdx(vNormal), gny = dFdy(vNormal);
#else
    vec3 gnx = vec3(0.0), gny = vec3(0.0);
#endif
    vec3 tnx = dFdx(cecilNrm), tny = dFdy(cecilNrm);
    float varN = dot(gnx, gnx) + dot(gny, gny) + dot(tnx, tnx) + dot(tny, tny);
    cecilRgh = clamp(sqrt(cecilRgh * cecilRgh + min(varN * uCC.z, uCC.w)), 0.015, 1.0);
  }
  cecilMtl = o4.b;
  diffuseColor.rgb *= cecilAlb;
  diffuseColor.a *= cecilAlp;
`,L=`
#ifdef CECIL_TRIPLANAR
  normal = normalize((viewMatrix * vec4(cecilNrm, 0.0)).xyz);
#else
  normal = normalize(tbn * cecilNrm);
#endif
`,R=`
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
`,z=`
varying vec3 vCWPos;
varying vec3 vCWNrm;
`;function B(e){return e?[e[0],1/Math.max(e[1],.001),e[2],1/Math.max(e[3],.001)]:[-1e4,0,1e4,0]}function V(e,t,n,i){let a=!!(t.parallax&&n.parallax),o=[t.triplanar?`T`:``,t.stochastic?`S`:``,a?`P`+n.parallaxSteps:``,t.flow?`F`:``].join(``),s={uCDetail:{value:i},uCTime:{value:0},uCA:{value:new r(t.triplanar||1,t.grungeScale??.35,t.grunge??.16,t.detailTile??4)},uCB:{value:new r(t.parallax??0,t.detail??.5,t.flow??0,t.ao??.6)},uCC:{value:new r(t.toks??1.4,t.damp??.3,t.specAA??20,t.specAAMax??.45)},uCD:{value:new r(...B(t.band))}};e.userData.cecil=s,e.defines=e.defines||{},t.triplanar?e.defines.CECIL_TRIPLANAR=``:t.stochastic&&(e.defines.CECIL_STOCH=``),a&&(e.defines.CECIL_POM=``),t.flow&&(e.defines.CECIL_FLOW=``);let c=[z,`uniform sampler2D uCDetail;`,`uniform float uCTime;`,`uniform vec4 uCA;`,`uniform vec4 uCB;`,`uniform vec4 uCC;`,`uniform vec4 uCD;`,`vec3 cecilAlb; vec3 cecilNrm; float cecilRgh; float cecilMtl; float cecilAo; float cecilAlp;`,b,y,t.triplanar?v({sharpness:t.triSharp??6}):``,t.stochastic?h({blendPower:t.stochPower??7}):``,a?g(n.parallaxSteps):``].join(`
`);return e.onBeforeCompile=e=>{for(let t in s)e.uniforms[t]=s[t];e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+z).replace(`#include <beginnormal_vertex>`,`#include <beginnormal_vertex>
        vec3 cnrm = objectNormal;
        #ifdef USE_INSTANCING
          cnrm = mat3( instanceMatrix ) * cnrm;
        #endif
        vCWNrm = normalize( mat3( modelMatrix ) * cnrm );`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
        vec4 cwp = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          cwp = instanceMatrix * cwp;
        #endif
        #ifdef USE_BATCHING
          cwp = batchingMatrix * cwp;
        #endif
        vCWPos = ( modelMatrix * cwp ).xyz;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
`+c).replace(`#include <map_fragment>`,I).replace(`#include <normal_fragment_maps>`,L).replace(`#include <roughnessmap_fragment>`,`float roughnessFactor = cecilRgh;`).replace(`#include <metalnessmap_fragment>`,`float metalnessFactor = cecilMtl;`).replace(`#include <aomap_fragment>`,R)},e.customProgramCacheKey=()=>`cecil`+o,t.flow&&(e.onBeforeRender=()=>{s.uCTime.value=W()}),e.needsUpdate=!0,e}var H=null;function U(e){H=e}function W(){return H===null?typeof window<`u`&&window.__ENGINE__?window.__ENGINE__.time:0:H}export{F as a,P as i,j as n,U as o,M as r,V as t};
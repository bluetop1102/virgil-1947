import{$ as e,Fn as t,In as n,N as r,Pn as i,Q as a,R as o,a as s,ft as c,mn as l,mt as u,o as d}from"./three.core-BesWO3HN.js";import{a as f,c as p,o as m,r as h,s as g,t as _}from"./util-Co7KvJK9.js";import{_ as v,c as y,d as b,f as x,l as S,m as C,n as w,t as T,u as E,x as D,y as O}from"./kit-B67v3mBg.js";import{r as k,t as A}from"./kit-mat--KRVKok3.js";import{d as j,i as M,n as N,o as P,r as ee,t as F,u as te}from"./props-detail-BNG5f39m.js";import{a as ne,c as re,d as ie,f as ae,i as oe,l as se,n as ce,o as le,r as ue,s as I,t as de,u as fe}from"./props-fixtures-BSjB6KMR.js";import{t as pe}from"./props-decor-C61CrzJ5.js";import{a as me,c as he,d as ge,l as _e,m as ve,n as ye,p as be,r as xe,s as L,u as Se}from"./props-jIpxIwm9.js";import{a as Ce,i as we,n as Te,o as Ee,r as De,t as Oe}from"./props-corridor-DX5KZl23.js";var R=`
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
}`,z=`
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uSoft, uSoftFade;
float softFade (float vz) {
  if (uSoft < 0.5) return 1.0;
  float sceneZ = abs(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).a);
  if (sceneZ < 0.001) return 1.0;
  return clamp((sceneZ - vz) / uSoftFade, 0.0, 1.0);
}`,B=`
vec3 wrapBox (vec3 p, vec3 box, vec3 c) {
  vec3 d = p - c + box * 0.5;
  return c + mod(mod(d, box) + box, box) - box * 0.5;
}`;function V(e,t,n=3){let r=g(t),i=new Float32Array(e*n);for(let t=0;t<e*n;t++)i[t]=r();return new s(i,n)}function ke(e,t,n){let r=g(n),i=new Float32Array(e*3);for(let n=0;n<e;n++)i[n*3]=(r()-.5)*t[0],i[n*3+1]=(r()-.5)*t[1],i[n*3+2]=(r()-.5)*t[2];return new s(i,3)}function H(e){return{uTime:{value:0},uBox:{value:new t().fromArray(e)},uCam:{value:new t},uWind:{value:new t(.05,.01,.03)},uPix:{value:600},uOpacity:{value:1},uTint:{value:new t(1,1,1)},uAmbient:{value:new t(.02,.02,.025)},uLP:{value:[0,1,2,3].map(()=>new n)},uLC:{value:[0,1,2,3].map(()=>new n)},uLD:{value:[0,1,2,3].map(()=>new n(0,-1,0,-1))},uSceneDepth:{value:null},uResolution:{value:new i(1280,720)},uSoft:{value:0},uSoftFade:{value:.6},uGain:{value:1},uCeil:{value:2.2},uAmbScale:{value:1},uVisRef:{value:.55},uKnee:{value:0}}}function U(e){return e.frustumCulled=!1,e.castShadow=!1,e.receiveShadow=!1,e.renderOrder=10,e.userData.noPrepass=!0,e.userData.atmoParticles=!0,e}function Ae(e,t,n){let r=new d;r.setAttribute(`position`,ke(e,t,n)),r.setAttribute(`aSeed`,V(e,n+17));let i=H(t);i.uSize={value:.0042},i.uMaxPx={value:8},i.uFocus={value:0},i.uNearRef={value:2.4},i.uApertureK={value:1.7},i.uAmbScale.value=.15,i.uSoftFade.value=.15;let a=new l({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:i,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uMaxPx, uFocus, uNearRef, uApertureK;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${R}
      ${B}
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
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${z}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        // smoothstep(1.0, 0.05, r)는 2px 스프라이트에서 모든 프래그먼트가 같은 알파를 받아
        // 각진 정사각형이 된다. 가우시안은 중심에서 가장자리까지 연속으로 떨어진다.
        float a = exp(-4.5 * r * r);
        a *= uOpacity * vTw * vA * softFade(vZ);
        gl_FragColor = vec4(vLit * uTint, a);
      }`});return U(new u(r,a))}function je(e,t,n){let r=new d;r.setAttribute(`position`,ke(e,t,n+3)),r.setAttribute(`aSeed`,V(e,n+41));let i=H(t);i.uSize={value:.085},i.uRise={value:.11},i.uMaxPx={value:96},i.uRefPx={value:46},i.uAmbScale.value=.3,i.uGain.value=.18,i.uCeil.value=.26,i.uKnee.value=1;let a=new l({transparent:!0,depthWrite:!1,blending:1,fog:!1,uniforms:i,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uRise, uMaxPx, uRefPx;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${R}
      ${B}
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
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${z}
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
      }`});return U(new u(r,a))}var Me=class{constructor(e){let t=Math.max(e?.particles??1,.05);this.group=new o,this.group.name=`atmo.particles`,this.sys={dust:Ae(Math.round(4200*t),[16,5,16],991),smoke:je(Math.round(220*t),[10,3.2,10],227)};for(let e of Object.keys(this.sys))this.group.add(this.sys[e]);this.base={dust:.55,smoke:.3}}applyMood(e){let t=e.particles,n=t.box||[16,5,16];for(let n of Object.keys(this.sys)){let r=this.sys[n],i=t[n]??0;r.visible=i>.001,r.material.uniforms.uOpacity.value=this.base[n]*i,r.material.uniforms.uWind.value.fromArray(e.fog.windDir).multiplyScalar(3.5)}this.sys.dust.material.uniforms.uBox.value.set(n[0],n[1],n[2]),this.sys.smoke.material.uniforms.uBox.value.set(n[0]*.7,n[1]*.8,n[2]*.7);let r=e.fog.color,i=Math.max(r[0],r[1],r[2],1e-5),a=.55;this.sys.dust.material.uniforms.uTint.value.set((.35+.65*r[0]/i)*a,(.35+.65*r[1]/i)*a,(.35+.65*r[2]/i)*a),this.sys.smoke.material.uniforms.uTint.value.set(.85,.86,.9);let o=e.hemi.sky;for(let e of Object.keys(this.sys))this.sys[e].material.uniforms.uAmbient.value.set(o[0]*1.4,o[1]*1.4,o[2]*1.4)}update(e,t,n,r,i,a,o=2){let s=this.sys.dust.material.uniforms;s.uMaxPx.value=4*o,s.uFocus.value=t.userData?.focus??0;for(let o of Object.keys(this.sys)){let s=this.sys[o].material.uniforms;s.uTime.value=e,s.uCam.value.copy(t.position),s.uPix.value=a,s.uSceneDepth.value=r,s.uSoft.value=+!!r,s.uResolution.value.copy(i);for(let e=0;e<4;e++){let t=n[e];if(!t){s.uLC.value[e].set(0,0,0,0);continue}s.uLP.value[e].set(t.pos.x,t.pos.y,t.pos.z,t.range),s.uLC.value[e].set(t.col.x,t.col.y,t.col.z,t.power),s.uLD.value[e].set(t.dir.x,t.dir.y,t.dir.z,t.cos)}}}dispose(){for(let e of Object.keys(this.sys))this.sys[e].geometry.dispose(),this.sys[e].material.dispose()}};function Ne(t,n,r,i={}){let a=g(r),o=new Float32Array(t*4*3),c=new Float32Array(t*4*2),u=new Float32Array(t*4*3),f=new Uint32Array(t*6),p=[[-1,0],[1,0],[1,1],[-1,1]];for(let e=0;e<t;e++){let t=(a()-.5)*n[0],r=(a()-.5)*n[1],i=(a()-.5)*n[2],s=a(),l=a(),d=a();for(let n=0;n<4;n++){let a=e*4+n;o[a*3]=t,o[a*3+1]=r,o[a*3+2]=i,c[a*2]=p[n][0],c[a*2+1]=p[n][1],u[a*3]=s,u[a*3+1]=l,u[a*3+2]=d}let m=e*4;f.set([m,m+1,m+2,m,m+2,m+3],e*6)}let m=new d;m.setAttribute(`position`,new s(o,3)),m.setAttribute(`aCorner`,new s(c,2)),m.setAttribute(`aSeed`,new s(u,3)),m.setIndex(new s(f,1));let h=H(n);h.uSpeed={value:i.speed??16},h.uShutter={value:i.shutter??.048},h.uPxWidth={value:i.px??1.5},h.uHead={value:i.head??.3},h.uSoftFade.value=.35;let _=new l({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:h,vertexShader:`
      attribute vec2 aCorner; attribute vec3 aSeed;
      uniform float uTime, uSpeed, uShutter, uPxWidth, uPix;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${R}
      ${B}
      void main () {
        float sp = uSpeed * (0.78 + aSeed.y * 0.52);
        vec3 vel = vec3(uWind.x * 7.0, -sp, uWind.z * 7.0);
        vec3 c = wrapBox(position + vel * uTime, uBox, uCam);
        vec3 mv = (viewMatrix * vec4(c, 1.0)).xyz;
        // 스트릭 길이 = 낙하속도 x 셔터 시간. 노출 시간 안에 이동한 거리가 곧 모션블러다
        float len = sp * uShutter * (0.72 + aSeed.z * 0.66);
        vec3 aV = normalize((viewMatrix * vec4(normalize(vel), 0.0)).xyz);
        vec3 pv = mv + aV * (len * (aCorner.y - 0.5));
        vec3 side = normalize(cross(aV, normalize(-pv)));
        float px = uPxWidth * (0.72 + aSeed.x * 0.62);
        pv += side * (aCorner.x * 0.5 * px * max(-pv.z, 0.05) / max(uPix, 1.0));
        vZ = -pv.z;
        vAlong = aCorner.y;
        vSide = aCorner.x;
        vLit = scatter(c, normalize(uCam - c), 2.6);
        gl_Position = projectionMatrix * vec4(pv, 1.0);
      }`,fragmentShader:`
      uniform float uOpacity, uHead; uniform vec3 uTint;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${z}
      void main () {
        float across = smoothstep(1.0, 0.15, abs(vSide));
        float a = across * mix(uHead, 1.0, vAlong) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.7 + vLit * 1.8), a);
      }`});return U(new e(m,_))}function Pe(t,n,r){let i=g(r),a=new Float32Array(t*4*3),o=new Float32Array(t*4*2),c=new Float32Array(t*4*2),u=new Uint32Array(t*6),f=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let e=0;e<t;e++){let t=(i()-.5)*n[0],r=(i()-.5)*n[2],s=i(),l=.55+i()*1.15;for(let n=0;n<4;n++){let i=e*4+n;a[i*3]=f[n][0],a[i*3+1]=0,a[i*3+2]=f[n][1],o[i*2]=t,o[i*2+1]=r,c[i*2]=s,c[i*2+1]=l}let d=e*4;u.set([d,d+1,d+2,d,d+2,d+3],e*6)}let p=new d;p.setAttribute(`position`,new s(a,3)),p.setAttribute(`aCenter`,new s(o,2)),p.setAttribute(`aSeed`,new s(c,2)),p.setIndex(new s(u,1));let m=H(n);m.uMaxR={value:.3},m.uGroundY={value:0},m.uSoftFade.value=.25;let h=new l({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:m,vertexShader:`
      attribute vec2 aCenter; attribute vec2 aSeed;
      uniform float uTime, uMaxR, uGroundY;
      uniform vec3 uBox, uCam;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${R}
      void main () {
        float life = fract(aSeed.x + uTime * aSeed.y);
        vec2 d = aCenter - uCam.xz + uBox.xz * 0.5;
        vec2 cxz = uCam.xz + mod(mod(d, uBox.xz) + uBox.xz, uBox.xz) - uBox.xz * 0.5;
        float s = 0.03 + uMaxR * life;
        vec3 wp = vec3(cxz.x + position.x * s, uGroundY + 0.008, cxz.y + position.z * s);
        vUv = position.xz;
        vLife = life;
        vLit = scatter(wp, normalize(uCam - wp), 0.8);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${z}
      void main () {
        float r = length(vUv);
        // 두 겹 링 — 바깥 파면이 앞서고 안쪽이 뒤따른다
        float ring = smoothstep(0.55, 0.88, r) * smoothstep(1.02, 0.90, r);
        float ring2 = smoothstep(0.20, 0.44, r) * smoothstep(0.62, 0.48, r) * 0.55;
        float crown = smoothstep(0.34, 0.0, r) * (1.0 - smoothstep(0.0, 0.22, vLife));
        float a = (ring + ring2 + crown * 0.9) * pow(1.0 - vLife, 1.5) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.9 + vLit * 1.4), a);
      }`});return U(new e(p,h))}function Fe(e,t,n){let r=g(n),i=new Float32Array(e*3),a=new Float32Array(e*3);for(let n=0;n<e;n++)i[n*3]=(r()-.5)*t[0],i[n*3+1]=0,i[n*3+2]=(r()-.5)*t[2],a[n*3]=r(),a[n*3+1]=r(),a[n*3+2]=r();let o=new d;o.setAttribute(`position`,new s(i,3)),o.setAttribute(`aSeed`,new s(a,3));let c=H(t);c.uGroundY={value:0},c.uSize={value:.01},c.uSoftFade.value=.2;let f=new l({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:c,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uGroundY, uSize, uPix;
      uniform vec3 uBox, uCam;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${R}
      void main () {
        float life = fract(aSeed.x + uTime * (1.6 + aSeed.y * 1.9));
        vec2 d = position.xz - uCam.xz + uBox.xz * 0.5;
        vec2 cxz = uCam.xz + mod(mod(d, uBox.xz) + uBox.xz, uBox.xz) - uBox.xz * 0.5;
        // 포물선 — 0.16m 남짓 튀어오르고 떨어진다
        float hgt = 4.0 * life * (1.0 - life) * (0.09 + aSeed.z * 0.11);
        float spread = life * (0.05 + aSeed.y * 0.08);
        float ang = aSeed.z * 6.283;
        vec3 wp = vec3(cxz.x + cos(ang) * spread, uGroundY + hgt, cxz.y + sin(ang) * spread);
        vLit = scatter(wp, normalize(uCam - wp), 1.6);
        vLife = life;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        gl_PointSize = clamp(uSize * (0.5 + aSeed.y) * uPix / max(vZ, 0.08), 1.0, 12.0);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${z}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.1, r) * (1.0 - vLife) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.8 + vLit * 1.6), a);
      }`});return U(new u(o,f))}function Ie(){let n=new l({transparent:!0,depthWrite:!1,depthTest:!1,fog:!1,blending:1,uniforms:{uTime:{value:0},uOpacity:{value:0},uTint:{value:new t(.55,.62,.78)},uAspect:{value:1.78}},vertexShader:`
      varying vec2 vUv;
      void main () {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,fragmentShader:`
      uniform float uTime, uOpacity, uAspect;
      uniform vec3 uTint;
      varying vec2 vUv;

      vec3 h3 (vec2 p) {
        float n = sin(dot(p, vec2(41.3, 289.1))) * 43758.5453;
        return fract(vec3(n, n * 1.7361, n * 3.4142));
      }

      // 셀당 물방울 하나. 셀 크기를 바꿔 두 겹으로 겹치면 크기 분포가 생긴다.
      //
      // 옛 코드는 rim 을 두 smoothstep 의 곱으로 만들어 **닫힌 링**을 그렸고, 그 링을
      // uTint*1.25 로 칠했다 — 크기·밝기·간격이 전부 같은 흰 도넛 100개가 화면을 균일하게
      // 덮어 렌즈에 맺힌 물이 아니라 오버레이 텍스처로 읽혔다(심사 D6/G8 보고분).
      // 실제 물방울은 (1) 광원 쪽 한쪽 호에서만 스펙큘러가 서고 (2) 나머지는 배경을 눌러
      // 어둡게 모으며 (3) 개체마다 크기·불투명도가 크게 다르다. 셋을 전부 넣는다.
      float drops (vec2 uv, float cell, float sizeMul, float slide, float live0, out float rim) {
        vec2 g = uv * cell;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec3 r = h3(id);
        float live = step(live0, r.x);
        // 흘러내림: 큰 방울일수록 빨리 미끄러진다
        float sp = slide * (0.15 + r.y * 0.85);
        float yo = fract(r.x * 7.3 + uTime * sp);
        f.y += 0.5 - yo;
        f.x += (r.z - 0.5) * 0.72;
        f.y = fract(f.y + 0.5) - 0.5;
        // 크기 분포를 세제곱으로 벌린다 — 선형이면 대부분이 중간 크기에 몰려 같은 점이 된다
        float rad = (0.055 + 0.30 * r.y * r.y * r.y) * sizeMul;
        float d = length(f * vec2(1.0, 0.78));
        float body = smoothstep(rad, rad * 0.50, d) * live;
        // 스펙큘러는 닫힌 링이 아니라 광원 쪽 한 호에만 선다
        float arc = clamp(0.5 + 0.5 * dot(normalize(f + 1e-5), vec2(-0.42, 0.91)), 0.0, 1.0);
        rim = smoothstep(rad * 1.02, rad * 0.72, d) * smoothstep(rad * 0.42, rad * 0.74, d)
          * pow(arc, 2.6) * live * (0.35 + 0.65 * r.z);
        return body;
      }

      void main () {
        vec2 uv = vec2(vUv.x * uAspect, vUv.y);
        float r1, r2;
        // 밀도를 절반 이하로 내린다. 옛 값(live 0.42, 셀 7·15)은 화면에 280개 넘게 깔렸다
        float b1 = drops(uv, 6.0, 1.0, 0.030, 0.62, r1);
        float b2 = drops(uv + 13.7, 13.0, 0.70, 0.055, 0.80, r2);
        float body = max(b1, b2 * 0.8);
        float rim = max(r1, r2 * 0.9);
        // 물방울은 배경을 눌러 어둡게 모으고, 광원 쪽 호에서만 빛을 튕긴다
        float a = clamp(body * 0.26 + rim * 0.42, 0.0, 1.0) * uOpacity;
        vec3 col = mix(uTint * 0.10, uTint * 0.95, rim);
        gl_FragColor = vec4(col, a);
      }`}),r=new e(new c(1,1),n);return r.frustumCulled=!1,r.castShadow=!1,r.receiveShadow=!1,r.renderOrder=40,r.name=`atmo.rain.lens`,r}function Le(e,t=1){let n=A(e,{key:`cecil-wet`});return n.roughness=_((e.roughness??1)-.4*t,.03,1),n.envMapIntensity=(e.envMapIntensity??1)*(1+.6*t),n.clearcoat=Math.max(e.clearcoat??0,.9*t),n.clearcoatRoughness=_(.05+(1-t)*.3,.03,.5),n.color.multiplyScalar(1-.3*t),n.name=`${e.name||`mat`}.wet`,n}var Re=class{constructor(e){let n=Math.max(e?.particles??1,.05);this.group=new o,this.group.name=`atmo.rain`,this.sys={far:Ne(Math.round(15e3*n),[15,11,15],613,{px:1.4,speed:17,shutter:.046}),near:Ne(Math.round(1100*n),[3.4,3.2,3.4],811,{px:4,speed:17,shutter:.062,head:.12}),ripple:Pe(Math.round(700*n),[20,1,20],449),spray:Fe(Math.round(1600*n),[16,1,16],523)};for(let e of Object.keys(this.sys))this.group.add(this.sys[e]);this.lens=Ie(),this.group.add(this.lens),this.base={far:.62,near:.34,ripple:.75,spray:.6},this.fwd=new t}applyMood(e,n=0){let r=e.particles,i=r.rain??0,a=r.splash??0,o={far:i,near:i,ripple:a,spray:a};for(let t of Object.keys(this.sys)){let n=this.sys[t];n.visible=o[t]>.001,n.material.uniforms.uOpacity.value=this.base[t]*o[t],n.material.uniforms.uWind.value.fromArray(e.fog.windDir).multiplyScalar(1);let r=e.hemi.sky;n.material.uniforms.uAmbient.value.set(r[0]*2.2,r[1]*2.2,r[2]*2.2)}let s=e.ibl.zenith,c=new t(.42+s[0]*6,.5+s[1]*6,.66+s[2]*6);this.sys.far.material.uniforms.uTint.value.copy(c),this.sys.near.material.uniforms.uTint.value.copy(c).multiplyScalar(.85),this.sys.ripple.material.uniforms.uTint.value.copy(c).multiplyScalar(.6),this.sys.spray.material.uniforms.uTint.value.copy(c).multiplyScalar(.75),this.lens.material.uniforms.uTint.value.copy(c),this.lens.material.uniforms.uOpacity.value=(r.lens??i)*.85,this.lens.visible=this.lens.material.uniforms.uOpacity.value>.001,this.setGround(n)}setGround(e){this.sys.ripple.material.uniforms.uGroundY.value=e,this.sys.spray.material.uniforms.uGroundY.value=e}update(e,t,n,r,i,a){for(let o of Object.keys(this.sys)){let s=this.sys[o].material.uniforms;s.uTime.value=e,s.uCam.value.copy(t.position),s.uPix.value=a,s.uSceneDepth.value=r,s.uSoft.value=+!!r,s.uResolution.value.copy(i);for(let e=0;e<4;e++){let t=n[e];if(!t){s.uLC.value[e].set(0,0,0,0);continue}s.uLP.value[e].set(t.pos.x,t.pos.y,t.pos.z,t.range),s.uLC.value[e].set(t.col.x,t.col.y,t.col.z,t.power),s.uLD.value[e].set(t.dir.x,t.dir.y,t.dir.z,t.cos)}}if(!this.lens.visible)return;let o=.3;this.fwd.set(0,0,-1).applyQuaternion(t.quaternion),this.lens.position.copy(t.position).addScaledVector(this.fwd,o),this.lens.quaternion.copy(t.quaternion);let s=2*o*Math.tan(t.fov*Math.PI/360)*1.08;this.lens.scale.set(s*t.aspect,s,1),this.lens.material.uniforms.uTime.value=e,this.lens.material.uniforms.uAspect.value=t.aspect}dispose(){for(let e of Object.keys(this.sys))this.sys[e].geometry.dispose(),this.sys[e].material.dispose();this.lens.geometry.dispose(),this.lens.material.dispose()}},ze=[[0,0],[.135,0],[.135,.02],[.118,.028],[.116,.04],[.128,.048],[.104,.058],[.018,.058],[.012,.028],[0,.024]],W=[[0,0],[.062,0],[.058,.018],[.04,.026],[.034,.044],[.014,.052],[0,.05]],Be=[[0,0],[.165,0],[.156,.034],[.13,.05],[.108,.086],[.066,.122],[.026,.138],[0,.14]],G=.22;function K(e,t,n,r,i){return[[[e,i,n],[t,i,n],[0,0,1]],[[t,i,n],[t,i,r],[-1,0,0]],[[t,i,r],[e,i,r],[0,0,-1]],[[e,i,r],[e,i,n],[1,0,0]]]}function q(e,t){let n=[];for(let[r,i,a]of t)n.push(C(e,[r,i],{up:a}));return b(n)}function J(e){let t=S(`shell`),n=(e.x0+e.x1)*.5,r=(e.z0+e.z1)*.5,i=e.x1-e.x0,a=e.z1-e.z0,o=e.h;t.add(x(new c(i,a,12,12),e.floor,{rot:[-Math.PI/2,0,0],pos:[n,0,r],cast:!1})),e.ceil&&t.add(x(new c(i,a,6,6),e.ceil,{rot:[Math.PI/2,0,0],pos:[n,o,r],cast:!1}));let s=e.wall;if(e.skipZ0||t.add(x(T(i+G*2,o,G,.02,2),s,{pos:[n,o*.5,e.z0-G*.5],cast:!1})),e.skipZ1||t.add(x(T(i+G*2,o,G,.02,2),s,{pos:[n,o*.5,e.z1+G*.5],cast:!1})),e.skipX0||t.add(x(T(G,o,a,.02,2),s,{pos:[e.x0-G*.5,o*.5,r],cast:!1})),e.skipX1||t.add(x(T(G,o,a,.02,2),s,{pos:[e.x1+G*.5,o*.5,r],cast:!1})),e.wainscot){let o=e.wainscotH??1.02,s=[],c=(e,t,n,r,i)=>{s.push(T(r,o,i,.012,2).clone().translate(e,t,n))};c(n,o*.5,e.z0+.03,i,.06),c(n,o*.5,e.z1-.03,i,.06),c(e.x0+.03,o*.5,r,.06,a),c(e.x1-.03,o*.5,r,.06,a),t.add(x(b(s),e.wainscot,{wear:.8,seed:31,cast:!1})),t.add(x(q(W,K(e.x0+.005,e.x1-.005,e.z0+.005,e.z1-.005,o)),e.wainscot,{wear:.9,seed:33,cast:!1}))}return t.add(x(q(ze,K(e.x0+.002,e.x1-.002,e.z0+.002,e.z1-.002,0)),e.trim??`wood.painted.white`,{wear:.85,seed:35,cast:!1})),e.ceil&&t.add(x(q(Be,K(e.x0+.002,e.x1-.002,e.z0+.002,e.z1-.002,o-.14)),e.trim??`wood.painted.white`,{wear:.6,seed:37,cast:!1})),t}function Ve(e,t,n,r,i,a,o={}){let s=[],[c,l]=i,[u,d]=a,f=o.sill??.9,p=o.head??2.25,m=(n,r,i,a)=>{let o=r-n,c=a-i;if(o<=.001||c<=.001)return;let l=T(e===`x`?G:o,c,e===`x`?o:G,.02,2).clone();l.translate(e===`x`?t:(n+r)*.5,(i+a)*.5,e===`x`?(n+r)*.5:t),s.push(l)};return m(c,u,0,n),m(d,l,0,n),m(u,d,0,f),m(u,d,p,n),x(b(s),r,{cast:!1})}function He(e,t,n,r,i=.62){let o=g(r),s=[],c=[],l=T(e,.004,.052,.0015,1);for(let e=0;e<n;e++){let r=t-(e+.5)*(t/n),u=i+(o()-.5)*.1;s.push(l),c.push(new a().makeRotationX(u).setPosition(0,r,(o()-.5)*.004))}let u=x(b(s,c),`wood.painted.white`,{wear:.5,seed:r+2}),d=T(.006,t,.006,.002,1).clone().translate(e*.32,t*.5,.02);return u.add(x(d,`wood.painted.white`,{cast:!1})),u}function Ue(e,t,n,r){return x(T(e,t,.01,.003,1),n,{wear:.6,seed:r})}function We(e,t,n,r,i,o,s){let c=g(s),l=[],u=[],d=Math.max(1,Math.round((t-e)/o)),p=Math.max(1,Math.round((r-n)/o)),m=T(o*.97,.018,o*.97,.004,1);for(let t=0;t<d;t++)for(let r=0;r<p;r++)l.push(m),u.push(new a().makeRotationY((c()-.5)*.012).setPosition(e+(t+.5)*o,f(-.004,.002,c()),n+(r+.5)*o));return x(b(l,u),i,{cast:!1,wear:.35,seed:s+1})}function Y(e,t){let n=e.index?e.toNonIndexed():e.clone(),r=n.attributes.position,i=new Float32Array(r.count*3);for(let e=0;e<r.count;e++){let n=t(r.getX(e),r.getY(e),r.getZ(e));typeof n==`number`?i[e*3]=i[e*3+1]=i[e*3+2]=n:(i[e*3]=n[0],i[e*3+1]=n[1],i[e*3+2]=n[2])}return n.setAttribute(`color`,new s(i,3)),n.computeBoundingBox(),n}function Ge(e,t,n,r,i,a,o,s){let l=new c(a-i,r-n,o,s);return l.rotateY(-e*Math.PI*.5),l.translate(e*t,(n+r)*.5,(i+a)*.5),l}function Ke(e,t){let n=e.attributes.position,r=new Float32Array(n.count*2);for(let e=0;e<n.count;e++)r[e*2]=n.getZ(e)/t,r[e*2+1]=n.getY(e)/t;return e.setAttribute(`uv`,new s(r,2)),e}function qe(e,t,n,r,i,a){let o=g(a),s=m(a+3),c=r-n,l=[],u=Ge(e,t-.028,.055,i-0,n,r,Math.round(c*5.5),18);Ke(u,.86),l.push(x(Y(u,(e,t,n)=>{let r=.7;return r-=.34*Math.exp(-((t/.2)**2)),r-=.22*(h(s,n*1.15,t*2.2,4)*.5+.5)*p(_((.75-t)/.6,0,1)),r-=.14*(h(s,n*.42+11,t*.5,3)*.5+.5),r+=.09*h(s,n*6.1-4,t*6.1,3),r-=.2*Math.exp(-(((t-.62)/.05)**2))*(.4+.6*(h(s,n*9,3,2)*.5+.5)),r-=.16*Math.max(0,h(s,n*2.7+63,t*2.7,3)),_(r,.22,.95)}),`wood.painted.white`,{vcol:!0,cast:!1}));let d=[],v=[],y=(e,t,n,r,i,a)=>{d.push(T(e,t,n,.006,1)),v.push(D([r,i,a]))},S=e*(t-.041);y(.026,.155,c-.02,S,.135,(n+r)*.5),y(.026,.115,c-.02,S,i-.135,(n+r)*.5);let w=Math.max(2,Math.round(c/1.85)),O=e=>f(n+.06,r-.06,e/w);for(let e=0;e<=w;e++)y(.026,i-.3,.098,S,(i+.02)*.5,O(e));for(let n=0;n<w;n++){let r=O(n)+.075,a=O(n+1)-.075,o=(r+a)*.5,s=a-r;if(s<.2)continue;let c=.245,l=i-.215,u=e*(t-.035);y(.014,.03,s,u,c,o),y(.014,.03,s,u,l,o),y(.014,l-c,.03,u,(c+l)*.5,r),y(.014,l-c,.03,u,(c+l)*.5,a)}l.push(x(Y(b(d,v),(e,t,n)=>{let r=.78-.26*Math.exp(-((t/.26)**2));return r-=.18*(h(s,n*1.7+31,t*3,3)*.5+.5),r+=.1*p(_((t-.9)/.2,0,1)),_(r,.28,1)}),`wood.painted.white`,{vcol:!0}));let k=e>0?[n+.005,r-.005]:[r-.005,n+.005],A=C(W,[[e*(t-.005),i,k[0]],[e*(t-.005),i,k[1]]],{up:[-e,0,0]});l.push(x(Y(A,(e,t,n)=>_(.84-.22*(h(s,n*2.1+7,t*4,3)*.5+.5),.3,.96)),`wood.painted.white`,{vcol:!0}));let j=[],M=[],N=[],P=[],ee=T(.005,.04,.031,.0022,1),F=T(.003,.0125,.0022,6e-4,1),te=E([[0,0],[.0034,6e-4],[.0036,.0022],[.0016,.0026],[0,.0022]],10);for(let i=0;i<4;i++){let a=f(n+1.6,r-1.4,(i+.3*o())/3.5),s=e*(t-.05),c=.3+o()*.02,l=(o()-.5)*.1,u=(t,n,r,i,o,u=0)=>{i.push(r),o.push(D([s+e*u,c+t,a+n],[0,0,l]))};u(0,0,T(.012,.115,.072,.0055,1),j,M);for(let e of[.026,-.026])u(e,0,ee,j,M,.008),u(e+.008,-.0062,F,j,M,.0095),u(e+.008,.0062,F,j,M,.0095);u(0,0,te.clone().rotateZ(e*Math.PI*.5),N,P,.011)}return l.push(x(b(j,M),`bakelite.black`,{wear:.6,seed:a+9,cast:!1})),l.push(x(b(N,P),`brass.tarnished`,{wear:.75,seed:a+10,cast:!1})),l}function Je(e,t,n,r,i,a,o,s=[]){let c=m(o),l=r-n,u=i+.055,d=a-.145,f=Ge(e,t-.008,u,d,n,r,Math.round(l*4),14),g=[n+l*.3,n+l*.72];return x(Y(f,(e,t,r)=>{let i=_((t-u)/(d-u),0,1),a=1;a-=.13*(h(c,r*.55,t*.9,4)*.5+.5),a-=.1*p(_((i-.72)/.28,0,1));for(let e of g){let n=Math.exp(-(((r-e)/.3)**2));a-=.26*n*p(_((i-.3)/.55,0,1))*(.55+.45*h(c,r*7,t*3,3))}for(let e of s){let t=Math.exp(-(((r-e)/(.16+.5*i))**2));a-=.28*t*p(_((i-.34)/.3,0,1))}return a+=.05*h(c,r*3.3+19,t*3.3,3),a-=.05*Math.exp(-((((r-n)%.68-.34)/.03)**2)),_(a,.3,1.05)}),`wallpaper.damask.green`,{vcol:!0,cast:!1})}var Ye=[[-.36,8.55,.3,.42,.44],[.44,9.35,.17,.21,.36],[.08,6.4,.44,.28,.26],[-.62,4.55,.13,.16,.42],[.66,7.2,.22,.34,.3],[-.14,9.05,.52,.31,.3],[.72,8.72,.24,.19,.4],[-.8,7.75,.2,.46,.26]],Xe=[4.6,8.95,12.8];function Ze(e,t,n,r,i){let a=m(r),o=n-t,s=new c(e,o,64,Math.round(o*7));s.rotateX(-Math.PI/2),s.translate(0,0,(t+n)*.5);let l=s.attributes.position,u=-.16,d=e=>p(_((i[0]-e)/(i[0]-i[1]),0,1)),f=t=>Math.exp(-(((Math.abs(t)-(e*.5-.165))/.058)**2)),g=e=>{let n=0;for(let r of Xe)n=Math.max(n,Math.exp(-(((e-(t+r))/.022)**2)));return n},v=(e,n)=>{let r=0;for(let[i,a,o,s,c]of Ye)r+=c*Math.exp(-(((e-i)/o)**2+((n-(t+a))/s)**2));return Math.min(r,.4)};for(let t=0;t<l.count;t++){let n=l.getX(t),r=l.getZ(t),i=p(_((e*.5-Math.abs(n))/.09,0,1)),o=Math.exp(-(((n-u)/.3)**2)),s=.014*i;s+=h(a,n*4.5,r*2.2,4)*.004*i,s-=o*.006*d(r),s+=(1-i)*.011*(.5+.5*Math.sin(r*2.3+h(a,r,0,2)*3)),s-=.0035*g(r)*i,l.setY(t,s)}return s.computeVertexNormals(),x(Y(s,(t,n,r)=>{let i=p(_((e*.5-Math.abs(t))/.26,0,1)),o=Math.exp(-(((t-u)/.26)**2))*d(r),s=f(t),c=g(r),l=v(t,r),m=Math.exp(-(((t-u)/.42)**2))*(.55+.45*(h(a,r*.62+7,0,3)*.5+.5)),y=h(a,r*.27-19,t*.3,3),b=.78;return b-=.52*(1-i),b-=.22*(h(a,t*3.6,r*1.9,4)*.5+.5),b-=.3*Math.max(0,h(a,t*2.4+41,r*1.5-13,3)),b+=.13*h(a,t*8.5,r*4.6,3),b+=.11*y,b-=.13*m,b-=.55*s,b-=.3*c,b-=l,b=_(b,.24,1.06),[b*(1-.3*o)*(1-.34*s)*(1-.11*m),b*(1+.44*o)*(1+.1*s)*(1+.07*m),b*(1+.4*o)*(1+.06*s)*(1+.06*m)]}),`carpet.corridor.red`,{vcol:!0,cast:!1})}function Qe(e,t,n,r,i,a){let o=S(`stairHead`),s=g(a),c=m(a+4),l=-e,u=-e+r,d=t-1.05,f=[],v=[];f.push(T(1.62,.1,1.05,.02,1)),v.push(D([u-.71,-.05,t-.525])),f.push(T(3.3,.1,1.05,.02,1)),v.push(D([l-.05,n+.05,t-.525])),f.push(T(3.52,n,.22,.02,1)),v.push(D([l-.05,n*.5,d-.11])),f.push(T(.22,n,1.05,.02,1)),v.push(D([l-1.81,n*.5,t-.525])),f.push(T(.22,n,1.05,.02,1)),v.push(D([u+.11,n*.5,t-.525])),o.add(x(Y(b(f,v),(e,t,n)=>_(.52-.22*(h(c,n*1.4,t*1.1,4)*.5+.5)-.2*p(_((1.6-t)/1.6,0,1)),.16,.72)),`wood.varnished.dark`,{vcol:!0,cast:!1}));let y=[],C=[];for(let[e,n]of[[l-.055,1],[u+.055,-1]])y.push(T(.11,i+.11,.055,.01,1)),C.push(D([e,(i+.11)*.5,t-.055])),y.push(T(.055,i+.11,.03,.008,1)),C.push(D([e+n*.028,(i+.11)*.5,t-.095]));y.push(T(r+.22,.11,.055,.01,1)),C.push(D([(l+u)*.5,i+.055,t-.055])),y.push(T(r+.22,.055,.03,.008,1)),C.push(D([(l+u)*.5,i+.083,t-.095])),o.add(x(b(y,C),`wood.painted.white`,{wear:.95,seed:a+1}));let w=[],E=[];for(let e=0;e<6;e++)w.push(T(.28,.05,1.6,.01,1)),E.push(D([l-.14-e*.28,-.03-e*.175,t-.52]));o.add(x(b(w,E),`wood.varnished.dark`,{wear:.95,seed:a+2,cast:!1}));let O=[],k=[];O.push(T(.085,.98,.085,.012,2)),k.push(D([l+.1,.49,t-.34])),O.push(T(.13,.085,.13,.016,2)),k.push(D([l+.1,1.02,t-.34])),O.push(T(.055,.055,.8,.01,1)),k.push(D([l+.1,.9,t-.72]));for(let e=0;e<3;e++)O.push(T(.032,.72,.032,.008,1)),k.push(D([l+.1,.53-e*.07,t-.5-e*.22]));let A=x(b(O,k),`wood.varnished.dark`,{wear:.9,seed:a+3});return A.rotation.y=(s()-.5)*.03,o.add(A),o}function X(e,t){let n=e.index?e.toNonIndexed():e.clone(),r=n.attributes.position,i=new Float32Array(r.count*3);for(let e=0;e<r.count;e++){let n=t(r.getX(e),r.getY(e),r.getZ(e));typeof n==`number`?i[e*3]=i[e*3+1]=i[e*3+2]=n:(i[e*3]=n[0],i[e*3+1]=n[1],i[e*3+2]=n[2])}return n.setAttribute(`color`,new s(i,3)),n.computeBoundingBox(),n}function Z(e,t){let n=y(e,t);return t.rot&&n.rotation.set(t.rot[0],t.rot[1],t.rot[2]),n}function $e(e,t,n,r,i,a){let o=S(`corridor.endWall`),s=g(a),l=m(a+2),u=-e+i,d=e,f=(u+d)*.5,v=d-u,y=t+.062;{let e=n+.06,i=r-.02,s=new c(v-.02,i-e,26,30);s.translate(f,(e+i)*.5,t+.012);let d=u+1.02,m=[[u+.3,.34],[u+.92,.2]];o.add(x(X(s,(e,t)=>{let i=1;i-=.17*(h(l,e*.9+5,t*.8,4)*.5+.5),i-=.19*p(_((t-(r-.65))/.6,0,1)),i-=.3*Math.exp(-(((t-(n+.1))/.13)**2));for(let[a,o]of m){let s=(.09+.16*_((r-t)/(r-n),0,1))*o*3.4,c=Math.exp(-(((e-a)/s)**2))*p(_((t-(n+.35))/1.1,0,1));i-=.46*c*(.55+.45*(h(l,e*9+3,t*3.5,3)*.5+.5))}let a=Math.max(Math.abs(e-d)/.28,Math.abs(t-2.5)/.34);i+=.24*(1-p(.94,1.02,a)),i-=.3*Math.exp(-(((a-1.01)/.05)**2)),i-=.13*Math.max(0,h(l,e*4.4+27,t*4.4,3)),i=_(i,.34,1.22);let o=_((1-i)*1.4,0,.5);return[i*(1+.14*o),i*(1-.06*o),i*(1-.2*o)]}),`wallpaper.damask.green`,{vcol:!0,cast:!1}));let g=x(T(.01,.008,.012,.0025,1),`steel.rusted`,{pos:[d,2.84+.03,t+.02],wear:.9,seed:a+7,cast:!1});o.add(g)}o.add(x(X(C(W,[[u-.02,n,t+.012],[d,n,t+.012]],{up:[0,0,1]}),(e,t)=>_(.86-.2*(h(l,e*2.4,t*5,3)*.5+.5),.34,.98)),`wood.painted.white`,{vcol:!0}));let w=[],E=[],O=(e,t,n,r,i)=>{w.push(T(e,t,n,.005,1)),E.push(D([r,i,y]))};for(let[e,t]of[[u+.42,.7],[u+1.24,.62]]){let r=.235,i=n-.2;O(t,.026,.016,e,r),O(t,.026,.016,e,i),O(.026,i-r,.016,e-t*.5,(r+i)*.5),O(.026,i-r,.016,e+t*.5,(r+i)*.5)}o.add(x(X(b(w,E),(e,t)=>_(.8-.3*Math.exp(-((t/.3)**2))-.16*(h(l,e*3+9,t*4,3)*.5+.5),.26,.98)),`wood.painted.white`,{vcol:!0}));for(let[e,[n,r,i,c]]of[[u+.52,1.92,.4,.52],[u+1.22,1.74,.3,.38]].entries()){let l=L(a+11+e,{w:i,h:c}).root;l.position.set(n,r,t+.03),l.rotation.z=(s()-.5)*.06,o.add(l)}let k=x(T(.076,.118,.014,.004,1),`bakelite.black`,{wear:.6,seed:a+3});return k.position.set(u+.16,1.28,t+.045),k.rotation.z=(s()-.5)*.08,o.add(k),Z(o,{x:f,y:r-.16,z:t+.028,radius:v*.52,radiusZ:.22,strength:.4,rot:[0,0,0]}),Z(o,{x:f,y:n-.06,z:t+.03,radius:v*.5,radiusZ:.1,strength:.34,rot:[0,0,0]}),o}function et(e,t,n,r,i,a){let o=S(`corridor.stairWell`),s=m(a+6),c=t-1.05,l=-e,u=-e+r,d=[],f=[];return d.push(T(2.3,.052,.03,.008,1)),f.push(D([l-.3,.92,c+.018])),d.push(T(2.3,.03,.03,.006,1)),f.push(D([l-.3,.86,c+.014])),d.push(T(2.3,.135,.026,.006,1)),f.push(D([l-.3,.068,c+.016])),d.push(T(.052,n-.1,.038,.008,1)),f.push(D([u+.02,(n-.1)*.5,c+.02])),o.add(x(X(b(d,f),(e,t)=>_(.62-.24*(h(s,e*2.2,t*3.1,3)*.5+.5)-.16*p(_((.8-t)/.8,0,1)),.18,.8)),`wood.varnished.dark`,{vcol:!0,cast:!1})),Z(o,{x:l-.25,y:1.3,z:c+.008,radius:1.55,radiusZ:1.45,strength:.4,rot:[0,0,0]}),Z(o,{x:(l+u)*.5,y:.006,z:t-.3,radius:r*.62,radiusZ:.42,strength:.72}),o}function tt(e,t,n,r,i,a,o,s){let c=S(`corridor.break${e>0?`R`:`L`}`),l=g(o),u=m(o+8),d=-e*Math.PI*.5,f=i+.06,p=a-.16,v=r-n,y=(e,t,r)=>n+.9+(v-1.8)*((e+.2+r*.6)/t),b=2.62,w=e>0?[n+.02,r-.02]:[r-.02,n+.02];c.add(x(X(C(W,[[e*(t-.012),b,w[0]],[e*(t-.012),b,w[1]]],{up:[-e,0,0]}),(e,t,n)=>_(.8-.22*(h(u,n*1.9,t*5,3)*.5+.5),.3,.96)),`wood.painted.white`,{vcol:!0}));let E=.34+l()*.16,D=.4+l()*.18,O=L(o+40,{w:E,h:D}).root;O.position.set(e*(t-.03),2-D*.5,s),O.rotation.y=-e*Math.PI*.5,O.rotation.z=(l()-.5)*.07,c.add(O);let k=x(T(.004,.62,.004,.0012,1),`fabric.wool.suit`,{pos:[e*(t-.022),2.31,s],cast:!1});k.rotation.x=(l()-.5)*.05,c.add(k);for(let n=0;n<2;n++){let r=x(T(.006,b-f-.14,.052,.0015,1),`wallpaper.damask.green`,{wear:.5,seed:o+21+n});r.position.set(e*(t-.014),(f+b)*.5,y(n,2,l())),r.rotation.y=e*(.3+l()*.14),c.add(r)}for(let n=0;n<7;n++){let r=n%3==0;Z(c,{x:e*(t-.01),y:f+(p-f)*(.1+l()*.85),z:y(n,7,l()),radius:r?1.05+l()*.75:.34+l()*.42,radiusZ:r?.55+l()*.45:.28+l()*.4,strength:r?.22+l()*.14:.34+l()*.18,rot:[0,d,0]})}let A=(n+r)*.5;return Z(c,{x:e*(t-.048),y:.075,z:A,radius:(r-n)*.46,radiusZ:.11,strength:.58,rot:[0,d,0]}),Z(c,{x:e*(t-.052),y:i-.02,z:A,radius:(r-n)*.44,radiusZ:.07,strength:.3,rot:[0,d,0]}),c}function nt(e,t,n,r){let i=S(`corridor.joint`),a=(t+n)*.5,o=(n-t)*.5;for(let t of[-1,1])Z(i,{x:t*(e-.1),y:.0045,z:a,radius:.16,radiusZ:o*.92,strength:.58}),Z(i,{x:t*(e-.26),y:.004,z:a,radius:.22,radiusZ:o*.86,strength:.26});return Z(i,{x:.55,y:.0045,z:t+.13,radius:.86,radiusZ:.17,strength:.52}),i}var rt=[[0,0],[.052,0],[.056,.008],[.052,.017],[.04,.021],[.008,.021],[0,.015]];function it(e,t,n,r){let i=S(`corridor.runnerTrim`),a=g(r),o=m(r+4),s=n-t,c=(t+n)*.5,l=[],u=[],d=Math.max(8,Math.round(s*4));for(let r of[-1,1]){let i=r*(e*.5-.052),a=C(rt,[[i,.002,r>0?t:n],[i,.002,r>0?n:t]],{up:[0,1,0],steps:d}),s=a.attributes.position,c=e*.5-.016;for(let e=0;e<s.count;e++){let t=s.getX(e),n=s.getY(e),i=s.getZ(e);if(Math.abs(t)<c)continue;let a=h(o,i*3.3+r*5,0,3);s.setXYZ(e,t+r*(a*.011+.002),n+a*.003,i)}a.computeVertexNormals(),l.push(a),u.push(null)}i.add(x(X(b(l,u),(e,t,n)=>_(.72-.24*(h(o,n*1.4,e*6,3)*.5+.5),.3,.92)),`fabric.wool.suit`,{vcol:!0,cast:!1}));for(let t of[-1,1])Z(i,{x:t*(e*.5+.012),y:.0055,z:c,radius:.055,radiusZ:s*.5,strength:.58});for(let[e,r,o,s,c]of[[-.34,t+6.2,.3,.42,.46],[.46,t+2.7,.19,.24,.36],[-.1,n-3.4,.44,.3,.28]])Z(i,{x:e+(a()-.5)*.1,y:.021,z:r,radius:o,radiusZ:s,strength:c});return i}function at(e){for(let t of e.lights||[])t.target?.parent?.remove(t.target),t.parent?.remove(t),t.dispose?.();return e.root}function ot(){let e=S(`space.lobby`);e.add(J({x0:-7.2,x1:7.2,z0:-9,z1:7.6,h:5,floor:`marble.lobby.floor`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`,wainscot:`wood.varnished.dark`,wainscotH:1.24}));let t=b([E([[.3,0],[.34,.04],[.3,.1],[.26,.16]],26),E([[.255,.16],[.243,1.6],[.222,3.4],[.238,3.9]],26),E([[.245,3.9],[.31,4.02],[.35,4.16],[.3,4.3],[.26,4.34]],26)]),n=T(.86,.16,.86,.03,2);for(let[r,[i,a]]of[[-3.5,2.2],[3.5,2.2],[-3.5,-3.4],[3.5,-3.4]].entries()){let o=S(`column`,x(t,`marble.lobby.floor`,{wear:.55,seed:40+r}),x(n,`plaster.cracked`,{pos:[0,4.42,0],wear:.7,seed:44+r}));o.position.set(i,0,a),o.rotation.y=r*.4,y(o,{strength:.7,radius:.42,radiusZ:.42}),e.add(o)}let r=S(`desk`);r.add(x(T(4.6,1.12,.72,.02,2),`wood.varnished.dark`,{pos:[0,.56,0],wear:.8,seed:51})),r.add(x(T(4.9,.07,.96,.014,2),`marble.lobby.floor`,{pos:[0,1.16,.04],wear:.5,seed:52})),r.add(x(O([[-2.3,.12,.42],[2.3,.12,.42]],.028,4,10),`brass.polished`,{wear:.75,seed:53}));let i=[],a=[];for(let e=0;e<6;e++)i.push(T(.62,.74,.03,.01,2)),a.push(D([-1.95+e*.78,.6,.375]));r.add(x(b(i,a),`wood.varnished.dark`,{wear:.9,seed:54})),r.position.set(-2.4,0,-4.9),r.rotation.y=.06,y(r,{strength:.72,spread:1.05}),e.add(r);let o=ne(61,{cols:9,rows:5}).root;o.position.set(-2.4,1.95,-8.82),e.add(o);let s=P(62).root;s.position.set(-1.6,1.2,-4.86),s.rotation.y=-.22,e.add(s);let c=j(63).root;c.position.set(-3.7,1.2,-4.92),c.rotation.y=.5,e.add(c);let l=ue(71,{w:1.34,h:2.34}).root;l.position.set(7.06,0,-1.4),l.rotation.y=-Math.PI/2,e.add(l);let u=ve(81).root;u.position.set(4.3,0,2.6),u.rotation.y=-1.35,e.add(u);let d=ye(82).root;d.position.set(1.7,0,3.5),d.rotation.y=2.5,e.add(d);let f=be(83).root;f.position.set(3.2,0,4.2),e.add(f);let p=F(84).root;p.position.set(3.2,.56,4.2),e.add(p);let m=pe(85).root;m.position.set(-5.6,0,1.4),e.add(m);let h=ge(86,{w:3.4,len:5}).root;h.position.set(2.6,0,2.4),e.add(h);let g=he(87).root;g.position.set(-5.2,0,-2.2),g.rotation.y=.8,e.add(g);for(let[t,n]of[-6.2,-4.4].entries()){let r=L(90+t,{w:.62,h:.82}).root;r.position.set(n,2.4,-8.78),e.add(r)}return{root:e,lights:[[`chandelier`,{pos:[.4,4.1,.4],kelvin:2500,lumens:7200,radius:14,flicker:.05,hot:3}],[`ceiling`,{pos:[-2.4,3.55,-4.4],kelvin:4400,lumens:3400,radius:7.5,angle:1.1,flicker:.14,shaft:.3}],[`sconce`,{pos:[-7.05,2.45,-1.2],kelvin:2700,lumens:1100,radius:5.6,flicker:.06,dir:[1,-.5,.15],shaft:.26}],[`sconce`,{pos:[7.05,2.45,1.8],kelvin:2650,lumens:900,radius:5.2,flicker:.09,dir:[-1,-.5,-.15],shaft:.24}],[`desk`,{pos:[-3.9,1.55,-4.6],kelvin:2700,lumens:700,radius:4.2,flicker:.05,shaft:.22}],[`elevator`,{pos:[6.2,2.62,-1.4],kelvin:3300,lumens:900,radius:5,flicker:.1,shaft:.28,dir:[-.35,-1,0]}]]}}function st(){let e=S(`space.corridor`),t=1.42,n=-8.9,r=8.4,i=3.05,a=1.06,o=1.18,s=2.28,c=g(7);e.add(J({x0:-1.42,x1:t,z0:n,z1:r,h:i,skipZ0:!0,floor:`wood.varnished.dark`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`})),e.add(Ve(`z`,-9.01,i,`wallpaper.damask.green`,[-1.64,1.64],[-1.42,-.24],{sill:0,head:s})),e.add(x(T(2*t-o,a,.055,.01,1),`wood.varnished.dark`,{pos:[o*.5,a*.5,-8.872],wear:.95,seed:41,cast:!1})),e.add(Qe(t,n,i,o,s,45)),e.add($e(t,n,a,i,o,210)),e.add(et(t,n,i,o,s,220));let l=[4.4,.7,-3,-6.6];for(let o of[-1,1]){for(let i of qe(o,t,n,r,a,51+(o>0?7:0)))e.add(i);e.add(Je(o,t,n,r,a,i,61+(o>0?7:0),l.filter((e,t)=>(t%2?1:-1)===o))),e.add(tt(o,t,n,r,a,i,230+(o>0?9:0),o>0?2:-.6))}e.add(Ce([[.18,.7],[1,.62]],.235,.8600000000000001,-8.848,270));for(let t of Ee(.94,1.416,-8.88,8.38,280))e.add(t);e.add(nt(t,n,r,250));let u=Ze(2,-8.450000000000001,8.200000000000001,71,[1.9,-3.6]);Te(u.geometry,2.7),e.add(u),e.add(it(2,-8.450000000000001,8.200000000000001,260));let d=[101,102,103].map(e=>ce(e,{w:.86,h:2.06}).root),f=0;for(let t of[5.6,1.9,-1.8,-5.5])for(let n of[-1,1]){let r=t+(n>0?1.85:0),i=w(d[f%3],110+f,{pos:.02,rot:.03,scale:.022});i.position.set(n*1.4,0,r),i.rotation.y=n>0?-Math.PI/2:Math.PI/2,v(i,!0,!0),y(e,{x:n*1.29,z:r,radius:.17,radiusZ:.5,strength:.62+f%3*.06,y:.005}),e.add(i);let a=Ue(.088,.132,f%4==1?`brass.polished`:`brass.tarnished`,120+f);a.position.set(n*1.3519999999999999,1.66+(c()-.5)*.05,r+.6),a.rotation.y=n>0?-Math.PI/2:Math.PI/2,a.rotation.x=f===4?.26:(c()-.5)*.09,e.add(a),f++}let p=.05;e.add(x(T(.03,.34,.86,.008,1),`glass.frosted`,{pos:[1.3719999999999999,2.36,p],cast:!1})),e.add(x(b([T(.055,.045,.94,.01,1),T(.055,.045,.94,.01,1)],[D([1.38,2.19,p]),D([1.38,2.545,p])]),`wood.painted.white`,{wear:.9,seed:131}));let m=-4.4,h=[],_=[];for(let e of[-1,1])h.push(T(.26,i,.3,.016,2)),_.push(D([e*1.29,i*.5,m])),h.push(T(.075,i,.4,.01,1)),_.push(D([e*1.13,i*.5,m]));h.push(T(2*t-.04,.62,.3,.016,2)),_.push(D([0,2.7399999999999998,m])),h.push(T(2*t-.04,.075,.4,.01,1)),_.push(D([0,2.3949999999999996,m])),e.add(x(b(h,_),`wood.painted.white`,{wear:.95,seed:181}));let C=I(141,{cols:9}).root;C.position.set(-1.23,0,2.2),C.rotation.y=Math.PI/2,y(C,{strength:.74,radius:.62,radiusZ:.18}),e.add(C);for(let[t,[n,r,i,a]]of[[-1,3.9,.44,.58],[1,-2.5,.52,.4]].entries()){let o=L(191+t,{w:i,h:a}).root;o.position.set(n*1.385,1.72+t*.06,r),o.rotation.y=n>0?-Math.PI/2:Math.PI/2,o.rotation.z=(c()-.5)*.05,e.add(o)}let E=De(151);E.position.set(t,1.46,3.5),e.add(E);let O=we(161);O.position.set(1,0,1.05),O.rotation.y=-1.52,y(O,{strength:.66,radius:.34,radiusZ:.46}),e.add(O);for(let n of Oe(t,i,7.7,-4,88))e.add(n);let k=[];for(let[e,t]of l.entries()){let n=e%2?1:-1,r=e===3;k.push([`sconce`,{pos:[n*1.27,2.16,t],kelvin:2560+(c()-.5)*260,lumens:r?.6:e===0?600:1120-e*70,radius:r?2:11,flicker:r?0:.05+c()*.14,hot:r?.05:1.35+c()*.45,dir:[-n*.62,-.7,0],angle:.72,penumbra:.8,shaft:r?0:e===1?.17:.3,shaftLen:1.5,shaftAngle:.34,fixtureRot:[0,0,n*(.02+c()*.05)]}])}return k.push([`ceiling`,{pos:[0,2.92,-2.2],kelvin:4400,lumens:3400,radius:9,angle:1.24,flicker:.34,shaft:.34,shaftLen:1.5,shaftAngle:.5,hot:1.9}]),k.push([`desk`,{pos:[1.345,2.3,p],target:[.3699999999999999,0,p],kelvin:2450,lumens:210,radius:3.4,angle:.7,penumbra:.92,flicker:.03,shaft:.26,shaftLen:1.9,shaftAngle:.22,fixture:!1}]),{root:e,lights:k}}function ct(){let e=S(`space.room942`),t=-5.2,n=5.4,r=3.15;e.add(J({x0:-4.3,x1:4.7,z0:t,z1:n,h:r,skipX1:!0,floor:`wood.varnished.dark`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`,wainscot:`wood.painted.white`,wainscotH:.98})),e.add(Ve(`x`,4.8100000000000005,r,`wallpaper.damask.green`,[t,n],[-1.6,.9],{sill:.92,head:2.42}));let i=S(`sash`),a=[],o=[];a.push(T(.06,1.56,.1,.012,1)),o.push(D([0,1.67,-1.62])),a.push(T(.06,1.56,.1,.012,1)),o.push(D([0,1.67,.92])),a.push(T(.06,.1,2.62,.012,1)),o.push(D([0,.92,-.35])),a.push(T(.06,.1,2.62,.012,1)),o.push(D([0,2.42,-.35])),a.push(T(.05,.07,2.5,.01,1)),o.push(D([0,1.67,-.35]));for(let e=0;e<3;e++)a.push(T(.04,1.44,.05,.008,1)),o.push(D([0,1.67,-1.3+e*.62]));i.add(x(b(a,o),`wood.painted.white`,{wear:.9,seed:161})),i.add(x(T(.014,1.44,2.44,.004,1),`glass.clear`,{pos:[.02,1.67,-.35],cast:!1})),i.position.set(4.72,0,0),e.add(i);let s=He(2.42,1.3,22,171,.58);s.rotation.y=-Math.PI/2,s.position.set(4.6000000000000005,1.1,-.35),e.add(s);let c=xe(181,{w:1.42,len:2.05}).root;c.position.set(-2.5,0,-1.4),c.rotation.y=Math.PI/2,e.add(c);let l=Se(182).root;l.position.set(-3.3,0,1.15),e.add(l);let u=at(me(183));u.position.set(-3.3,.62,1.15),u.rotation.y=1.1,e.add(u);let d=I(184,{cols:12}).root;d.position.set(1.9,0,-5.04),e.add(d);let f=te(185).root;f.position.set(1.2,0,2.4),f.rotation.y=-.4,e.add(f);let p=ye(186).root;p.position.set(2.9,0,-2.6),p.rotation.y=2.1,e.add(p);let m=L(187,{w:.72,h:.56}).root;m.position.set(-2.5,2.1,-5.07),e.add(m);let h=ge(188,{w:2.2,len:3}).root;return h.position.set(.6,0,.4),e.add(h),{root:e,lights:[[`street`,{pos:[10.5,6.4,1.2],target:[-2.6,.35,-2.2],kelvin:3100,lumens:9e3,radius:22,angle:.4,flicker:.02,shaft:1,slats:{count:22,phase:.4,depth:.92},fixture:!1}],[`desk`,{pos:[-3.3,1.02,1.15],kelvin:2600,lumens:420,radius:3.4,flicker:.05,shaft:.2,fixture:!1}],[`sconce`,{pos:[-4.16,2.2,2.6],kelvin:2750,lumens:320,radius:4,flicker:.05,dir:[1,-.6,0],shaft:.2}]]}}function lt(){let e=S(`space.bathroom`),t=-2.2,n=3.3,r=-3.1,i=4.1;e.add(J({x0:t,x1:n,z0:r,z1:i,h:2.8,floor:`tile.hex.bathroom`,ceil:`plaster.cracked`,wall:`plaster.cracked`,wainscot:`tile.subway.white`,wainscotH:1.62})),e.add(We(t,n,r,i,`tile.hex.bathroom`,.28,191));let a=re(201).root;a.position.set(-1.55,0,-1),a.rotation.y=Math.PI/2,e.add(a);let o=le(202).root;o.position.set(-2.1100000000000003,1.62,-1),o.rotation.y=Math.PI/2,e.add(o);let s=de(203).root;s.position.set(1.5,0,-2),s.rotation.y=Math.PI/2,e.add(s);let c=se(204).root;c.position.set(2.6,0,1.5),c.rotation.y=-Math.PI/2,e.add(c);let l=fe(205,{w:.6}).root;l.position.set(-2.1,1.3,1.6),l.rotation.y=Math.PI/2,e.add(l);let u=I(206,{cols:7}).root;return u.position.set(.2,0,3.8999999999999995),u.rotation.y=Math.PI,e.add(u),{root:e,lights:[[`ceiling`,{pos:[.3,2.62,-.4],kelvin:4500,lumens:3200,radius:7,angle:1.24,flicker:.26,shaft:.22}],[`sconce`,{pos:[-2.04,1.98,-1],kelvin:2950,lumens:380,radius:3.6,flicker:.05,dir:[1,-.35,0],shaft:.2}],[`bare-bulb`,{pos:[2.5,2.3,2.6],kelvin:2400,lumens:220,radius:3.4,flicker:.22}]]}}function ut(){let e=S(`space.interro`);e.add(J({x0:-1.9,x1:1.9,z0:-2.6,z1:1.9,h:2.72,floor:`concrete.rooftop`,ceil:`plaster.cracked`,wall:`plaster.cracked`,wainscot:`wood.painted.white`,wainscotH:.92}));let t=S(`table`);t.add(x(T(1.42,.052,.82,.01,2),`wood.varnished.dark`,{pos:[0,.735,0],wear:.95,seed:211}));let n=[],r=[];for(let[e,t]of[[-1,-1],[1,-1],[-1,1],[1,1]])n.push(E([[.036,0],[.03,.06],[.026,.6],[.032,.71]],12)),r.push(D([e*.6,0,t*.3]));n.push(O([[-.6,.14,-.3],[-.6,.14,.3]],.016,4,6)),r.push(null),n.push(O([[.6,.14,-.3],[.6,.14,.3]],.016,4,6)),r.push(null),t.add(x(b(n,r),`steel.galvanized`,{wear:.9,seed:212})),t.position.set(0,0,-.55),t.rotation.y=.05,y(t,{strength:.7,spread:1}),e.add(t);let i=x((()=>{let e=[],t=[];e.push(T(.42,.038,.4,.01,2)),t.push(D([0,.45,0])),e.push(T(.4,.46,.034,.01,2)),t.push(D([0,.7,-.18],[-.1,0,0]));for(let[n,r]of[[-1,-1],[1,-1],[-1,1],[1,1]])e.push(E([[.02,0],[.017,.44]],10)),t.push(D([n*.17,0,r*.16]));return b(e,t)})(),`wood.varnished.dark`,{wear:1,seed:221});i.position.set(.12,0,-1.42),i.rotation.y=Math.PI+.16,y(i,{strength:.62,spread:.8}),e.add(i);let a=F(231).root;a.position.set(.3,.762,-.42),e.add(a);let o=N(232).root;o.position.set(.3,.782,-.4),o.rotation.y=.7,e.add(o);let s=ee(233).root;s.position.set(-.34,.762,-.66),e.add(s);let c=M(234).root;c.position.set(-.1,.762,-.3),c.rotation.y=-.24,e.add(c);let l=I(235,{cols:8}).root;return l.position.set(-1.3,0,-2.42),e.add(l),{root:e,lights:[[`desk`,{pos:[.06,1.92,-.62],target:[0,.74,-.6],kelvin:2750,lumens:620,radius:4.4,angle:.5,penumbra:.26,flicker:.08,shaft:.95,hot:3.4}],[`sconce`,{pos:[-1.76,2.1,1.5],kelvin:3050,lumens:130,radius:3.2,flicker:.05,dir:[1,-.5,-.4],shaft:.14}]]}}var dt={"lobby-night":ot,"corridor-night":st,"room-dusk":ct,bathroom:lt,interrogation:ut};function Q(e,t,n={}){let r=x(e,t,n);return r.material=Le(r.material,n.wet??1),r}function ft(t,n){let i=g(n),a=[],o=[],s=[];a.push(0,0,0),s.push(.5,.5);let c=[];for(let e=0;e<34;e++)c.push(t*(.62+.38*(.5+.5*Math.sin(e*1.7+n)*i())));for(let e=0;e<34;e++){let t=e/34*Math.PI*2,n=(c[e]*2+c[(e+1)%34]+c[(e+34-1)%34])*.25;a.push(Math.cos(t)*n,0,Math.sin(t)*n*.78),s.push(.5+Math.cos(t)*.5,.5+Math.sin(t)*.5),o.push(0,1+e,1+(e+1)%34)}let l=new d;l.setAttribute(`position`,new r(a,3)),l.setAttribute(`uv`,new r(s,2)),l.setIndex(o),l.computeVertexNormals();let u=new e(l,Le(k(`water.dark`),1));return u.castShadow=!1,u.receiveShadow=!0,u}function pt(){let e=S(`space.rooftop`),t=g(303),n=Q(new c(23.5,25.5,24,24),`concrete.rooftop`,{rot:[-Math.PI/2,0,0],pos:[-1.25,0,-3.25],cast:!1,wet:.9});e.add(n);let r=[],i=[];for(let e=0;e<14;e++)r.push(T(23.5,.012,.16,.004,1)),i.push(D([-1.25,.006,-15.2+e*1.86+(t()-.5)*.12],[0,(t()-.5)*.006,0]));e.add(Q(b(r,i),`steel.rusted`,{cast:!1,wear:1,seed:311,wet:.7}));let a=[],o=[],s=1.04,l=(e,t,n,r)=>{a.push(T(n,s,r,.02,2)),o.push(D([e,s*.5,t])),a.push(T(n+.1,.09,r+.1,.014,2)),o.push(D([e,1.085,t]))};l(-1.25,-16.16,24.14,.32),l(-1.25,9.66,24.14,.32),l(-13.16,-3.25,.32,25.5),l(10.66,-3.25,.32,25.5),e.add(Q(b(a,o),`concrete.rooftop`,{wear:.9,seed:321,wet:.75}));let u=S(`bulkhead`);u.add(Q(T(3.4,2.85,3,.03,2),`plaster.cracked`,{pos:[0,1.425,0],wear:.95,seed:331,wet:.6})),u.add(Q(T(3.7,.16,3.3,.02,2),`concrete.rooftop`,{pos:[0,2.92,0],wear:.9,seed:332,wet:.8}));let d=ce(333,{w:.9,h:2.02,door:`steel.rusted`,trim:`steel.galvanized`}).root;d.position.set(0,0,1.52),u.add(d),u.position.set(-7.4,0,-1.2),u.rotation.y=.12,v(u,!0,!0),e.add(u);let f=_e(341,{text:`VIRGIL`,scale:.46}).root;f.position.set(-7,3.35,.35),f.rotation.y=.34,e.add(f);for(let[t,[n,r,i,a,o]]of[[-1.9,-6.4,.32,1.45,2.45],[3.6,-10.2,-.55,1.15,2.05]].entries()){let s=ae(351+t*7,{r:a,h:o}).root,c=S(`cradle`),l=[],u=[];for(let e of[-1,1])l.push(T(a*2.4,.22,.28,.014,2)),u.push(D([0,.11,e*a*.62]));for(let e=0;e<4;e++)l.push(T(.24,.22,a*1.7,.012,2)),u.push(D([(e-1.5)*a*.72,.11,0]));c.add(Q(b(l,u),`wood.varnished.dark`,{wear:1,seed:361+t,wet:.7})),s.position.y=.22;let d=S(`tank`,c,s);d.position.set(n,0,r),d.rotation.y=i,y(d,{strength:.8,radius:a*1.5,radiusZ:a*1.5}),v(d,!0,!0),e.add(d)}let p=Q(b([O([[-1.9,1.9,-5],[-1.9,1.35,-3.6],[-3.6,1.15,-2.4],[-6,.95,-1.6],[-7.2,.55,-1]],.075,44,12),O([[3.6,1.6,-9.1],[3.2,1.2,-7.4],[1.2,.85,-5.6],[-1.2,.72,-4.4]],.055,36,10)]),`steel.rusted`,{wear:1,seed:371,wet:.8});e.add(p);let m=[],h=[];for(let[e,t]of[[-3.6,-2.4],[-6,-1.6],[1.2,-5.6]])m.push(E([[.09,0],[.13,.02],[.13,.06],[.09,.08]],16)),h.push(D([e,.72,t],[Math.PI/2,0,.3]));e.add(Q(b(m,h),`steel.galvanized`,{wear:1,seed:372,wet:.7}));let _=S(`vents`);for(let[e,[t,n,r,i]]of[[0,0,1.55,.2],[.72,-.5,1.15,-.6],[-.55,-.86,.92,1.1]].entries()){let a=ie(381+e,{h:r}).root;a.position.set(t,0,n),a.rotation.y=i,_.add(a)}let x=Q(T(2,.34,1.9,.03,2),`concrete.rooftop`,{pos:[.1,.17,-.3],wear:.95,seed:385,wet:.85});_.add(x),_.position.set(3.9,0,3.6),_.rotation.y=-.4,v(_,!0,!0),e.add(_);let C=oe(391,{w:2.2,d:1.15}).root;C.position.set(10.8,1.06,3.2),C.rotation.y=Math.PI/2,e.add(C);let w=[],k=[];for(let e of[-1,1])w.push(O([[e*.21,0,0],[e*.19,2.6,-.5]],.022,6,8)),k.push(null);for(let e=0;e<9;e++){let t=e/8;w.push(O([[-.2,t*2.6,-t*.5],[.2,t*2.6,-t*.5]],.016,4,7)),k.push(null)}let A=Q(b(w,k),`steel.galvanized`,{wear:1,seed:395,wet:.8});A.position.set(-5.4,0,1.9),A.rotation.y=-.5,y(A,{strength:.5,radius:.5,radiusZ:.5}),e.add(A);for(let[n,[r,i,a]]of[[1.2,2.4,1.35],[-2.6,1.2,.95],[4.6,-2.2,1.1],[-4.4,-4,1.5],[.4,-1.2,.8]].entries()){let o=ft(a,401+n);o.position.set(r,.014,i),o.rotation.y=t()*3.14,e.add(o)}return{root:e,lights:[[`moon`,{pos:[-28,40,44],target:[0,0,-4],kelvin:7600,lux:130,extent:30}],[`neon`,{pos:[-6.6,3.35,.72],kelvin:2100,lumens:1600,radius:8.5,flicker:.34,fixture:!1}],[`street`,{pos:[12.5,7.2,6],target:[1,.2,-3],kelvin:2050,lumens:14e3,radius:26,angle:.62,flicker:.05,shaft:.75,fixture:!1}],[`bare-bulb`,{pos:[-7.4,2.32,2.78],kelvin:2400,lumens:300,radius:4.6,flicker:.26}]]}}var $=-500,mt={...dt,"rooftop-rain":pt};function ht(e,t){let n=new o;n.name=`atmo.probe`,n.position.y=$,e.scene.add(n);let r=new Map,i=[],a=null;return n.userData.setRig=e=>{for(let e of i)e.dispose();if(i=[],a&&(a.root.visible=!1),a=null,!e)return;let o=mt[e]?e:`lobby-night`,s=r.get(o);s||(s=mt[o](),s.root.name=`atmo.space.${o}`,n.add(s.root),r.set(o,s)),s.root.visible=!0,a=s;for(let[e,n]of s.lights){let r={...n};r.pos=[n.pos[0],n.pos[1]+$,n.pos[2]],n.target&&(r.target=[n.target[0],n.target[1]+$,n.target[2]]),i.push(t(e,r))}},n.userData.spaceName=()=>a?a.root.name:null,n}export{Me as i,ht as n,Re as r,$ as t};
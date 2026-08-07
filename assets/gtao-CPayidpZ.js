import{$ as e,Pn as t,Q as n,Rn as r,St as i,W as a,ft as o,lt as s,mn as c,pn as l}from"./three.core-BesWO3HN.js";var u=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,d=`
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
}`,f=d+`
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
}`,p=`
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
}`,m=`
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
}`,h=d+`
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
}`;function g(e,t,n){let o=new r(Math.max(1,e|0),Math.max(1,t|0),{format:i,type:n??1016,minFilter:a,magFilter:a,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return o.texture.colorSpace=``,o}var _=class{constructor(){this.scene=new l,this.cam=new s(-1,1,1,-1,0,1),this.mesh=new e(new o(2,2),null),this.mesh.frustumCulled=!1,this.scene.add(this.mesh)}draw(e,t,n){this.mesh.material=t;let r=e.autoClear;e.autoClear=!1,e.setRenderTarget(n??null),e.render(this.scene,this.cam),e.autoClear=r}};function v(e,t){return new c({defines:t??{},vertexShader:u,fragmentShader:e,depthTest:!1,depthWrite:!1,uniforms:{}})}var y=class{async init(e){let r=e.quality??{};this.enabled=r.gtao!==!1,this.quad=new _,this.slices=Math.max(1,r.gtaoSlices??3),this.steps=Math.max(2,r.gtaoSteps??8),this.flip=0,this.w=0,this.h=0,this.mMarch=v(f,{SLICES:this.slices,STEPS:this.steps}),this.mMarch.uniforms={uDepth:{value:null},uNormal:{value:null},uNoise:{value:null},uInvProj:{value:new n},uProj:{value:new t},uRadius:{value:.9},uThick:{value:.05},uPower:{value:4.2},uMaxRad:{value:.02},uFrame:{value:0},uHasNoise:{value:0},uFar:{value:100}},this.mBlur=v(p),this.mBlur.uniforms={uAo:{value:null},uNormal:{value:null},uStep:{value:new t}},this.mTemporal=v(m),this.mTemporal.uniforms={uCur:{value:null},uHist:{value:null},uVel:{value:null},uFeedback:{value:.88}},this.mUp=v(h),this.mUp.uniforms={uAo:{value:null},uDepth:{value:null},uInvProj:{value:new n},uTexel:{value:new t}}}setSize(e,t,n){this._alloc(e,t)}_alloc(e,t){let n=Math.max(1,e>>1),r=Math.max(1,t>>1);if(this.w!==n||this.h!==r){this.w=n,this.h=r;for(let e of[this.raw,this.tmp,this.hist0,this.hist1])e?.dispose();this.raw=g(n,r),this.tmp=g(n,r),this.hist0=g(n,r),this.hist1=g(n,r)}}render(e){let t=e.targets?.ao;if(!this.enabled||!t||!e.targets.normal)return;this._alloc(e.w,e.h);let n=e.renderer,r=e.matrices.proj,i=this.mMarch.uniforms;i.uDepth.value=e.depthTexture??e.targets.hdr?.depthTexture,i.uNormal.value=e.targets.normal.texture,i.uNoise.value=e.blueNoise??null,i.uHasNoise.value=+!!e.blueNoise,i.uInvProj.value.copy(e.matrices.invProj),i.uProj.value.set(r.elements[0],r.elements[5]),i.uFrame.value=(e.frame??0)%64,i.uFar.value=e.camera.far,this.quad.draw(n,this.mMarch,this.raw);let a=this.mBlur.uniforms;a.uNormal.value=e.targets.normal.texture,a.uAo.value=this.raw.texture,a.uStep.value.set(1/this.w,0),this.quad.draw(n,this.mBlur,this.tmp),a.uAo.value=this.tmp.texture,a.uStep.value.set(0,1/this.h),this.quad.draw(n,this.mBlur,this.raw);let o=this.flip?this.hist1:this.hist0,s=this.flip?this.hist0:this.hist1,c=this.mTemporal.uniforms;c.uCur.value=this.raw.texture,c.uHist.value=s.texture,c.uVel.value=e.targets.velocity?.texture??null,c.uFeedback.value=e.targets.velocity?.88:0,this.quad.draw(n,this.mTemporal,o),this.flip^=1;let l=this.mUp.uniforms;l.uAo.value=o.texture,l.uDepth.value=i.uDepth.value,l.uInvProj.value.copy(e.matrices.invProj),l.uTexel.value.set(1/this.w,1/this.h),this.quad.draw(n,this.mUp,t)}dispose(){for(let e of[this.raw,this.tmp,this.hist0,this.hist1])e?.dispose();for(let e of[this.mMarch,this.mBlur,this.mTemporal,this.mUp])e?.dispose()}};export{y as default};
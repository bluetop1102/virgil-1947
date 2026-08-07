import{$ as e,Pn as t,Q as n,Rn as r,St as i,W as a,at as o,ft as s,lt as c,mn as l,pn as u,z as d}from"./three.core-BesWO3HN.js";var f={explore:11,evidence:4,closeup:2.4},p=33,m=5,h=8,g=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,_=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
uniform float uFocal, uFstop, uSensor, uPixels, uNear, uFocusFixed, uMaxCoc, uNearCap, uNearLimit;
float lin (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return -(c.z / c.w);
}
// 중앙 1픽셀 오토포커스는 소품 하나에 초점이 튄다. 십자 5탭의 절사평균으로 고정한다.
float focusDist () {
  if (uFocusFixed > 0.0) return uFocusFixed;
  float a = lin(vec2(0.50, 0.50));
  float b = lin(vec2(0.47, 0.50));
  float c = lin(vec2(0.53, 0.50));
  float d = lin(vec2(0.50, 0.47));
  float e = lin(vec2(0.50, 0.53));
  float mn = min(min(a, b), min(c, min(d, e)));
  float mx = max(max(a, b), max(c, max(d, e)));
  return max((a + b + c + d + e - mn - mx) / 3.0, 0.25);
}
float coc (float d) {
  float f0 = focusDist();
  float A = uFocal / max(uFstop, 0.7);
  float c = A * abs(d - f0) / max(d, 1e-3) * uFocal / max(f0 - uFocal, 1e-3);
  // 근경은 물리값 그대로 두면 전경 소품이 뭉개져 2차 디테일이 사라진다(루브릭 G6). 실사 게임 관례대로 감쇄한다.
  // 감쇄에 더해 근거리 한계(uNearLimit)를 둔다. 이 거리보다 먼 것은 조리개를 아무리 열어도
  // 전경 흐림을 받지 않는다 — 라디에이터·벽등·천장보처럼 카메라에서 0.6m 이상 떨어진
  // 전경 오클루더가 형태 판별이 안 될 만큼 뭉개지는 사고를 조리개 프리셋과 무관하게 막는다.
  float near = step(d, f0);
  float lim = 1.0 - smoothstep(uNearLimit * 0.5, uNearLimit, d);
  float px = c / uSensor * uPixels * mix(1.0, uNear * lim, near);
  // 근경 상한을 원경과 분리한다. 초점이 복도 끝처럼 먼 곳에 잡히면 1m 앞 전경 오클루더가
  // 원경과 같은 상한까지 흐려질 수 있고, 그 순간 화면 한쪽이 "읽히는 전경"이 아니라
  // "뭉갠 영역"이 된다(루브릭 G8/G6). 조리개를 여는 보케 프리셋에서 특히 그렇다 —
  // f/2.4 면 uMaxCoc 이 tile 상한 6까지 열리는데 근경은 0.6(풀해상도 1.2px)을 넘지 않는다.
  float cap = mix(uMaxCoc, uMaxCoc * uNearCap, near);
  return clamp(px, 0.0, cap) * mix(1.0, -1.0, near);
}`,v=_+`
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main () {
  vec3 c = (texture2D(uSrc, vUv + vec2(-0.5, -0.5) * uTexel).rgb
          + texture2D(uSrc, vUv + vec2( 0.5, -0.5) * uTexel).rgb
          + texture2D(uSrc, vUv + vec2(-0.5,  0.5) * uTexel).rgb
          + texture2D(uSrc, vUv + vec2( 0.5,  0.5) * uTexel).rgb) * 0.25;
  gl_FragColor = vec4(c, coc(lin(vUv)));
}`,y=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main () {
  float m = 0.0;
  for (int y = 0; y < TILE; y++) {
    for (int x = 0; x < TILE; x++) {
      vec2 o = (vec2(float(x), float(y)) - float(TILE) * 0.5 + 0.5) * uTexel;
      m = max(m, abs(texture2D(uSrc, vUv + o).a));
    }
  }
  gl_FragColor = vec4(m);
}`,b=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main () {
  float m = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      m = max(m, texture2D(uSrc, vUv + vec2(float(x), float(y)) * uTexel).r);
    }
  }
  gl_FragColor = vec4(m);
}`,x=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc, uNoise, uTile;
uniform vec2 uTexel;
uniform float uMaxCoc, uFrame, uHasNoise, uBlades, uRot;
const float GA = 2.39996323;
const float PI = 3.14159265359;

float blue () {
  vec2 fc = gl_FragCoord.xy;
  float n = uHasNoise > 0.5
    ? texture2D(uNoise, fract(fc / 64.0)).x
    : fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
  return fract(n + uFrame * 0.61803399);
}
// 조리개 날 n장의 정n각형 경계 반지름 — 원형 디스크를 육각 보케로 깎는다
float blade (float th) {
  float a = PI / uBlades;
  return cos(a) / cos(mod(th + uRot, 2.0 * a) - a);
}

void main () {
  vec4 c0 = texture2D(uSrc, vUv);
  float R = clamp(max(abs(c0.a), texture2D(uTile, vUv).r), 0.0, uMaxCoc);
  if (R < 0.75) { gl_FragColor = vec4(c0.rgb, 0.0); return; }
  float jit = blue() * GA;
  vec3 sum = c0.rgb;
  float wsum = 1.0, nearW = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i) + 0.5;
    float rr = sqrt(fi / float(TAPS));
    float th = fi * GA + jit;
    float rad = rr * blade(th);
    vec2 off = vec2(cos(th), sin(th)) * rad * R;
    vec4 s = texture2D(uSrc, vUv + off * uTexel);
    float dist = rad * R;
    float w = clamp((abs(s.a) - dist) * 0.7 + 1.0, 0.0, 1.0);
    // 전경 블리딩 커버리지 — "이 픽셀 앞에 있고, 자기 CoC 가 여기까지 닿을 만큼 더 흐린" 탭만 센다.
    // 부호만 보면 초점이 원경일 때 화면 전체가 근경이라 커버리지가 포화하고, 합성이 어디서나
    // 흐린 버퍼를 100% 채택해 중경 디테일이 통째로 날아간다(루브릭 G6).
    nearW += w * step(dist, -s.a) * step(abs(c0.a) + 0.75, -s.a);
    sum += s.rgb * w;
    wsum += w;
  }
  gl_FragColor = vec4(sum / wsum, clamp(nearW / float(TAPS) * 1.7, 0.0, 1.0));
}`,S=_+`
uniform sampler2D uSharp, uBlur;
void main () {
  vec4 b = texture2D(uBlur, vUv);
  vec3 sharp = texture2D(uSharp, vUv).rgb;
  // 1.5~4.0 은 풀해상도 픽셀. 개더의 컷오프(하프해상도 0.75)와 같은 지점에서 열린다.
  float k = max(smoothstep(1.5, 4.0, abs(coc(lin(vUv)))), b.a);
  gl_FragColor = vec4(mix(sharp, b.rgb, clamp(k, 0.0, 1.0)), 1.0);
}`,C=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
void main () { gl_FragColor = texture2D(uSrc, vUv); }`;function w(e,t,n){let s=n?o:a,c=new r(Math.max(1,e|0),Math.max(1,t|0),{format:i,type:d,minFilter:s,magFilter:s,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return c.texture.colorSpace=``,c}var T=class{constructor(){this.scene=new u,this.cam=new c(-1,1,1,-1,0,1),this.mesh=new e(new s(2,2),null),this.mesh.frustumCulled=!1,this.scene.add(this.mesh)}draw(e,t,n){this.mesh.material=t;let r=e.autoClear;e.autoClear=!1,e.setRenderTarget(n??null),e.render(this.scene,this.cam),e.autoClear=r}};function E(e,t){return new l({defines:t??{},vertexShader:g,fragmentShader:e,depthTest:!1,depthWrite:!1,uniforms:{}})}var D=class{async init(e){let r=e.quality??{};this.enabled=r.dof!==!1,this.taps=r.name===`cinematic`?48:28,this.quad=new T,this.w=0,this.h=0,this.sensor=.024,this.maxCoc=6,this.tile=6;let i=()=>({uDepth:{value:null},uInvProj:{value:new n},uFocal:{value:.03},uFstop:{value:5.6},uSensor:{value:this.sensor},uPixels:{value:720},uNear:{value:.6},uFocusFixed:{value:0},uMaxCoc:{value:this.maxCoc},uNearCap:{value:.1},uNearLimit:{value:.6}});this.mPrep=E(v),this.mPrep.uniforms=Object.assign(i(),{uSrc:{value:null},uTexel:{value:new t}}),this.mTile=E(y,{TILE:this.tile}),this.mTile.uniforms={uSrc:{value:null},uTexel:{value:new t}},this.mTileD=E(b),this.mTileD.uniforms={uSrc:{value:null},uTexel:{value:new t}},this.mGather=E(x,{TAPS:this.taps}),this.mGather.uniforms={uSrc:{value:null},uNoise:{value:null},uTile:{value:null},uTexel:{value:new t},uMaxCoc:{value:this.maxCoc},uFrame:{value:0},uHasNoise:{value:0},uBlades:{value:6},uRot:{value:.42}},this.mComp=E(S),this.mComp.uniforms=Object.assign(i(),{uSharp:{value:null},uBlur:{value:null}}),this.mBlit=E(C),this.mBlit.uniforms={uSrc:{value:null}}}setSize(e,t,n){this._alloc(e,t)}_alloc(e,t){if(this.w===e&&this.h===t)return;this.w=e,this.h=t;for(let e of[this.half,this.blur,this.full,this.tile0,this.tile1])e?.dispose();let n=Math.max(1,e>>1),r=Math.max(1,t>>1);this.half=w(n,r),this.blur=w(n,r),this.full=w(e,t);let i=Math.max(1,Math.ceil(n/this.tile)),a=Math.max(1,Math.ceil(r/this.tile));this.tile0=w(i,a,!0),this.tile1=w(i,a,!0)}_lens(e,t,n){let r=e.camera.userData??{},i=e.look??{},a=e.camera.fov*Math.PI/180;t.uFocal.value=.5*this.sensor/Math.tan(a*.5);let o=r.aperture??i.aperture??i.fStop??f.explore;t.uFstop.value=o,t.uMaxCoc.value=Math.min(this.maxCoc,Math.max(1.5,p/o));let s=r.focus??i.focus??i.focusDistance??0;t.uFocusFixed.value=s>0?s:o>=h?m:0,t.uPixels.value=n,t.uDepth.value=e.depthTexture??e.targets.hdr?.depthTexture,t.uInvProj.value.copy(e.matrices.invProj)}render(e){let t=e.targets?.hdr;if(!this.enabled||!t)return;this._alloc(e.w,e.h);let n=e.renderer,r=this.mPrep.uniforms;this._lens(e,r,e.h>>1),r.uSrc.value=t.texture,r.uTexel.value.set(1/e.w,1/e.h),this.quad.draw(n,this.mPrep,this.half);let i=this.mTile.uniforms;i.uSrc.value=this.half.texture,i.uTexel.value.set(2/e.w,2/e.h),this.quad.draw(n,this.mTile,this.tile0);let a=this.mTileD.uniforms;a.uSrc.value=this.tile0.texture,a.uTexel.value.set(1/this.tile0.width,1/this.tile0.height),this.quad.draw(n,this.mTileD,this.tile1);let o=this.mGather.uniforms;o.uMaxCoc.value=r.uMaxCoc.value,o.uSrc.value=this.half.texture,o.uTile.value=this.tile1.texture,o.uNoise.value=e.blueNoise??null,o.uHasNoise.value=+!!e.blueNoise,o.uFrame.value=(e.frame??0)%64,o.uTexel.value.set(2/e.w,2/e.h),this.quad.draw(n,this.mGather,this.blur);let s=this.mComp.uniforms;this._lens(e,s,e.h),s.uSharp.value=t.texture,s.uBlur.value=this.blur.texture,this.quad.draw(n,this.mComp,this.full),this.mBlit.uniforms.uSrc.value=this.full.texture,this.quad.draw(n,this.mBlit,t)}dispose(){for(let e of[this.half,this.blur,this.full,this.tile0,this.tile1])e?.dispose();for(let e of[this.mPrep,this.mTile,this.mTileD,this.mGather,this.mComp,this.mBlit])e?.dispose()}};export{f as APERTURE,D as default};
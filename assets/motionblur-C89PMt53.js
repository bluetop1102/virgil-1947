import{$ as e,Pn as t,Q as n,Rn as r,St as i,W as a,ft as o,lt as s,mn as c,pn as l,z as u}from"./three.core-BesWO3HN.js";var d=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,f=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uShutter;
void main () {
  vec2 best = vec2(0.0);
  float bl = 0.0;
  for (int y = 0; y < TILE; y++) {
    for (int x = 0; x < TILE; x++) {
      vec2 o = (vec2(float(x), float(y)) - float(TILE) * 0.5 + 0.5) * uTexel;
      vec2 v = texture2D(uVel, vUv + o).xy * 0.5 * uShutter;
      float l = dot(v, v);
      if (l > bl) { bl = l; best = v; }
    }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`,p=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTile;
uniform vec2 uTexel;
void main () {
  vec2 best = vec2(0.0);
  float bl = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 v = texture2D(uTile, vUv + vec2(float(x), float(y)) * uTexel).xy;
      float l = dot(v, v);
      if (l > bl) { bl = l; best = v; }
    }
  }
  gl_FragColor = vec4(best, 0.0, 1.0);
}`,m=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc, uVel, uNeighbor, uDepth, uNoise;
uniform mat4 uInvProj;
uniform vec2 uRes;
uniform float uShutter, uFrame, uHasNoise, uMaxLen, uRollMin, uRollLo;

// HDR 하프플로트 오버플로 방어. 재구성 필터의 가중 w 는 0 이 될 수 있어 Inf*0 = NaN 이 되고,
// 이 패스는 결과를 hdr 에 되쓰므로 그 NaN이 TAA 히스토리로 넘어가 영구화된다(ssr 과 같은 기전).
vec3 fin (vec3 c) { return (c.r + c.g + c.b < 3.0e38) ? max(c, vec3(0.0)) : vec3(0.0); }
float lin (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return -(c.z / c.w);
}
float blue () {
  vec2 fc = gl_FragCoord.xy;
  float n = uHasNoise > 0.5
    ? texture2D(uNoise, fract(fc / 64.0)).x
    : fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
  return fract(n + uFrame * 0.61803399);
}
float cone (float d, float v) { return clamp(1.0 - d / max(v, 1e-4), 0.0, 1.0); }
float cyl (float d, float v) { return 1.0 - smoothstep(0.95 * v, 1.05 * v, d); }
float softZ (float za, float zb) { return clamp(1.0 - 2.0 * (za - zb) / max(min(za, zb), 1e-3), 0.0, 1.0); }

void main () {
  vec3 c0 = fin(texture2D(uSrc, vUv).rgb);
  vec2 vn = texture2D(uNeighbor, vUv).xy;
  float lnp = length(vn * uRes);
  if (lnp < 0.8) { gl_FragColor = vec4(c0, 1.0); return; }
  if (lnp > uMaxLen) { vn *= uMaxLen / lnp; lnp = uMaxLen; }

  // 셔터 롤오프. 180도 고정은 인트로 트래킹처럼 화면이 통째로 흐르는 구간에서 형체를 뭉개
  // "필터/결함"으로 읽힌다(G8, 리뷰 15-cin-t14.jpg). 실제 촬영도 빠른 팬에서는 셔터를 닫는다.
  // 느린 이동(uRollLo 미만)에서는 정확히 1.0 이라 걷는 속도의 블러는 그대로 남는다.
  float roll = mix(1.0, uRollMin, smoothstep(uRollLo, uMaxLen, lnp));
  vn *= roll;
  lnp *= roll;

  vec2 vc = texture2D(uVel, vUv).xy * 0.5 * uShutter * roll;
  float lcp = max(length(vc * uRes), 0.5);
  float z0 = lin(vUv);
  float jit = blue() - 0.5;

  vec3 sum = c0 * (1.0 / max(lcp, 1.0));
  float wsum = 1.0 / max(lcp, 1.0);

  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) + 0.5 + jit) / float(TAPS) - 0.5;
    vec2 uv = vUv + vn * t;
    float d = abs(t) * lnp;
    float zs = lin(uv);
    vec2 vs = texture2D(uVel, uv).xy * 0.5 * uShutter * roll;
    float lsp = max(length(vs * uRes), 0.5);
    float fg = softZ(z0, zs);            // 탭이 앞에 있음 → 탭의 속도로 번짐
    float bg = softZ(zs, z0);            // 탭이 뒤에 있음 → 중앙 속도로 번짐
    float w = fg * cone(d, lsp) + bg * cone(d, lcp) + cyl(d, lsp) * cyl(d, lcp) * 2.0;
    sum += fin(texture2D(uSrc, uv).rgb) * w;
    wsum += w;
  }
  gl_FragColor = vec4(sum / max(wsum, 1e-4), 1.0);
}`,h=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
void main () { gl_FragColor = texture2D(uSrc, vUv); }`;function g(e,t){let n=new r(Math.max(1,e|0),Math.max(1,t|0),{format:i,type:u,minFilter:a,magFilter:a,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return n.texture.colorSpace=``,n}var _=class{constructor(){this.scene=new l,this.cam=new s(-1,1,1,-1,0,1),this.mesh=new e(new o(2,2),null),this.mesh.frustumCulled=!1,this.scene.add(this.mesh)}draw(e,t,n){this.mesh.material=t;let r=e.autoClear;e.autoClear=!1,e.setRenderTarget(n??null),e.render(this.scene,this.cam),e.autoClear=r}};function v(e,t){return new c({defines:t??{},vertexShader:d,fragmentShader:e,depthTest:!1,depthWrite:!1,uniforms:{}})}var y=class{async init(e){let r=e.quality??{};this.enabled=r.motionBlur!==!1,this.tile=8,this.taps=18,this.quad=new _,this.w=0,this.h=0,this.mTile=v(f,{TILE:this.tile}),this.mTile.uniforms={uVel:{value:null},uTexel:{value:new t},uShutter:{value:.5}},this.mNeighbor=v(p),this.mNeighbor.uniforms={uTile:{value:null},uTexel:{value:new t}},this.mBlur=v(m,{TAPS:this.taps}),this.mBlur.uniforms={uSrc:{value:null},uVel:{value:null},uNeighbor:{value:null},uDepth:{value:null},uNoise:{value:null},uInvProj:{value:new n},uRes:{value:new t},uShutter:{value:.5},uFrame:{value:0},uHasNoise:{value:0},uMaxLen:{value:90},uRollMin:{value:.3},uRollLo:{value:24}},this.mBlit=v(h),this.mBlit.uniforms={uSrc:{value:null}}}setSize(e,t,n){this._alloc(e,t)}_alloc(e,t){if(this.w===e&&this.h===t)return;this.w=e,this.h=t;for(let e of[this.tileRT,this.nbRT,this.full])e?.dispose();let n=Math.max(1,Math.ceil(e/this.tile)),r=Math.max(1,Math.ceil(t/this.tile));this.tileRT=g(n,r),this.nbRT=g(n,r),this.full=g(e,t);let i=Math.max(16,Math.round(t*.04));this.mBlur.uniforms.uMaxLen.value=i,this.mBlur.uniforms.uRollLo.value=i*.3}render(e){let t=e.targets?.hdr,n=e.targets?.velocity;if(!this.enabled||!t||!n)return;this._alloc(e.w,e.h);let r=e.renderer,i=this.mTile.uniforms;i.uVel.value=n.texture,i.uTexel.value.set(1/e.w,1/e.h),this.quad.draw(r,this.mTile,this.tileRT);let a=this.mNeighbor.uniforms;a.uTile.value=this.tileRT.texture,a.uTexel.value.set(1/this.tileRT.width,1/this.tileRT.height),this.quad.draw(r,this.mNeighbor,this.nbRT);let o=this.mBlur.uniforms;o.uSrc.value=t.texture,o.uVel.value=n.texture,o.uNeighbor.value=this.nbRT.texture,o.uDepth.value=e.depthTexture??t.depthTexture,o.uNoise.value=e.blueNoise??null,o.uHasNoise.value=+!!e.blueNoise,o.uInvProj.value.copy(e.matrices.invProj),o.uRes.value.set(e.w,e.h),o.uFrame.value=(e.frame??0)%64,this.quad.draw(r,this.mBlur,this.full),this.mBlit.uniforms.uSrc.value=this.full.texture,this.quad.draw(r,this.mBlit,t)}dispose(){for(let e of[this.tileRT,this.nbRT,this.full])e?.dispose();for(let e of[this.mTile,this.mNeighbor,this.mBlur,this.mBlit])e?.dispose()}};export{y as default};
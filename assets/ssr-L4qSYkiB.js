import{$ as e,G as t,Pn as n,Q as r,Rn as i,St as a,W as o,ft as s,lt as c,mn as l,pn as u,z as d}from"./three.core-BesWO3HN.js";var f=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,p=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
vec3 vpos (vec2 uv) {
  float z = texture2D(uDepth, uv).x;
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return c.xyz / c.w;
}`,m=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform float uClamp;
void main () {
  vec3 c = texture2D(uSrc, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * (uClamp / max(uClamp, l)), 1.0);
}`,h=p+`
uniform sampler2D uNormal, uRough, uChain, uNoise;
uniform mat4 uProj, uInvView;
uniform float uFrame, uHasNoise, uMaxDist, uThick, uStrength, uLodScale, uMaxLod, uFar;
uniform float uRoughCut, uRoughBand, uRoughLod, uRoughFloor;

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
  if (d <= 0.0 || d >= uFar * 0.98 || nl < 0.2) { gl_FragColor = vec4(0.0); return; }
  N /= nl;
  vec3 V = normalize(P);
  vec3 R = reflect(V, N);

  // 프리패스가 어태치먼트 2에 실효 러프니스를 굽는다(클리어코트는 코트 롭으로 mix된 값). 그걸 그대로 쓴다.
  // 노멀 방향 추정을 쓰던 시절엔 카펫이 수평면이라는 이유만으로 rough 0.07 = 거울로 취급됐다.
  vec3 wn = normalize((uInvView * vec4(N, 0.0)).xyz);
  float up = clamp(wn.y, 0.0, 1.0);
  float rough = clamp(texture2D(uRough, vUv).x, 0.0, 1.0);

  // 러프니스 마스크. 컷오프를 넘으면 반사 강도를 uRoughFloor 까지 떨어뜨리고 밉을 강제로 올린다.
  float rm = smoothstep(uRoughCut, uRoughCut + uRoughBand, rough);
  float cosV = clamp(dot(-V, N), 0.0, 1.0);
  float f0 = mix(0.04, 0.10, up);
  float fres = f0 + (1.0 - f0) * pow(1.0 - cosV, 5.0);
  float refl = fres * (1.0 - rough * 0.85) * mix(1.0, uRoughFloor, rm) * uStrength;
  if (refl < 0.002) { gl_FragColor = vec4(0.0); return; }

  float jit = blue(0.0);
  vec3 P0 = P + N * (0.02 + 0.006 * d);
  float hitT = -1.0, prevT = 0.0;
  vec2 hitUv = vec2(0.0);
  float edge = 1.0;

  for (int i = 1; i <= STEPS; i++) {
    float t = (float(i) - 1.0 + jit) / float(STEPS);
    float dist = uMaxDist * t * t + 0.02;
    vec3 rp = P0 + R * dist;
    if (rp.z > -0.02) break;                     // 카메라 뒤로 나간 레이
    vec4 c = uProj * vec4(rp, 1.0);
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) { edge = 0.0; break; }
    float sceneZ = -vpos(suv).z;
    float diff = -rp.z - sceneZ;
    if (diff > 0.0 && diff < uThick + sceneZ * 0.035) { hitT = dist; hitUv = suv; break; }
    prevT = dist;
  }

  if (hitT < 0.0) { gl_FragColor = vec4(0.0); return; }

  float lo = prevT, hi = hitT;
  for (int k = 0; k < 5; k++) {
    float mid = (lo + hi) * 0.5;
    vec3 rp = P0 + R * mid;
    vec4 c = uProj * vec4(rp, 1.0);
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    float sceneZ = -vpos(suv).z;
    if (-rp.z - sceneZ > 0.0) { hi = mid; hitUv = suv; } else lo = mid;
  }
  hitT = hi;

  vec3 hn = texture2D(uNormal, hitUv).xyz;
  if (length(hn) > 0.2 && dot(normalize(hn), R) > 0.05) { gl_FragColor = vec4(0.0); return; }

  // 러프니스·이동거리로 콘 각을 정하고 밉 체인에서 흐린 반사를 뽑는다.
  // 컷오프를 넘는 면은 uRoughLod 만큼 밉을 더 올려 형상이 판독되지 않게 뭉갠다.
  float lod = clamp(log2(1.0 + rough * rough * hitT * uLodScale) + rm * uRoughLod, 0.0, uMaxLod);
  vec3 col = textureLod(uChain, hitUv, lod).rgb;

  vec2 e = smoothstep(vec2(0.0), vec2(0.14), hitUv) * (1.0 - smoothstep(vec2(0.86), vec2(1.0), hitUv));
  float conf = edge * e.x * e.y;
  conf *= 1.0 - smoothstep(0.55, 1.0, dot(R, -V));      // 카메라로 되돌아오는 레이는 신뢰 불가
  conf *= 1.0 - smoothstep(uMaxDist * 0.55, uMaxDist, hitT);
  gl_FragColor = vec4(col, clamp(conf * refl, 0.0, 1.0));
}`,g=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur, uHist, uVel;
uniform float uFeedback;
void main () {
  vec4 c = texture2D(uCur, vUv);
  vec2 vel = texture2D(uVel, vUv).xy;
  vec2 puv = vUv - vel * 0.5;
  vec4 h = texture2D(uHist, puv);
  float ok = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  gl_FragColor = mix(c, mix(h, c, 1.0 - uFeedback), ok);
}`,_=p+`
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main () {
  float d = -vpos(vUv).z;
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = vUv + vec2(float(x), float(y)) * uTexel;
      vec4 s = texture2D(uSrc, uv);
      float sd = -vpos(uv).z;
      float w = 1.0 / (0.05 + abs(sd - d) * 4.0);
      sum += s * w; wsum += w;
    }
  }
  gl_FragColor = sum / max(wsum, 1e-4);
}`;function v(e,n,r){let s=new i(Math.max(1,e|0),Math.max(1,n|0),{format:a,type:d,minFilter:r?t:o,magFilter:o,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!!r});return s.texture.colorSpace=``,s}var y=class{constructor(){this.scene=new u,this.cam=new c(-1,1,1,-1,0,1),this.mesh=new e(new s(2,2),null),this.mesh.frustumCulled=!1,this.scene.add(this.mesh)}draw(e,t,n){this.mesh.material=t;let r=e.autoClear;e.autoClear=!1,e.setRenderTarget(n??null),e.render(this.scene,this.cam),e.autoClear=r}};function b(e,t){return new l({defines:t??{},vertexShader:f,fragmentShader:e,depthTest:!1,depthWrite:!1,uniforms:{}})}var x=class{async init(e){let t=e.quality??{};this.enabled=t.ssr!==!1&&(t.ssrSteps??0)>0,this.steps=Math.max(8,t.ssrSteps??24),this.quad=new y,this.flip=0,this.w=0,this.h=0,this.cleared=!1,this.mCopy=b(m),this.mCopy.uniforms={uSrc:{value:null},uClamp:{value:8}},this.mZero=b(`precision highp float;
void main () { gl_FragColor = vec4(0.0); }`),this.mMarch=b(h,{STEPS:this.steps}),this.mMarch.uniforms={uDepth:{value:null},uNormal:{value:null},uRough:{value:null},uChain:{value:null},uNoise:{value:null},uInvProj:{value:new r},uProj:{value:new r},uInvView:{value:new r},uNoiseScale:{value:new n(1,1)},uFrame:{value:0},uHasNoise:{value:0},uMaxDist:{value:16},uThick:{value:.35},uStrength:{value:1},uLodScale:{value:2.2},uMaxLod:{value:5},uFar:{value:100},uRoughCut:{value:.4},uRoughBand:{value:.2},uRoughLod:{value:4},uRoughFloor:{value:.09}},this.mTemporal=b(g),this.mTemporal.uniforms={uCur:{value:null},uHist:{value:null},uVel:{value:null},uFeedback:{value:.82}},this.mUp=b(_),this.mUp.uniforms={uSrc:{value:null},uLow:{value:null},uDepth:{value:null},uInvProj:{value:new r},uTexel:{value:new n}}}setSize(e,t,n){this._alloc(e,t)}_alloc(e,t){let n=Math.max(1,e>>1),r=Math.max(1,t>>1);if(this.w!==n||this.h!==r){this.w=n,this.h=r;for(let e of[this.chain,this.raw,this.hist0,this.hist1])e?.dispose();this.chain=v(n,r,!0),this.raw=v(n,r),this.hist0=v(n,r),this.hist1=v(n,r),this.mMarch.uniforms.uMaxLod.value=Math.max(0,Math.floor(Math.log2(Math.max(n,r)))-2)}}render(e){let t=e.targets?.ssr;if(!t||!e.targets.normal||!e.targets.roughness||!e.targets.hdr)return;let n=e.renderer;if(!this.enabled){this.cleared||=(this.quad.draw(n,this.mZero,t),!0);return}this._alloc(e.w,e.h),this.mCopy.uniforms.uSrc.value=e.targets.hdr.texture,this.quad.draw(n,this.mCopy,this.chain);let r=this.mMarch.uniforms;r.uDepth.value=e.depthTexture??e.targets.hdr.depthTexture,r.uNormal.value=e.targets.normal.texture,r.uRough.value=e.targets.roughness?.texture??null,r.uChain.value=this.chain.texture,r.uNoise.value=e.blueNoise??null,r.uHasNoise.value=+!!e.blueNoise,r.uInvProj.value.copy(e.matrices.invProj),r.uProj.value.copy(e.matrices.proj),r.uInvView.value.copy(e.matrices.invView),r.uFrame.value=(e.frame??0)%64,r.uFar.value=e.camera.far,this.quad.draw(n,this.mMarch,this.raw);let i=this.raw;if(e.targets.velocity){let t=this.flip?this.hist1:this.hist0,r=this.flip?this.hist0:this.hist1,a=this.mTemporal.uniforms;a.uCur.value=this.raw.texture,a.uHist.value=r.texture,a.uVel.value=e.targets.velocity.texture,this.quad.draw(n,this.mTemporal,t),this.flip^=1,i=t}let a=this.mUp.uniforms;a.uSrc.value=i.texture,a.uDepth.value=r.uDepth.value,a.uInvProj.value.copy(e.matrices.invProj),a.uTexel.value.set(1/this.w,1/this.h),this.quad.draw(n,this.mUp,t)}dispose(){for(let e of[this.chain,this.raw,this.hist0,this.hist1])e?.dispose();for(let e of[this.mCopy,this.mZero,this.mMarch,this.mTemporal,this.mUp])e?.dispose()}};export{x as default};
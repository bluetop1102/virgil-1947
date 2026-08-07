import{$ as e,Pn as t,Rn as n,St as r,W as i,ft as a,lt as o,mn as s,pn as c,z as l}from"./three.core-BesWO3HN.js";var u=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,d=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
vec3 T (vec2 o) { return texture2D(uSrc, vUv + o * uTexel).rgb; }
`,f=d+`
uniform float uKaris, uThreshold, uKnee, uPrefilter;
float lum (vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 knee (vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float k = uThreshold * uKnee + 1e-5;
  float soft = clamp(br - uThreshold + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k);
  return c * max(soft, br - uThreshold) / max(br, 1e-5);
}
void main () {
  vec3 a = T(vec2(-2.0,  2.0)), b = T(vec2(0.0,  2.0)), c = T(vec2(2.0,  2.0));
  vec3 d = T(vec2(-2.0,  0.0)), e = T(vec2(0.0,  0.0)), f = T(vec2(2.0,  0.0));
  vec3 g = T(vec2(-2.0, -2.0)), h = T(vec2(0.0, -2.0)), i = T(vec2(2.0, -2.0));
  vec3 j = T(vec2(-1.0,  1.0)), k = T(vec2(1.0,  1.0));
  vec3 l = T(vec2(-1.0, -1.0)), m = T(vec2(1.0, -1.0));
  vec3 r;
  if (uKaris > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25;
    vec3 g4 = (j + k + l + m) * 0.25;
    float w0 = 0.125 / (1.0 + lum(g0)), w1 = 0.125 / (1.0 + lum(g1));
    float w2 = 0.125 / (1.0 + lum(g2)), w3 = 0.125 / (1.0 + lum(g3));
    float w4 = 0.5 / (1.0 + lum(g4));
    r = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    r = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  if (uPrefilter > 0.5) r = knee(r);
  gl_FragColor = vec4(max(r, vec3(0.0)), 1.0);
}`,p=d+`
uniform sampler2D uBase;
uniform float uRadius, uHasBase, uStrength;
void main () {
  vec3 t = (T(vec2(-1.0,  1.0) * uRadius) + T(vec2(0.0,  1.0) * uRadius) * 2.0 + T(vec2(1.0,  1.0) * uRadius)
          + T(vec2(-1.0,  0.0) * uRadius) * 2.0 + T(vec2(0.0, 0.0)) * 4.0 + T(vec2(1.0,  0.0) * uRadius) * 2.0
          + T(vec2(-1.0, -1.0) * uRadius) + T(vec2(0.0, -1.0) * uRadius) * 2.0 + T(vec2(1.0, -1.0) * uRadius)) / 16.0;
  vec3 base = uHasBase > 0.5 ? texture2D(uBase, vUv).rgb : vec3(0.0);
  gl_FragColor = vec4((t + base) * uStrength, 1.0);
}`;function m(e,t){let a=new n(Math.max(1,e|0),Math.max(1,t|0),{format:r,type:l,minFilter:i,magFilter:i,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return a.texture.colorSpace=``,a}var h=class{constructor(){this.scene=new c,this.cam=new o(-1,1,1,-1,0,1),this.mesh=new e(new a(2,2),null),this.mesh.frustumCulled=!1,this.scene.add(this.mesh)}draw(e,t,n){this.mesh.material=t;let r=e.autoClear;e.autoClear=!1,e.setRenderTarget(n??null),e.render(this.scene,this.cam),e.autoClear=r}};function g(e){return new s({vertexShader:u,fragmentShader:e,depthTest:!1,depthWrite:!1,uniforms:{}})}var _=class{async init(e){let n=e.quality??{};this.enabled=n.bloom!==!1,this.mips=Math.max(2,Math.min(n.bloomMips??5,8)),this.quad=new h,this.down=[],this.up=[],this.w=0,this.h=0,this.mDown=g(f),this.mDown.uniforms={uSrc:{value:null},uTexel:{value:new t},uKaris:{value:0},uThreshold:{value:1.05},uKnee:{value:.62},uPrefilter:{value:0}},this.mUp=g(p),this.mUp.uniforms={uSrc:{value:null},uBase:{value:null},uTexel:{value:new t},uRadius:{value:1},uHasBase:{value:0},uStrength:{value:1}},this.strength=.26}setSize(e,t,n){this._alloc(e,t)}_alloc(e,t){if(this.w===e&&this.h===t)return;this.w=e,this.h=t;for(let e of this.down)e.dispose();for(let e of this.up)e.dispose();this.down=[],this.up=[];let n=e,r=t;for(let e=0;e<this.mips&&(n=Math.max(1,n>>1),r=Math.max(1,r>>1),!(n<4||r<4));e++)this.down.push(m(n,r));for(let e=0;e<this.down.length-1;e++)this.up.push(m(this.down[e].width,this.down[e].height))}render(e){let t=e.targets?.bloom;if(!this.enabled||!t||!e.targets.hdr||(this._alloc(e.w,e.h),this.down.length<2))return;let n=e.renderer,r=this.mDown.uniforms;for(let t=0;t<this.down.length;t++){let i=t===0?e.targets.hdr:this.down[t-1];r.uSrc.value=i.texture,r.uTexel.value.set(1/i.width,1/i.height),r.uKaris.value=+(t===0),r.uPrefilter.value=+(t===0),this.quad.draw(n,this.mDown,this.down[t])}let i=this.mUp.uniforms;i.uRadius.value=1;for(let e=this.up.length-1;e>=0;e--){let t=e===this.up.length-1?this.down[e+1]:this.up[e+1];i.uSrc.value=t.texture,i.uTexel.value.set(1/t.width,1/t.height),i.uBase.value=this.down[e].texture,i.uHasBase.value=1,i.uStrength.value=.5,this.quad.draw(n,this.mUp,this.up[e])}let a=this.up[0];i.uSrc.value=a.texture,i.uTexel.value.set(1/a.width,1/a.height),i.uHasBase.value=0,i.uStrength.value=this.strength,this.quad.draw(n,this.mUp,t)}dispose(){for(let e of this.down)e.dispose();for(let e of this.up)e.dispose();this.mDown?.dispose(),this.mUp?.dispose()}};export{_ as default};
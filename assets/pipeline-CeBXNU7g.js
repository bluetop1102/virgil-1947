const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./bloom-C-OXtdVY.js","./three.core-BesWO3HN.js","./composite-BkPdpsxq.js","./composite-BHyfaXL3.js","./dof-DJ3mVHcO.js","./gtao-CPayidpZ.js","./motionblur-C89PMt53.js","./prepass-BPiqyBsW.js","./prepass-B5CWJ6jk.js","./ssr-DpYXCujV.js","./taa-ApeLewno.js","./taa-BIjN7aRE.js","./volmarch-DECW73Wq.js","./volmarch-5YAHO3ny.js","./volnoise-tVzwbxvw.js","./volnoise-Bbvlaw_R.js","./util-Co7KvJK9.js","./volumetric-CDK0rKyu.js"])))=>i.map(i=>d[i]);
import{$ as e,$t as t,D as n,En as r,Fn as i,P as a,Pn as o,Q as s,Rn as c,St as l,W as u,_n as d,a as f,at as p,lt as m,m as h,mn as g,o as _,pn as v,rn as y,z as b}from"./three.core-BesWO3HN.js";import{t as x}from"./preload-helper-HclGiUj8.js";import{n as S,r as C,t as w}from"./bluenoise-nPBm_87V.js";import{t as T}from"./contact-C5zdI5M8.js";import{t as E}from"./exposure-CqjzVOgc.js";import{t as D}from"./composite-BHyfaXL3.js";import{t as O}from"./prepass-B5CWJ6jk.js";import{t as k}from"./taa-BIjN7aRE.js";import{t as A}from"./pcss-oRC2HmSX.js";A();var j=Object.assign({"./passes/bloom.js":()=>x(()=>import(`./bloom-C-OXtdVY.js`),__vite__mapDeps([0,1]),import.meta.url),"./passes/composite.js":()=>x(()=>import(`./composite-BkPdpsxq.js`),__vite__mapDeps([2,3,1]),import.meta.url),"./passes/dof.js":()=>x(()=>import(`./dof-DJ3mVHcO.js`),__vite__mapDeps([4,1]),import.meta.url),"./passes/gtao.js":()=>x(()=>import(`./gtao-CPayidpZ.js`),__vite__mapDeps([5,1]),import.meta.url),"./passes/motionblur.js":()=>x(()=>import(`./motionblur-C89PMt53.js`),__vite__mapDeps([6,1]),import.meta.url),"./passes/prepass.js":()=>x(()=>import(`./prepass-BPiqyBsW.js`),__vite__mapDeps([7,8,1]),import.meta.url),"./passes/ssr.js":()=>x(()=>import(`./ssr-DpYXCujV.js`),__vite__mapDeps([9,1]),import.meta.url),"./passes/taa.js":()=>x(()=>import(`./taa-ApeLewno.js`),__vite__mapDeps([10,11,1]),import.meta.url),"./passes/volmarch.js":()=>x(()=>import(`./volmarch-DECW73Wq.js`),__vite__mapDeps([12,13]),import.meta.url),"./passes/volnoise.js":()=>x(()=>import(`./volnoise-tVzwbxvw.js`),__vite__mapDeps([14,15,1,16]),import.meta.url),"./passes/volumetric.js":()=>x(()=>import(`./volumetric-CDK0rKyu.js`),__vite__mapDeps([17,1,13,15,16]),import.meta.url)}),M=[[`gtao`,`gtao`],[`ssr`,`ssr`],[`volumetric`,`volumetric`],[`bloom`,`bloom`],[`dof`,`dof`],[`motionblur`,`motionBlur`]],N=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,P=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tAo;
uniform sampler2D tContact;
uniform float uStrength;
uniform float uPow;
uniform float uHasGtao;
uniform float uHasContact;
void main () {
  float g = uHasGtao > 0.5 ? clamp( texture2D( tAo, vUv ).r, 0.0, 1.0 ) : 1.0;
  float c = uHasContact > 0.5 ? clamp( texture2D( tContact, vUv ).r, 0.0, 1.0 ) : 1.0;
  float v = clamp( pow( g, uPow ) * c, 0.0, 1.0 );
  const vec3 albedo = vec3( 0.20, 0.22, 0.26 );
  vec3 a =  2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c2 =  2.7552 * albedo + 0.6903;
  vec3 mb = max( vec3( v ), ( ( v * a + b ) * v + c2 ) * v );
  gl_FragColor = vec4( mix( vec3( 1.0 ), mb, uStrength ), 1.0 );
}
`,F=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSsr;
void main () {
  vec4 s = texture2D( tSsr, vUv );
  gl_FragColor = vec4( s.rgb * clamp( s.a, 0.0, 1.0 ), 1.0 );
}
`,I=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tVol;
uniform sampler2D tNormalDepth;
uniform vec2 uVolTexel;
uniform float uIntensity;
void main () {
  float d0 = texture2D( tNormalDepth, vUv ).a;
  vec4 sum = vec4( 0.0 );
  float wsum = 0.0;
  for ( int j = 0; j < 2; j ++ ) {
    for ( int i = 0; i < 2; i ++ ) {
      vec2 o = ( vec2( float( i ), float( j ) ) - 0.5 ) * uVolTexel;
      float dz = abs( texture2D( tNormalDepth, vUv + o ).a - d0 );
      float w = 1.0 / ( 0.02 + dz * dz * 40.0 );
      sum += texture2D( tVol, vUv + o ) * w;
      wsum += w;
    }
  }
  vec4 v = sum / wsum;
  gl_FragColor = vec4( v.rgb * uIntensity, clamp( v.a, 0.0, 1.0 ) );
}
`;function L(e,t,n=!1){return new c(e,t,{type:b,format:l,minFilter:u,magFilter:u,depthBuffer:n,stencilBuffer:!1,generateMipmaps:!1})}var R={name:`pipeline`,order:100,ready:!1,frame:0,async init(t){this.engine=t;let n=t.renderer;this.renderer=n,n.toneMapping=0,n.autoClear=!1,n.shadowMap.autoUpdate=!1;let r=new _;r.setAttribute(`position`,new f(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),r.setAttribute(`uv`,new f(new Float32Array([0,0,2,0,0,2]),2)),r.boundingSphere=new d(new i,4),this.quad=new e(r,null),this.quad.frustumCulled=!1,this.quadScene=new v,this.quadScene.add(this.quad),this.fsCam=new m(-1,1,1,-1,-1,1);let a=n.getDrawingBufferSize(new o),c=Math.max(1,a.x|0),l=Math.max(1,a.y|0);this.clearColor=new h,this.tmpColor=new h,this.noiseOffset=new o,this.jitterSave=new Float64Array(2);let u=this;this.ctx={engine:t,renderer:n,scene:t.scene,camera:t.camera,w:c,h:l,targets:{},depthTexture:null,frame:0,jitter:{x:0,y:0},matrices:{proj:new s,invProj:new s,view:new s,invView:new s,viewProj:new s,prevViewProj:new s},quality:t.quality,look:t.look,blueNoise:w(64,388119),fsq(e,t){u.fsq(e,t)}},this.alloc(c,l),this.contact=new T,this.contact.init(this.ctx),this.expo=new E,this.expo.init(this.ctx),t.bus.on(`qa:shot`,()=>this.expo.reset()),this.aoApply=this.applyMaterial(P,{tAo:{value:this.ctx.targets.ao.texture},tContact:{value:this.contact.texture},uStrength:{value:1},uPow:{value:1.7},uHasGtao:{value:0},uHasContact:{value:1}},208,200),this.ssrApply=this.applyMaterial(F,{tSsr:{value:this.ctx.targets.ssr.texture}},201,201),this.volApply=this.applyMaterial(I,{tVol:{value:this.ctx.targets.vol.texture},tNormalDepth:{value:this.ctx.targets.normal.texture},uVolTexel:{value:new o},uIntensity:{value:1}},201,204),this.volApply.uniforms.uVolTexel.value.set(2/c,2/l),this.prepass=new O,await this.prepass.init(this.ctx),this.taa=new k,await this.taa.init(this.ctx),this.ctx.targets.hdrPrev=this.taa.history(),this.composite=new D,await this.composite.init(this.ctx),this.effects={};for(let[e,n]of M){let r=j[`./passes/${e}.js`];if(!(!r||t.quality[n]===!1))try{let t=await r(),n=t&&t.default;if(typeof n!=`function`)continue;let i=new n;i.init&&await i.init(this.ctx),this.effects[e]=i}catch(t){console.error(`[pipeline] pass ${e}`,t)}}this.aoApply.uniforms.uHasGtao.value=+!!this.effects.gtao,this.ready=!0},applyMaterial(e,t,n,r){return new g({uniforms:t,vertexShader:N,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:5,blendEquation:100,blendSrc:n,blendDst:r,blendSrcAlpha:200,blendDstAlpha:201})},alloc(e,i){let o=this.ctx.targets,s=Math.max(1,e>>1),d=Math.max(1,i>>1);o.hdr=L(e,i,!0),o.hdr.depthTexture=new n(e,i,a);let f=o.hdr.depthTexture;this.ctx.depthTexture=f,o.normal=new c(e,i,{type:b,format:l,minFilter:p,magFilter:p,depthBuffer:!0,stencilBuffer:!1,generateMipmaps:!1,count:3}),o.normal.textures[1].format=t,o.normal.textures[1].type=b,o.normal.textures[1].name=`velocity`,o.normal.textures[2].format=y,o.normal.textures[2].type=r,o.normal.textures[2].name=`roughness`;let m=Object.create(o.normal);Object.defineProperty(m,"texture",{value:o.normal.textures[1],enumerable:!0}),o.velocity=m;let h=Object.create(o.normal);Object.defineProperty(h,"texture",{value:o.normal.textures[2],enumerable:!0}),o.roughness=h,o.ao=new c(e,i,{type:r,format:y,minFilter:u,magFilter:u,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),o.ssr=L(e,i),o.vol=L(s,d),o.bloom=L(e,i),this.ctx.w=e,this.ctx.h=i,this.clearTarget(o.ao,1,1,1,1),this.clearTarget(o.ssr,0,0,0,0),this.clearTarget(o.vol,0,0,0,1),this.clearTarget(o.bloom,0,0,0,1),this.clearTarget(o.hdr,0,0,0,1),this.renderer.setRenderTarget(null)},clearTarget(e,t,n,r,i){let a=this.renderer,o=a.getClearColor(this.tmpColor).clone(),s=a.getClearAlpha();a.setRenderTarget(e),a.setClearColor(this.clearColor.setRGB(t,n,r),i),a.clear(!0,!0,!1),a.setClearColor(o,s)},freeTargets(){let e=this.ctx.targets;for(let t of[`hdr`,`normal`,`ao`,`ssr`,`vol`,`bloom`])e[t]&&e[t].dispose&&e[t].dispose();e.hdr&&e.hdr.depthTexture&&e.hdr.depthTexture.dispose()},fsq(e,t){let n=this.renderer;e.depthTest=!1,e.depthWrite=!1,n.setRenderTarget(t||null),this.quad.material=e,n.render(this.quadScene,this.fsCam)},resize(e,t){if(!this.ready)return;let n=this.renderer.getDrawingBufferSize(new o),r=Math.max(1,n.x|0),i=Math.max(1,n.y|0);if(r!==this.ctx.w||i!==this.ctx.h){this.freeTargets(),this.alloc(r,i),this.contact.setSize(r,i),this.aoApply.uniforms.tAo.value=this.ctx.targets.ao.texture,this.aoApply.uniforms.tContact.value=this.contact.texture,this.ssrApply.uniforms.tSsr.value=this.ctx.targets.ssr.texture,this.volApply.uniforms.tVol.value=this.ctx.targets.vol.texture,this.volApply.uniforms.tNormalDepth.value=this.ctx.targets.normal.texture,this.volApply.uniforms.uVolTexel.value.set(2/r,2/i),this.prepass.setSize(r,i,this.ctx),this.taa.setSize(r,i,this.ctx),this.composite.setSize(r,i,this.ctx);for(let e in this.effects)this.effects[e].setSize?.(r,i,this.ctx)}},updateMatrices(){let{camera:e,matrices:t}=this.ctx;e.updateMatrixWorld(),t.invView.copy(e.matrixWorld),t.view.copy(e.matrixWorld).invert(),t.proj.copy(e.projectionMatrix),t.invProj.copy(e.projectionMatrixInverse),t.viewProj.multiplyMatrices(t.proj,t.view)},applyJitter(){let e=this.ctx,t=e.quality,n=e.camera.projectionMatrix.elements;if(this.jitterSave[0]=n[8],this.jitterSave[1]=n[9],!t.taa){e.jitter.x=0,e.jitter.y=0;return}let r=Math.max(1,t.taaSamples|0),i=this.frame%r+1,a=(C(i,2)-.5)*2/e.w,o=(C(i,3)-.5)*2/e.h;n[8]+=a,n[9]+=o,e.camera.projectionMatrixInverse.copy(e.camera.projectionMatrix).invert(),e.jitter.x=a,e.jitter.y=o},removeJitter(){let e=this.ctx,t=e.camera.projectionMatrix.elements;t[8]=this.jitterSave[0],t[9]=this.jitterSave[1],e.camera.projectionMatrixInverse.copy(e.matrices.invProj)},update(){if(!this.ready)return;let e=this.ctx;e.frame=++this.frame,e.matrices.prevViewProj.copy(e.matrices.viewProj),this.updateMatrices(),S(this.frame,this.noiseOffset),e.blueNoise.offset.copy(this.noiseOffset),e.targets.hdrPrev=this.taa.history()},render(e){let t=this.ctx;if(!this.ready){this.renderer.render(this.engine.scene,this.engine.camera);return}let{renderer:n,scene:r,camera:i,targets:a,look:o}=t,s=this.effects;this.applyJitter(),this.prepass.render(t),s.gtao&&s.gtao.render(t),this.contact.render(t);let c=n.getClearColor(this.tmpColor).clone(),l=n.getClearAlpha();n.setRenderTarget(a.hdr),n.setClearColor(this.clearColor.setRGB(0,0,0),1),n.clear(!0,!0,!1),n.setClearColor(c,l),n.shadowMap.needsUpdate=!0,n.render(r,i),this.aoApply.uniforms.tContact.value=this.contact.texture,this.fsq(this.aoApply,a.hdr),s.ssr&&(s.ssr.render(t),this.fsq(this.ssrApply,a.hdr)),s.volumetric&&(s.volumetric.render(t),this.volApply.uniforms.uIntensity.value=o.volumetricIntensity??1,this.fsq(this.volApply,a.hdr)),s.bloom&&s.bloom.render(t),s.dof&&s.dof.render(t),s.motionblur&&s.motionblur.render(t),this.taa.render(t),this.composite.src=this.taa.output.texture,this.composite.bloomTex=s.bloom?a.bloom.texture:null,this.composite.exposure=this.expo.measure(t,this.composite.src,e||1/60)*(o.exposure??1),this.composite.render(t),this.removeJitter(),n.setRenderTarget(null)},dispose(){if(this.ready){this.freeTargets(),this.prepass.dispose?.(),this.taa.dispose?.(),this.composite.dispose?.(),this.contact.dispose(),this.expo.dispose();for(let e in this.effects)this.effects[e].dispose?.();this.aoApply.dispose(),this.ssrApply.dispose(),this.volApply.dispose(),this.ctx.blueNoise.dispose(),this.quad.geometry.dispose(),this.ready=!1}}};export{R as default};
import{Ln as e,Nn as t,Tn as n,it as r,pn as i,xt as a}from"./three.core-_aCheQum.js";var o=64,s=96,c=-14,l=24,u=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,d=`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );
void main () {
  float l = 0.0;
  for ( int y = 0; y < 4; y ++ ) {
    for ( int x = 0; x < 4; x ++ ) {
      vec2 o = ( vec2( float( x ), float( y ) ) - 1.5 ) * uTexel;
      l += max( dot( max( texture2D( tSrc, vUv + o ).rgb, vec3( 0.0 ) ), LUMA ), 0.0 );
    }
  }
  l *= 0.0625;
  float e = clamp( ( log2( max( l, 1e-6 ) ) - ( ${c}.0 ) ) / ${l}.0, 0.0, 1.0 );
  gl_FragColor = vec4( e, e, e, 1.0 );
}
`,f=class{init(c){this.target=new e(o,o,{type:n,format:a,minFilter:r,magFilter:r,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),this.target.texture.colorSpace=``,this.mat=new i({uniforms:{tSrc:{value:null},uTexel:{value:new t}},vertexShader:u,fragmentShader:d,depthTest:!1,depthWrite:!1,blending:0}),this.pixels=new Uint8Array(16384),this.hist=new Int32Array(s),this.key=.155,this.hiAnchor=.62,this.min=.015,this.max=600,this.rate=14,this.bias=1,this.value=1,this.target_=1,this.snap=!0,this.stats={avg:0,p99:0,ev:0}}reset(){this.snap=!0}measure(e,t,n){if(!t)return this.value;let r=e.renderer;this.mat.uniforms.tSrc.value=t,this.mat.uniforms.uTexel.value.set(1/Math.max(1,e.w),1/Math.max(1,e.h)),e.fsq(this.mat,this.target),r.readRenderTargetPixels(this.target,0,0,o,o,this.pixels);let i=this.hist;i.fill(0);let a=this.pixels;for(let e=0;e<4096;e++){let t=a[e*4]*s/256|0;t>=s&&(t=95),i[t]++}let u=0,d=0,f=0,p=c,m=4056;for(let e=0;e<s;e++){let t=i[e];if(!t)continue;let n=c+(e+.5)*l/s;u<m&&u+t>=m&&(p=n);let r=Math.max(u,1638),a=Math.min(u+t,4015);a>r&&(d+=n*(a-r),f+=a-r),u+=t}f<=0&&(d=c,f=1);let h=d/f,g=2**h,_=2**p;this.stats.avg=g,this.stats.p99=_,this.stats.ev=h;let v=this.key/Math.max(g,1e-7),y=this.hiAnchor/Math.max(_,1e-7),b=Math.max(v,y)*this.bias;if(b=Math.min(Math.max(b,this.min),this.max),this.target_=b,this.snap)this.value=b,this.snap=!1;else{let e=1-Math.exp(-Math.max(n,1/240)*this.rate),t=Math.log2(this.value);this.value=2**(t+(Math.log2(b)-t)*e)}return this.value}dispose(){this.target.dispose(),this.mat.dispose()}};export{f as t};
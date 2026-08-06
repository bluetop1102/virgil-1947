import{Ln as e,Nn as t,Tn as n,W as r,X as i,nn as a,pn as o}from"./three.core-_aCheQum.js";var s=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,c=`
precision highp float;
varying vec2 vUv;

uniform sampler2D uDepth;
uniform sampler2D uNormal;
uniform sampler2D uNoise;
uniform mat4 uInvProj;
uniform vec2 uProj;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uIntensity;
uniform float uFar;
uniform float uHasNoise;
uniform float uFrame;

const int TAPS = 12;
const float GOLDEN = 2.39996323;

vec3 vpos ( vec2 uv ) {
  float z = texture2D( uDepth, uv ).x;
  vec4 c = uInvProj * vec4( uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0 );
  return c.xyz / c.w;
}

void main () {
  vec3 P = vpos( vUv );
  float d = - P.z;
  vec4 nd = texture2D( uNormal, vUv );
  float nl = length( nd.xyz );
  if ( d <= 0.0 || d >= uFar * 0.98 || nl < 0.2 ) { gl_FragColor = vec4( 1.0 ); return; }
  vec3 N = nd.xyz / nl;

  // 반경을 화면공간으로 투영. 근접 표면에서 커널이 화면을 덮지 않도록 상한을 건다.
  vec2 rad = clamp( uRadius * 0.5 / d * uProj, uTexel * 1.5, vec2( 0.035 ) );

  float rot = uHasNoise > 0.5
    ? texture2D( uNoise, fract( gl_FragCoord.xy / 64.0 ) ).x
    : fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  rot = fract( rot + uFrame * 0.61803399 ) * 6.2831853;

  float occ = 0.0;
  for ( int i = 0; i < TAPS; i ++ ) {
    float fi = float( i );
    float a = fi * GOLDEN + rot;
    float rr = sqrt( ( fi + 0.5 ) / float( TAPS ) );
    vec2 o = vec2( cos( a ), sin( a ) ) * rr * rad;

    vec3 S = vpos( vUv + o );
    vec3 dv = S - P;
    float len = length( dv );
    if ( len < 1e-5 ) continue;
    // 셀프 오클루전 바이어스. 깊이 정밀도 잡음이 평면을 회색으로 만드는 것을 막는다.
    float ndl = max( dot( N, dv / len ) - 0.06, 0.0 );
    float att = 1.0 - smoothstep( uRadius * 0.35, uRadius, len );
    occ += ndl * att;
  }

  occ = clamp( occ / float( TAPS ) * uIntensity, 0.0, 1.0 );
  gl_FragColor = vec4( 1.0 - occ );
}
`,l=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uAo;
uniform sampler2D uNormal;
uniform vec2 uStep;
void main () {
  float c = texture2D( uAo, vUv ).r;
  float cd = texture2D( uNormal, vUv ).w;
  float sum = c, wsum = 1.0;
  for ( int i = 1; i <= 2; i ++ ) {
    float fi = float( i );
    for ( int j = 0; j < 2; j ++ ) {
      vec2 uv = vUv + uStep * fi * ( j == 0 ? 1.0 : - 1.0 );
      float s = texture2D( uAo, uv ).r;
      float sd = texture2D( uNormal, uv ).w;
      float w = exp( - 0.5 * fi * fi ) * exp( - abs( sd - cd ) * 40.0 / max( cd, 0.5 ) );
      sum += s * w; wsum += w;
    }
  }
  gl_FragColor = vec4( sum / max( wsum, 1e-4 ) );
}
`;function u(t,i){let o=new e(Math.max(1,t|0),Math.max(1,i|0),{type:n,format:a,minFilter:r,magFilter:r,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return o.texture.colorSpace=``,o}var d=class{init(e){this.w=0,this.h=0,this.mat=new o({uniforms:{uDepth:{value:null},uNormal:{value:null},uNoise:{value:null},uInvProj:{value:new i},uProj:{value:new t},uTexel:{value:new t},uRadius:{value:.15},uIntensity:{value:1},uFar:{value:100},uHasNoise:{value:0},uFrame:{value:0}},vertexShader:s,fragmentShader:c,depthTest:!1,depthWrite:!1,blending:0}),this.blur=new o({uniforms:{uAo:{value:null},uNormal:{value:null},uStep:{value:new t}},vertexShader:s,fragmentShader:l,depthTest:!1,depthWrite:!1,blending:0}),this.setSize(e.w,e.h)}setSize(e,t){(this.w!==e||this.h!==t)&&(this.w=e,this.h=t,this.out?.dispose(),this.tmp?.dispose(),this.out=u(e,t),this.tmp=u(e,t))}get texture(){return this.out.texture}render(e){if(!e.targets.normal||!e.depthTexture)return;this.setSize(e.w,e.h);let t=this.mat.uniforms,n=e.matrices.proj;t.uDepth.value=e.depthTexture,t.uNormal.value=e.targets.normal.texture,t.uNoise.value=e.blueNoise??null,t.uHasNoise.value=+!!e.blueNoise,t.uInvProj.value.copy(e.matrices.invProj),t.uProj.value.set(n.elements[0],n.elements[5]),t.uTexel.value.set(1/this.w,1/this.h),t.uFar.value=e.camera.far,t.uFrame.value=(e.frame??0)%64,e.fsq(this.mat,this.tmp);let r=this.blur.uniforms;r.uNormal.value=e.targets.normal.texture,r.uAo.value=this.tmp.texture,r.uStep.value.set(1/this.w,0),e.fsq(this.blur,this.out),r.uAo.value=this.out.texture,r.uStep.value.set(0,1/this.h),e.fsq(this.blur,this.tmp);let i=this.out;this.out=this.tmp,this.tmp=i}dispose(){this.out?.dispose(),this.tmp?.dispose(),this.mat.dispose(),this.blur.dispose()}};export{d as t};
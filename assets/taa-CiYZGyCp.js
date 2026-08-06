import{Ln as e,Nn as t,W as n,m as r,pn as i,xt as a,z as o}from"./three.core-_aCheQum.js";var s=`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`,c=`
precision highp float;

varying vec2 vUv;

uniform sampler2D tCurr;
uniform sampler2D tHist;
uniform sampler2D tVel;
uniform sampler2D tNormal;
uniform vec2 uTexel;
uniform vec2 uRes;
uniform float uMaxN;
uniform float uEnabled;
uniform float uSharpen;

vec3 rgb2ycocg ( vec3 c ) {
  return vec3(
    0.25 * c.r + 0.5 * c.g + 0.25 * c.b,
    0.5 * c.r - 0.5 * c.b,
    -0.25 * c.r + 0.5 * c.g - 0.25 * c.b );
}

vec3 ycocg2rgb ( vec3 c ) {
  float t = c.x - c.z;
  return vec3( t + c.y, c.x + c.z, t - c.y );
}

// 히스토리를 현재 색 방향으로 잘라낸다(clamp가 아니라 clip — 색상 왜곡이 적다)
vec3 clipToAABB ( vec3 hist, vec3 lo, vec3 hi ) {
  vec3 center = 0.5 * ( hi + lo );
  vec3 extent = 0.5 * ( hi - lo ) + 1e-5;
  vec3 d = hist - center;
  vec3 units = abs( d / extent );
  float m = max( units.x, max( units.y, units.z ) );
  return m > 1.0 ? center + d / m : hist;
}

// Catmull-Rom 5탭. 바이리니어 재샘플이 프레임마다 누적되면 히스토리가 뭉개진다.
vec3 historyCatmullRom ( vec2 uv, vec2 res ) {
  vec2 samplePos = uv * res;
  vec2 texPos1 = floor( samplePos - 0.5 ) + 0.5;
  vec2 f = samplePos - texPos1;
  vec2 w0 = f * ( -0.5 + f * ( 1.0 - 0.5 * f ) );
  vec2 w1 = 1.0 + f * f * ( -2.5 + 1.5 * f );
  vec2 w2 = f * ( 0.5 + f * ( 2.0 - 1.5 * f ) );
  vec2 w3 = f * f * ( -0.5 + 0.5 * f );
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / w12;
  vec2 p0 = ( texPos1 - 1.0 ) / res;
  vec2 p3 = ( texPos1 + 2.0 ) / res;
  vec2 p12 = ( texPos1 + offset12 ) / res;

  float a = w12.x * w0.y;
  float b = w0.x * w12.y;
  float c = w12.x * w12.y;
  float d = w3.x * w12.y;
  float e = w12.x * w3.y;

  vec3 r = vec3( 0.0 );
  r += texture2D( tHist, vec2( p12.x, p0.y ) ).rgb * a;
  r += texture2D( tHist, vec2( p0.x, p12.y ) ).rgb * b;
  r += texture2D( tHist, p12 ).rgb * c;
  r += texture2D( tHist, vec2( p3.x, p12.y ) ).rgb * d;
  r += texture2D( tHist, vec2( p12.x, p3.y ) ).rgb * e;
  return max( r / max( a + b + c + d + e, 1e-4 ), vec3( 0.0 ) );
}

void main () {
  vec2 uv = vUv;

  vec3 m1 = vec3( 0.0 );
  vec3 m2 = vec3( 0.0 );
  vec3 mn = vec3( 1e6 );
  vec3 mx = vec3( -1e6 );
  vec3 currY = vec3( 0.0 );
  float closest = 1e9;
  vec2 closestOff = vec2( 0.0 );

  for ( int y = -1; y <= 1; y ++ ) {
    for ( int x = -1; x <= 1; x ++ ) {
      vec2 o = vec2( float( x ), float( y ) ) * uTexel;
      vec3 s = rgb2ycocg( max( texture2D( tCurr, uv + o ).rgb, vec3( 0.0 ) ) );
      m1 += s;
      m2 += s * s;
      mn = min( mn, s );
      mx = max( mx, s );
      if ( x == 0 && y == 0 ) currY = s;
      float dpt = texture2D( tNormal, uv + o ).a;
      if ( dpt < closest ) { closest = dpt; closestOff = o; }
    }
  }

  vec3 mean = m1 / 9.0;
  vec3 sigma = sqrt( max( vec3( 0.0 ), m2 / 9.0 - mean * mean ) );

  // 가장 가까운 픽셀의 속도로 딜레이션 — 실루엣 에지가 배경 속도로 히스토리를 끌어오지 않게 한다
  vec2 vel = texture2D( tVel, uv + closestOff ).xy * 0.5;
  vec2 histUv = uv - vel;
  float motion = clamp( length( vel * uRes ) / 2.0, 0.0, 1.0 );

  float dCurr = texture2D( tNormal, uv ).a;
  float dHist = texture2D( tNormal, histUv ).a;
  float tol = 0.08 + 6.0 * length( vel );
  bool inside = histUv.x > 0.0 && histUv.x < 1.0 && histUv.y > 0.0 && histUv.y < 1.0;
  bool valid = inside && abs( dCurr - dHist ) <= tol * max( dCurr, 0.05 );

  vec3 histRgb = historyCatmullRom( histUv, uRes );
  float n = texture2D( tHist, histUv ).a;

  // 지터 누적이 먹은 고주파를 이웃 범위 안에서만 복원한다(범위 밖으로 나가면 링잉)
  vec3 sharpY = clamp( currY + ( currY - mean ) * uSharpen, mn, mx );

  vec3 histY = rgb2ycocg( histRgb );
  float g = mix( 1.9, 1.0, motion );
  vec3 lo = max( mean - g * sigma, mn );
  vec3 hi = min( mean + g * sigma, mx );
  vec3 clippedY = clipToAABB( histY, lo, hi );

  float clipDist = length( ( histY - clippedY ) / max( sigma, vec3( 1e-3 ) ) );

  if ( uEnabled < 0.5 || ! valid ) n = 0.0;
  n = min( n + 1.0, uMaxN );
  n = max( 1.0, mix( n, 1.0, clamp( clipDist * 0.35, 0.0, 1.0 ) ) );
  n = min( n, mix( uMaxN, 6.0, motion ) );

  float alpha = 1.0 / n;
  vec3 c = ycocg2rgb( sharpY );
  vec3 h = ycocg2rgb( clippedY );

  // 반딧불 억제 가중치는 이동 중에만. 정지 화면은 정확한 러닝 평균이어야 완전 수렴한다.
  float wc = mix( 1.0, 1.0 / ( 1.0 + max( c.r, max( c.g, c.b ) ) ), motion );
  float wh = mix( 1.0, 1.0 / ( 1.0 + max( h.r, max( h.g, h.b ) ) ), motion );
  vec3 outc = ( c * wc * alpha + h * wh * ( 1.0 - alpha ) ) / max( wc * alpha + wh * ( 1.0 - alpha ), 1e-5 );

  gl_FragColor = vec4( max( outc, vec3( 0.0 ) ), n );
}
`;function l(t,r){return new e(t,r,{type:o,format:a,minFilter:n,magFilter:n,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1})}var u=class{async init(e){this.a=l(e.w,e.h),this.b=l(e.w,e.h),this.read=this.a,this.output=this.b,this.mat=new i({uniforms:{tCurr:{value:null},tHist:{value:null},tVel:{value:null},tNormal:{value:null},uTexel:{value:new t},uRes:{value:new t},uMaxN:{value:32},uEnabled:{value:1},uSharpen:{value:.32}},vertexShader:s,fragmentShader:c,depthTest:!1,depthWrite:!1,blending:0}),this.tmp=new r,this.setSize(e.w,e.h,e)}history(){return this.read}clear(e){let t=e.renderer,n=t.getClearColor(this.tmp).clone(),r=t.getClearAlpha();t.setClearColor(0,0),t.setRenderTarget(this.a),t.clear(!0,!1,!1),t.setRenderTarget(this.b),t.clear(!0,!1,!1),t.setClearColor(n,r),t.setRenderTarget(null)}setSize(e,t,n){this.a.setSize(e,t),this.b.setSize(e,t);let r=this.mat.uniforms;r.uTexel.value.set(1/e,1/t),r.uRes.value.set(e,t);let i=Math.max(1,n.quality.taaSamples|0);r.uMaxN.value=n.quality.taa?Math.min(64,Math.max(8,i*2)):1,r.uEnabled.value=+!!n.quality.taa,this.clear(n)}render(e){let t=this.mat.uniforms,n=this.read===this.a?this.b:this.a;t.tCurr.value=e.targets.hdr.texture,t.tHist.value=this.read.texture,t.tVel.value=e.targets.velocity.texture,t.tNormal.value=e.targets.normal.texture,e.fsq(this.mat,n),this.output=n,this.read=n}dispose(){this.a.dispose(),this.b.dispose(),this.mat.dispose()}};export{u as t};
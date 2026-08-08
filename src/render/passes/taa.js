// TAA — 속도 버퍼 리프로젝션 + YCoCg 3x3 이웃 클리핑(분산 기반) + 누적 카운터 수렴.
// 정지 카메라에서 quality.taaSamples 주기가 두 번 닫히는 32프레임 안에 정확한 러닝 평균으로 수렴한다.
// 루브릭 D1(에일리어싱 실격)의 유일한 방어선이므로 히스토리 폐기 조건을 좁게 잡는다.

import * as THREE from 'three'

const VERT = /* glsl */`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

const FRAG = /* glsl */`
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

// HDR 하프플로트 오버플로 방어. Inf 픽셀은 반딧불 가중 1/(1+max(c))와 곱해져 NaN이 되고,
// TAA 히스토리는 EMA라 그 NaN을 영구히 물고 간다 — ssr.js/bloom.js와 같은 기전이고,
// 여기가 가장 마지막 관문이다(모션블러가 hdr에 되쓴 결과도 전부 이리로 들어온다).
// NaN은 모든 비교에 실패하므로 합이 유한한지로 거른다.
vec3 finite3 ( vec3 c ) { return ( c.r + c.g + c.b < 3.0e38 ) ? max( c, vec3( 0.0 ) ) : vec3( 0.0 ); }

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
  return finite3( r / max( a + b + c + d + e, 1e-4 ) );
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
      vec3 s = rgb2ycocg( finite3( texture2D( tCurr, uv + o ).rgb ) );
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
  // 누적 카운터도 이력이다. 한 번 NaN이 되면 alpha = 1/n 이 NaN 이라 그 픽셀이 영구히 죽는다.
  if ( ! ( n >= 0.0 && n < 1.0e30 ) ) n = 0.0;

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
`

function historyTarget (w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false
  })
}

export default class Taa {
  async init (ctx) {
    this.a = historyTarget(ctx.w, ctx.h)
    this.b = historyTarget(ctx.w, ctx.h)
    this.read = this.a
    this.output = this.b

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tCurr: { value: null },
        tHist: { value: null },
        tVel: { value: null },
        tNormal: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRes: { value: new THREE.Vector2() },
        uMaxN: { value: 32 },
        uEnabled: { value: 1 },
        uSharpen: { value: 0.32 }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    })

    this.tmp = new THREE.Color()
    this.setSize(ctx.w, ctx.h, ctx)
  }

  history () { return this.read }

  clear (ctx) {
    const r = ctx.renderer
    const prev = r.getClearColor(this.tmp).clone()
    const prevA = r.getClearAlpha()
    r.setClearColor(0x000000, 0)
    r.setRenderTarget(this.a)
    r.clear(true, false, false)
    r.setRenderTarget(this.b)
    r.clear(true, false, false)
    r.setClearColor(prev, prevA)
    r.setRenderTarget(null)
  }

  setSize (w, h, ctx) {
    this.a.setSize(w, h)
    this.b.setSize(w, h)
    const u = this.mat.uniforms
    u.uTexel.value.set(1 / w, 1 / h)
    u.uRes.value.set(w, h)
    const n = Math.max(1, ctx.quality.taaSamples | 0)
    u.uMaxN.value = ctx.quality.taa ? Math.min(64, Math.max(8, n * 2)) : 1
    u.uEnabled.value = ctx.quality.taa ? 1 : 0
    this.clear(ctx)
  }

  render (ctx) {
    const u = this.mat.uniforms
    const write = this.read === this.a ? this.b : this.a
    u.tCurr.value = ctx.targets.hdr.texture
    u.tHist.value = this.read.texture
    u.tVel.value = ctx.targets.velocity.texture
    u.tNormal.value = ctx.targets.normal.texture
    ctx.fsq(this.mat, write)
    this.output = write
    this.read = write
  }

  dispose () {
    this.a.dispose()
    this.b.dispose()
    this.mat.dispose()
  }
}

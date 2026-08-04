// 컨택트 오클루전 — 반경 0.15m 풀해상도 근거리 AO.
// GTAO는 반경이 넓어 넓고 얕은 차폐를 만든다. 오브젝트가 바닥에 "놓였다"고 읽히게 하는 것은
// 실루엣 2~4px 안쪽에서 급격히 떨어지는 어둠이므로(루브릭 G4/D5), 그 대역만 담당하는
// 두 번째 겹을 따로 둔다. GTAO와 곱해져 최종 AO가 된다.
//
// 노멀 지향 반구 샘플링 + 코사인 가중. 반경이 짧아 12탭이면 충분하고, 블루노이즈 회전과
// TAA 누적이 남은 노이즈를 지운다.

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
`

// 깊이 인지 4탭 크로스 블러. 접촉 대역은 살리고 탭 노이즈만 지운다.
const BLUR = /* glsl */`
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
`

function aoTarget (w, h) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    type: THREE.UnsignedByteType,
    format: THREE.RedFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false
  })
  t.texture.colorSpace = THREE.NoColorSpace
  return t
}

export default class ContactAo {
  init (ctx) {
    this.w = 0
    this.h = 0

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uDepth: { value: null },
        uNormal: { value: null },
        uNoise: { value: null },
        uInvProj: { value: new THREE.Matrix4() },
        uProj: { value: new THREE.Vector2() },
        uTexel: { value: new THREE.Vector2() },
        uRadius: { value: 0.15 },
        uIntensity: { value: 1.0 },
        uFar: { value: 100 },
        uHasNoise: { value: 0 },
        uFrame: { value: 0 }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    })

    this.blur = new THREE.ShaderMaterial({
      uniforms: {
        uAo: { value: null },
        uNormal: { value: null },
        uStep: { value: new THREE.Vector2() }
      },
      vertexShader: VERT,
      fragmentShader: BLUR,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    })

    this.setSize(ctx.w, ctx.h)
  }

  setSize (w, h) {
    if (this.w === w && this.h === h) return
    this.w = w; this.h = h
    this.out?.dispose()
    this.tmp?.dispose()
    this.out = aoTarget(w, h)
    this.tmp = aoTarget(w, h)
  }

  get texture () { return this.out.texture }

  render (ctx) {
    if (!ctx.targets.normal || !ctx.depthTexture) return
    this.setSize(ctx.w, ctx.h)
    const u = this.mat.uniforms
    const proj = ctx.matrices.proj
    u.uDepth.value = ctx.depthTexture
    u.uNormal.value = ctx.targets.normal.texture
    u.uNoise.value = ctx.blueNoise ?? null
    u.uHasNoise.value = ctx.blueNoise ? 1 : 0
    u.uInvProj.value.copy(ctx.matrices.invProj)
    u.uProj.value.set(proj.elements[0], proj.elements[5])
    u.uTexel.value.set(1 / this.w, 1 / this.h)
    u.uFar.value = ctx.camera.far
    u.uFrame.value = (ctx.frame ?? 0) % 64
    ctx.fsq(this.mat, this.tmp)

    const b = this.blur.uniforms
    b.uNormal.value = ctx.targets.normal.texture
    b.uAo.value = this.tmp.texture
    b.uStep.value.set(1 / this.w, 0)
    ctx.fsq(this.blur, this.out)
    b.uAo.value = this.out.texture
    b.uStep.value.set(0, 1 / this.h)
    ctx.fsq(this.blur, this.tmp)
    const s = this.out
    this.out = this.tmp
    this.tmp = s
  }

  dispose () {
    this.out?.dispose()
    this.tmp?.dispose()
    this.mat.dispose()
    this.blur.dispose()
  }
}

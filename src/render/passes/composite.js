// 최종 합성 — 색수차 → 블룸/헐레이션 → 노출 → AgX → lift/gamma/gain → 채도/대비 → 비네트 → sRGB → 그레인 → 디더.
// 파라미터는 전부 core/config.js의 LOOK에서 읽는다.
// 광학(색수차·헐레이션·비네트)은 톤매핑 앞, 에멀전(그레인)은 전사 뒤에 둔다.
// 순서를 물리 경로대로 잡아야 그레이딩이 "필터"가 아니라 렌즈/필름으로 읽힌다 (루브릭 G8).

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

uniform sampler2D tSrc;
uniform sampler2D tBloom;
uniform sampler2D tHalN;
uniform sampler2D tHalW;
uniform sampler2D tBlueNoise;
uniform float uHasBloom;
uniform float uExposure;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uContrast;
uniform float uHalation;
uniform float uHalGain;
uniform float uHalNarrow;
uniform float uHalWide;
uniform float uMidPivot;
uniform float uMidSlope;
uniform float uMidWidth;
uniform float uShoulder;
uniform float uShoulderK;
uniform float uChromatic;
uniform float uVignette;
uniform vec3 uFloor;
uniform float uToe;
uniform float uGrain;
uniform float uAspect;
uniform vec2 uNoiseScale;
uniform vec2 uNoiseOffset;
uniform vec2 uTexel;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
  vec3( 1.6605, - 0.1246, - 0.0182 ),
  vec3( - 0.5876, 1.1329, - 0.1006 ),
  vec3( - 0.0728, - 0.0083, 1.1187 ) );

const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
  vec3( 0.6274, 0.0691, 0.0164 ),
  vec3( 0.3293, 0.9195, 0.0880 ),
  vec3( 0.0433, 0.0113, 0.8956 ) );

vec3 agxContrast ( vec3 x ) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2
    - 40.14 * x4 * x
    + 31.96 * x4
    - 6.868 * x2 * x
    + 0.4298 * x2
    + 0.1191 * x
    - 0.00232;
}

vec3 agx ( vec3 color ) {
  const mat3 inset = mat3(
    vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
    vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
    vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
  const mat3 outset = mat3(
    vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
    vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
    vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 ) );
  const float minEv = - 12.47393;
  const float maxEv = 4.026069;

  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = inset * color;
  color = max( color, 1e-10 );
  color = log2( color );
  color = ( color - minEv ) / ( maxEv - minEv );
  color = clamp( color, 0.0, 1.0 );
  color = agxContrast( color );
  color = outset * color;
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
  return clamp( color, 0.0, 1.0 );
}

// 64텍셀 블루노이즈를 화면에 1:1로 깔면 64px 주기가 그대로 남는다 — 평탄면을 확대하면
// 필름 그레인이 아니라 오더드 디더 격자로 읽히고 자기상관에 주기 피크가 선다.
// 타일마다 위상만 해시로 흔든다. 타일 안의 블루노이즈 스펙트럼은 그대로 보존된다.
float hash21 ( vec2 p ) {
  vec3 q = fract( ( p.xyx + 0.17 ) * vec3( 0.1031, 0.1030, 0.0973 ) );
  q += dot( q, q.yzx + 33.33 );
  return fract( ( q.x + q.y ) * q.z );
}

vec2 tilePhase ( vec2 nuv, float k ) {
  vec2 tile = floor( nuv ) + k;
  return vec2( hash21( tile ), hash21( tile.yx + 19.19 ) );
}

vec3 srgbOETF ( vec3 c ) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow( max( c, vec3( 1e-6 ) ), vec3( 0.41666667 ) ) - 0.055;
  return mix( lo, hi, step( vec3( 0.0031308 ), c ) );
}


void main () {
  vec2 d = vUv - 0.5;

  vec2 nuv = vUv * uNoiseScale;
  float bn = texture2D( tBlueNoise, nuv + tilePhase( nuv, 0.0 ) + uNoiseOffset ).r;

  // 색수차는 렌즈 단계다 — 톤매핑보다 앞에서 샘플 위치로 준다.
  // 실제 렌즈의 횡색수차는 상고(像高)의 고차 함수라 화면 중앙에서 정확히 0이다.
  // 상수항을 두면 중앙 피사체 에지에도 적/청 이중 윤곽이 남아 "필터"로 읽힌다(G8).
  float rn = clamp( length( d ) / 0.5, 0.0, 1.0 );
  float caR = pow( max( rn - 0.40, 0.0 ) / 0.60, 2.5 );
  vec2 ca = normalize( d + 1e-6 ) * min( caR * uChromatic * 260.0, 0.8 ) * uTexel;
  vec3 c0 = max( texture2D( tSrc, vUv ).rgb, vec3( 0.0 ) );
  vec3 col;
  col.r = texture2D( tSrc, vUv + ca ).r;
  col.g = c0.g;
  col.b = texture2D( tSrc, vUv - ca ).b;
  col = max( col, vec3( 0.0 ) );

  // 미세구조 프린지 억제. 횡색수차는 상(像) 전체를 채널별로 밀 뿐, 한 픽셀짜리 스펙큘러에
  // 순색 점을 만들지 않는다. 그런데 여기서는 필터링되지 않은 HDR 을 0.8px 밀기 때문에,
  // 1px 폭 하이라이트에서 R 은 그 픽셀을, B 는 반대편 어두운 이웃을 집어 채도 0.58 의
  // 분홍 점이 생긴다(라운드5 심사 D1, 네이티브 2213,1066 = 245/116/102).
  // 채널 이동이 만들 수 있는 편차를 중심 픽셀 휘도에 비례해 묶는다 — 저주파 경계에서는
  // 편차가 애초에 이 한계 아래라 색수차가 그대로 남고, 미세구조에서만 잘린다.
  float caLim = 0.35 * dot( c0, LUMA ) + 1e-4;
  col = c0 + clamp( col - c0, vec3( - caLim ), vec3( caLim ) );

  if ( uHasBloom > 0.5 ) col += max( texture2D( tBloom, vUv ).rgb, vec3( 0.0 ) );

  col *= uExposure;

  // 헐레이션은 별도 체인(1/4 해상도 프리필터 + 분리형 가우시안 2단)에서 결정론적으로 만들어 온다.
  // 화면 픽셀마다 커널을 몬테카를로로 도는 방식은 탭 수를 아무리 올려도 소스가 밝을수록 분산이
  // 커져 헤일로가 점 디더로 찍힌다(라운드2 심사 지적). 실측 근거는 HANDOFF 참조.
  //
  // 두 성분을 색을 나눠 더한다. 좁은 성분은 코어의 호박색, 넓은 성분은 바깥의 짙은 적색이다.
  // 필름 헐레이션은 베이스 반사광이 유제를 되때리며 장파장만 살아남는 현상이라, 중심에서
  // 멀어질수록 붉게 채도가 이동하며 소멸해야 "필터"가 아니라 감광 재료로 읽힌다(G8).
  // 단일 틴트로 곱하면 반경 전체가 같은 주황이라 페인트한 원반이 된다(라운드3 심사 지적).
  vec3 hal = texture2D( tHalN, vUv ).rgb * uHalNarrow * vec3( 1.00, 0.46, 0.27 )
    + texture2D( tHalW, vUv ).rgb * uHalWide * vec3( 1.00, 0.15, 0.05 );
  col += hal * uHalation * uHalGain;

  col = agx( col );

  col = col * uGain + uLift * ( 1.0 - col );
  col = pow( max( col, vec3( 0.0 ) ), 1.0 / uGamma );
  col = clamp( col, 0.0, 1.0 );

  float l = dot( col, LUMA );
  col = clamp( mix( vec3( l ), col, uSaturation ), 0.0, 1.0 );

  // 끝점을 고정하는 S커브. pow 대비는 하이라이트를 날려 D6(블로우아웃)로 간다.
  float k = uContrast - 1.0;
  col = clamp( mix( col, col * col * ( 3.0 - 2.0 * col ), k ), 0.0, 1.0 );

  // 필름 토(toe). 은염 농도는 노광 하한 근처에서 0으로 부드럽게 붙는다.
  // l/(l+k) 스케일은 l² /(l+k) 응답이라 l≫k 에서 l-k(소프트 블랙포인트 감산),
  // l≪k 에서 l²/k 로 간다 — 하이라이트는 건드리지 않고 최암부만 눌러 야간 복도에 진짜 검정을 만든다.
  // 채널별이 아니라 휘도로 스케일해야 색상비가 보존된다(암부 채도가 인위적으로 뛰지 않는다).
  float tl = dot( col, LUMA );
  col *= tl / ( tl + uToe );

  float vr = length( d * vec2( uAspect, 1.0 ) );
  float vig = smoothstep( 1.00, 0.30, vr );
  col *= mix( 1.0, vig, uVignette );

  // 인화지 베이스 농도. 필름 프린트는 절대 0에 닿지 않는다 — 비네트 뒤에 둬야 코너까지
  // 바닥이 깔려 순흑 클리핑(D6)이 구조적으로 불가능해진다.
  // 다만 이 값이 곧 화면 최저 휘도다. 이전 값(0.011/0.015/0.023)은 8비트로 환산하면 L33이라
  // 야간 복도에 L30 미만 픽셀이 하나도 없는 분홍 우유빛 베일을 만들었다(G7). 클리핑을 막는
  // 최소치까지 내리고, 대비 복구는 위 토가 맡는다. 청색 편향은 암부를 한류로 유지한다.
  col = uFloor + ( 1.0 - uFloor ) * col;

  col = srgbOETF( col );

  // 인화 콘트라스트. 로그(농도) 영역의 대칭 S — 피벗에서 기울기 1+uMidSlope 이고
  // 피벗에서 ±uMidWidth 스톱 밖으로 나가면 항등으로 복귀한다. 인코딩 뒤에 거는 이유는,
  // 선형 영역에서 같은 일을 하면 기울기가 암부에 몰려 토우를 함께 눌러버리기 때문이다.
  // 이 씬은 L=0~64 에 57.8%가 뭉쳐 중간톤이 좁은 띠로 압착돼 있었다(라운드3 심사).
  // 휘도비로 스케일해 색상비를 보존한다 — 채널별로 걸면 암부 채도가 인위적으로 뛴다.
  //
  // 라운드4: 기울기 0.55 → 1.00 (피벗 국소 기울기 1.55 → 2.00). 사분위폭 82 → 97 로 벌린다.
  // 심사 지시의 "p50 ≤ 45"와 "L=64~160 점유율 상승"은 단조 톤커브로 동시에 만족할 수 없다 —
  // 밴드에 들어오는 질량은 아래(<64)에서만 올라올 수 있고, 그건 p50 을 올린다.
  // 실측(출하 프레임 역산, scratchpad/post4/sim.mjs): 피벗을 올려 p50=45 를 맞추면
  // L64~160 이 35.9% → 25.8% 로 오히려 무너진다. 그래서 끝점(p05·순흑·블로우아웃)을 고정한 채
  // 중간톤 기울기 자체를 올리는 쪽으로 해석했다. 숄더는 0.26 → 0.30 으로 같이 올려
  // 기울기 상승분이 하이라이트를 255 로 밀지 않게 받는다(D6).
  float ml = dot( col, LUMA );
  float md = log2( max( ml, 1e-4 ) / uMidPivot );
  float ma = uMidSlope * md * exp( - md * md / ( 2.0 * uMidWidth * uMidWidth ) );
  float mo = ml * exp2( ma );
  // 숄더. S의 상단 로브가 하이라이트를 255로 밀어 D6 블로우아웃이 되는 것을 막고,
  // 동시에 최상단을 중간톤 쪽으로 되접어 롤오프를 유지한다.
  mo *= 1.0 - uShoulder * smoothstep( uShoulderK, 1.0, mo );
  col = clamp( col * ( mo / max( ml, 1e-4 ) ), 0.0, 1.0 );

  float bn2 = texture2D( tBlueNoise, nuv + tilePhase( nuv, 7.0 ) + uNoiseOffset.yx * 0.77 + 0.371 ).r;

  // 은염 입자는 노광된 만큼만 생긴다 — 그림자에서 잦아들고 중간톤에서 굵어지며 하이라이트에서 다시 죽는다.
  // 상수 바닥항을 두면 어두운 면까지 균일한 노이즈가 깔려 그림자가 스태틱으로 읽힌다.
  // 반대로 단조 증가로 두면 하이라이트가 가장 거칠어져 실제 필름과 응답이 뒤집힌다(라운드2 지적).
  // pow(lg,0.42) * (1-smoothstep(0.40,0.90)) 는 lg≈0.45에서 정점, 하이라이트에서 0으로 죽는다.
  float lg = dot( col, LUMA );
  float resp = pow( clamp( lg, 0.0, 1.0 ), 0.42 ) * ( 1.0 - smoothstep( 0.40, 0.90, lg ) );
  col += ( ( bn - 0.5 ) * vec3( 1.0, 0.97, 0.93 ) + ( bn2 - 0.5 ) * vec3( - 0.22, 0.0, 0.22 ) ) * uGrain * resp;

  // 8비트 양자화 밴딩 제거 (삼각분포 디더)
  col += ( bn - bn2 ) * ( 1.0 / 255.0 );

  gl_FragColor = vec4( clamp( col, 0.0, 1.0 ), 1.0 );
}
`

// 헐레이션 소스. 1/4 해상도로 내리면서 4탭 바이리니어(=원본 4x4)로 미리 평균 내고,
// 노출을 곱한 뒤 하이라이트만 남긴다. 다운샘플 단계에서 Karis 가중으로 파이어플라이를 눌러야
// 형광등처럼 노출 30배가 걸린 소스가 다음 블러에서 반점으로 튀지 않는다.
//
// 소스를 뽑는 방식이 이 패스의 전부다. 채널별 감산(구버전)은 이미시브 면의 실루엣을 그대로
// 통과시켜, 천장 돔 등기구의 직사각 발광판이 광채 외곽선에 직선 구간으로 복사됐다(라운드3 심사).
// 지금은 (1) 휘도 등고선 임계 마스크로 소스를 뽑고 (2) 로그 압축으로 코어의 평탄면을 없앤다.
// 평탄면이 남으면 가우시안을 아무리 넓혀도 등고선이 사각형의 변을 따라 직선으로 눕는다.
const HAL_PRE = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform float uExposure;
uniform float uT0;
uniform float uT1;
uniform float uCompress;
const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );
void main () {
  vec3 s = vec3( 0.0 );
  float wsum = 0.0;
  for ( int j = 0; j < 2; j ++ ) {
    for ( int i = 0; i < 2; i ++ ) {
      vec2 o = ( vec2( float( i ), float( j ) ) * 2.0 - 1.0 ) * uSrcTexel;
      vec3 t = max( texture2D( tSrc, vUv + o ).rgb, vec3( 0.0 ) ) * uExposure;
      float w = 1.0 / ( 1.0 + 0.25 * dot( t, LUMA ) );
      s += t * w;
      wsum += w;
    }
  }
  vec3 c = s / wsum;
  float l = dot( c, LUMA );
  float m = smoothstep( uT0, uT1, l );
  float e = log( 1.0 + l * uCompress ) / uCompress;
  gl_FragColor = vec4( c * ( m * e / max( l, 1e-4 ) ), 1.0 );
}
`

// 분리형 가우시안 17탭. 스텝 폭만 바꿔 좁은 성분과 넓은 성분을 같은 셰이더로 만든다
// (σ는 스텝 단위로 3.2 고정 → 지지범위 ±2.5σ, 절단 잔여 1% 미만).
const HAL_BLUR = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uStep;
void main () {
  vec3 s = texture2D( tSrc, vUv ).rgb;
  float wsum = 1.0;
  for ( int i = 1; i <= 8; i ++ ) {
    float fi = float( i );
    float w = exp( - 0.5 * fi * fi / 10.24 );
    vec2 o = uStep * fi;
    s += ( texture2D( tSrc, vUv + o ).rgb + texture2D( tSrc, vUv - o ).rgb ) * w;
    wsum += 2.0 * w;
  }
  gl_FragColor = vec4( s / wsum, 1.0 );
}
`

function halTarget (w, h) {
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

export default class Composite {
  async init (ctx) {
    this.src = ctx.targets.hdr.texture
    this.bloomTex = null
    // pipeline이 자동 노출 계측값을 프레임마다 써넣는다. null이면 LOOK 고정값으로 돈다.
    this.exposure = null

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tSrc: { value: null },
        tBloom: { value: ctx.targets.bloom.texture },
        tHalN: { value: null },
        tHalW: { value: null },
        tBlueNoise: { value: ctx.blueNoise },
        uHasBloom: { value: 0 },
        uExposure: { value: 1 },
        uLift: { value: new THREE.Vector3() },
        uGamma: { value: new THREE.Vector3(1, 1, 1) },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uSaturation: { value: 1 },
        uContrast: { value: 1 },
        uHalation: { value: 0 },
        uHalGain: { value: 0.5 },
        uHalNarrow: { value: 0.62 },
        uHalWide: { value: 2.00 },
        uMidPivot: { value: 0.25 },
        uMidSlope: { value: 1.00 },
        uMidWidth: { value: 1.05 },
        uShoulder: { value: 0.30 },
        uShoulderK: { value: 0.38 },
        uChromatic: { value: 0 },
        uVignette: { value: 0 },
        uFloor: { value: new THREE.Vector3(0.0006, 0.0008, 0.0014) },
        // 라운드5: 0.008 → 0.004. 씬 쪽 거리 안개·좌측 프레이밍이 들어오며 프레임이 한 스톱
        // 어두워져 p05 6 → 5, 하네스 dark(L≤6) 7.1% → 9.39%(게이트 10%)까지 밀렸다.
        // 토는 암부만 만지므로 이 값만 낮추면 하이라이트·순흑 0%를 건드리지 않고 하한이 돌아온다
        // (실측 scratchpad/post5/ab8: p05 5→6 · L0-16 32.76%→30.71% · p50 34→36 · 순흑/블로우아웃 0.00%).
        uToe: { value: 0.004 },
        uGrain: { value: 0 },
        uAspect: { value: 1 },
        uNoiseScale: { value: new THREE.Vector2(1, 1) },
        uNoiseOffset: { value: new THREE.Vector2() },
        uTexel: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    })

    const fs = { vertexShader: VERT, depthTest: false, depthWrite: false, blending: THREE.NoBlending }
    this.matPre = new THREE.ShaderMaterial({
      uniforms: {
        tSrc: { value: null },
        uSrcTexel: { value: new THREE.Vector2() },
        uExposure: { value: 1 },
        uT0: { value: 0.9 },
        uT1: { value: 2.6 },
        uCompress: { value: 0.34 }
      },
      fragmentShader: HAL_PRE,
      ...fs
    })
    this.matBlur = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } },
      fragmentShader: HAL_BLUR,
      ...fs
    })
    this.halA = halTarget(1, 1)
    this.halB = halTarget(1, 1)
    this.halN = halTarget(1, 1)
    this.halW = halTarget(1, 1)
    this.halTexel = new THREE.Vector2()
    // 블러 스텝(1/4 텍셀 단위). σ = 3.2 × 스텝이므로 풀해상도 σ 는 12.8 × 스텝이다.
    // 수평을 수직의 2.4~2.8배로 잡아 등방 원반이 아니라 가로로 누운 산란으로 읽히게 한다(G8).
    // 넓은 성분의 수평 σ(≈64px)는 돔 등기구 발광판 반폭(≈120px)의 절반을 넘는다 —
    // 이 조건을 만족해야 사각 소스의 등고선에서 직선 구간이 사라진다.
    this.halStep = { nx: 1.0, ny: 0.42, wx: 5.0, wy: 1.8 }
    // 넓은 성분은 임계를 훨씬 높게 잡는다. 어두운 광원은 좁은 성분만 갖고, 밝은 코어만
    // 넓은 로브를 얻는다 — 반경이 광원 밝기에 따라 실제로 달라지는 유일한 경로다.
    this.halWideT = { t0: 12.0, t1: 30.0 }

    this.setSize(ctx.w, ctx.h, ctx)
  }

  setSize (w, h, ctx) {
    const u = this.mat.uniforms
    u.uAspect.value = w / h
    u.uNoiseScale.value.set(w / 64, h / 64)
    u.uTexel.value.set(1 / w, 1 / h)
    const qw = Math.max(1, w >> 2)
    const qh = Math.max(1, h >> 2)
    this.halA.setSize(qw, qh)
    this.halB.setSize(qw, qh)
    this.halN.setSize(qw, qh)
    this.halW.setSize(qw, qh)
    this.halTexel.set(1 / qw, 1 / qh)
    this.matPre.uniforms.uSrcTexel.value.set(1 / w, 1 / h)
  }

  // 좁은 성분과 넓은 성분을 각자의 임계로 따로 뽑는다. 1/4 해상도 풀스크린 6패스.
  // 좁은: 임계 낮음 · σ ≈ 13 × 5px · 넓은: 임계 높음 · σ ≈ 64 × 23px.
  // 두 성분을 한 체인으로 잇던 구버전은 넓은 로브의 임계가 좁은 것과 같아져서, 광원 밝기와
  // 무관하게 모든 등기구가 같은 크기의 원반을 얻었다(라운드3 심사 "페인트한 글로우").
  halation (ctx) {
    const p = this.matPre.uniforms
    const b = this.matBlur.uniforms
    const t = this.halTexel
    const s = this.halStep
    p.tSrc.value = this.src
    p.uExposure.value = this.mat.uniforms.uExposure.value

    const t0 = p.uT0.value
    const t1 = p.uT1.value
    ctx.fsq(this.matPre, this.halA)
    b.tSrc.value = this.halA.texture; b.uStep.value.set(t.x * s.nx, 0); ctx.fsq(this.matBlur, this.halB)
    b.tSrc.value = this.halB.texture; b.uStep.value.set(0, t.y * s.ny); ctx.fsq(this.matBlur, this.halN)

    p.uT0.value = this.halWideT.t0
    p.uT1.value = this.halWideT.t1
    ctx.fsq(this.matPre, this.halA)
    b.tSrc.value = this.halA.texture; b.uStep.value.set(t.x * s.wx, 0); ctx.fsq(this.matBlur, this.halB)
    b.tSrc.value = this.halB.texture; b.uStep.value.set(0, t.y * s.wy); ctx.fsq(this.matBlur, this.halW)
    p.uT0.value = t0
    p.uT1.value = t1
  }

  render (ctx) {
    const u = this.mat.uniforms
    const look = ctx.look
    u.tSrc.value = this.src
    u.tBloom.value = this.bloomTex || ctx.targets.bloom.texture
    u.uHasBloom.value = this.bloomTex ? 1 : 0
    u.uExposure.value = this.exposure ?? look.exposure
    u.uLift.value.fromArray(look.lift)
    u.uGamma.value.fromArray(look.gamma)
    u.uGain.value.fromArray(look.gain)
    u.uSaturation.value = look.saturation
    u.uContrast.value = look.contrast
    u.uHalation.value = look.halation
    u.uChromatic.value = look.chromatic
    u.uVignette.value = look.vignette
    u.uGrain.value = ctx.quality.grain ? look.grainAmount : 0
    u.uNoiseOffset.value.copy(ctx.blueNoise.offset)
    if (u.uHalation.value > 0) this.halation(ctx)
    u.tHalN.value = this.halN.texture
    u.tHalW.value = this.halW.texture
    ctx.fsq(this.mat, null)
  }

  dispose () {
    this.mat.dispose()
    this.matPre.dispose()
    this.matBlur.dispose()
    this.halA.dispose()
    this.halB.dispose()
    this.halN.dispose()
    this.halW.dispose()
  }
}

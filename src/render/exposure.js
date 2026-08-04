// 자동 노출 — 톤매퍼 앞에 붙는 휘도 계측기.
// 씬 HDR을 64x64 로그휘도 타일로 축소해 CPU로 읽고, 히스토그램에서 상위 2%·하위 40%를
// 잘라낸 뒤 log-average로 EV를 뽑는다. 프레임 전체가 레인지 하위에 갇히는 사고(루브릭 D6)를
// 물리적으로 불가능하게 만드는 것이 목적이다.
//
// 노출은 두 앵커의 큰 쪽으로 잡는다.
//   e0 = key / logAvg      일반 장면의 중간톤 배치
//   e1 = hi  / p99         평탄·저광량 장면의 하이라이트 바닥값 (p99.9 >= 150 게이트를 보증)
// 정지 카메라의 QA 샷은 샷 전환 시 스냅해서 샷 간 이월을 0으로 만든다.

import * as THREE from 'three'

const TILE = 64
const BINS = 96
const MIN_LOG = -14
const MAX_LOG = 10
const RANGE = MAX_LOG - MIN_LOG

const VERT = /* glsl */`
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

// 4x4 박스 평균 후 log2 휘도를 [MIN_LOG, MAX_LOG] → [0,1]로 부호화한다.
// 8비트 96빈이면 스톱당 4빈이라 노출 결정에 충분하다.
const FRAG = /* glsl */`
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
  float e = clamp( ( log2( max( l, 1e-6 ) ) - ( ${MIN_LOG}.0 ) ) / ${RANGE}.0, 0.0, 1.0 );
  gl_FragColor = vec4( e, e, e, 1.0 );
}
`

export default class AutoExposure {
  init (ctx) {
    this.target = new THREE.WebGLRenderTarget(TILE, TILE, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false
    })
    this.target.texture.colorSpace = THREE.NoColorSpace

    this.mat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    })

    this.pixels = new Uint8Array(TILE * TILE * 4)
    this.hist = new Int32Array(BINS)

    this.key = 0.155        // log-average를 놓을 노출 기준점
    this.hiAnchor = 0.62    // p99 휘도를 놓을 선형값 — AgX 통과 후 sRGB 0.8 부근
    this.min = 0.015
    this.max = 600
    this.rate = 14          // 초당 적응 속도 (log2 도메인)
    this.bias = 1

    this.value = 1
    this.target_ = 1
    this.snap = true
    this.stats = { avg: 0, p99: 0, ev: 0 }
  }

  // 샷 전환 시 호출. 다음 계측을 즉시 반영해 샷 간 노출 이월을 없앤다.
  reset () { this.snap = true }

  measure (ctx, srcTexture, dt) {
    if (!srcTexture) return this.value
    const r = ctx.renderer
    this.mat.uniforms.tSrc.value = srcTexture
    this.mat.uniforms.uTexel.value.set(1 / Math.max(1, ctx.w), 1 / Math.max(1, ctx.h))
    ctx.fsq(this.mat, this.target)
    r.readRenderTargetPixels(this.target, 0, 0, TILE, TILE, this.pixels)

    const hist = this.hist
    hist.fill(0)
    const px = this.pixels
    const n = TILE * TILE
    for (let i = 0; i < n; i++) {
      let b = (px[i * 4] * BINS / 256) | 0
      if (b >= BINS) b = BINS - 1
      hist[b]++
    }

    // 상위 2%·하위 40% 절단. 남은 구간의 log-average가 노출 기준이 된다.
    const lo = Math.floor(n * 0.40)
    const hi = Math.ceil(n * 0.98)
    let seen = 0
    let sum = 0
    let weight = 0
    let p99 = MIN_LOG
    const p99Rank = Math.ceil(n * 0.99)
    for (let b = 0; b < BINS; b++) {
      const c = hist[b]
      if (!c) continue
      const logL = MIN_LOG + (b + 0.5) * RANGE / BINS
      if (seen < p99Rank && seen + c >= p99Rank) p99 = logL
      const a = Math.max(seen, lo)
      const z = Math.min(seen + c, hi)
      if (z > a) { sum += logL * (z - a); weight += (z - a) }
      seen += c
    }
    if (weight <= 0) { sum = MIN_LOG; weight = 1 }

    const avgLog = sum / weight
    const avg = Math.pow(2, avgLog)
    const p99L = Math.pow(2, p99)
    this.stats.avg = avg
    this.stats.p99 = p99L
    this.stats.ev = avgLog

    const e0 = this.key / Math.max(avg, 1e-7)
    const e1 = this.hiAnchor / Math.max(p99L, 1e-7)
    let want = Math.max(e0, e1) * this.bias
    want = Math.min(Math.max(want, this.min), this.max)
    this.target_ = want

    if (this.snap) {
      this.value = want
      this.snap = false
    } else {
      // log 도메인 보간이라 밝기 2배 변화가 어느 절대값에서든 같은 시간에 수렴한다
      const k = 1 - Math.exp(-Math.max(dt, 1 / 240) * this.rate)
      const cur = Math.log2(this.value)
      this.value = Math.pow(2, cur + (Math.log2(want) - cur) * k)
    }
    return this.value
  }

  dispose () {
    this.target.dispose()
    this.mat.dispose()
  }
}

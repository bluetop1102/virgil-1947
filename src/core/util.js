// 결정론 유틸. QA 루프가 프레임 단위로 재현 가능해야 하므로 Math.random/Date.now를 전면 대체한다.

export function rng (seed = 1) {
  let s = seed >>> 0 || 1
  return function next () {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

export function rngRange (r, a, b) { return a + (b - a) * r() }
export function rngPick (r, arr) { return arr[Math.floor(r() * arr.length) % arr.length] }

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (t) => t * t * (3 - 2 * t)
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt))

// 켈빈 → 선형 RGB. 광원별 색온도 분리는 루브릭 G1의 핵심 판정 항목이다.
export function kelvin (k) {
  const t = k / 100
  let r, g, b
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12 } else {
    r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755)
  }
  if (t >= 66) b = 255
  else if (t <= 19) b = 0
  else b = 138.52 * Math.log(t - 10) - 305.04
  const f = (x) => { const v = clamp(x, 0, 255) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return [f(r), f(g), f(b)]
}

// 시드 기반 밸류 노이즈. 텍스처 생성기와 배치 변주가 공유한다.
export function noise2D (seed = 1) {
  const perm = new Uint8Array(512)
  const r = rng(seed)
  for (let i = 0; i < 256; i++) perm[i] = i
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y)
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  return function (x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255
    x -= Math.floor(x); y -= Math.floor(y)
    const u = fade(x), v = fade(y)
    const a = perm[X] + Y, b = perm[X + 1] + Y
    return lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 0.7
  }
}

export function fbm (n, x, y, oct = 5, lac = 2.0, gain = 0.5) {
  let a = 0.5, f = 1, s = 0, norm = 0
  for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); norm += a; a *= gain; f *= lac }
  return s / norm
}

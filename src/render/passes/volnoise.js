// 타일러블 3D 밸류 노이즈. volumetric 이 500줄을 넘겨 같은 소유 디렉터리로 분할했다.
// 외부 에셋 금지 규약에 따라 시드 고정 rng 로 생성한다.
import * as THREE from 'three'
import { rng } from '../../core/util.js'

export function noiseTexture (size, seed) {
  const r = rng(seed)
  const oct = [4, 8, 16].map(L => {
    const a = new Float32Array(L * L * L)
    for (let i = 0; i < a.length; i++) a[i] = r()
    return { L, a }
  })
  const fade = t => t * t * (3 - 2 * t)
  const at = (o, x, y, z) => {
    const L = o.L
    const w = (i, j, k) => o.a[(((k % L) + L) % L) * L * L + (((j % L) + L) % L) * L + (((i % L) + L) % L)]
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi)
    const lp = (p, q, t) => p + (q - p) * t
    const c00 = lp(w(xi, yi, zi), w(xi + 1, yi, zi), xf)
    const c10 = lp(w(xi, yi + 1, zi), w(xi + 1, yi + 1, zi), xf)
    const c01 = lp(w(xi, yi, zi + 1), w(xi + 1, yi, zi + 1), xf)
    const c11 = lp(w(xi, yi + 1, zi + 1), w(xi + 1, yi + 1, zi + 1), xf)
    return lp(lp(c00, c10, yf), lp(c01, c11, yf), zf)
  }
  const data = new Uint8Array(size * size * size)
  const wt = [0.55, 0.31, 0.14]
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0
        for (let o = 0; o < 3; o++) {
          const s = oct[o].L / size
          v += wt[o] * at(oct[o], x * s, y * s, z * s)
        }
        data[z * size * size + y * size + x] = Math.max(0, Math.min(255, Math.round(v * 255)))
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, size, size, size)
  tex.format = THREE.RedFormat
  tex.type = THREE.UnsignedByteType
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping
  tex.unpackAlignment = 1
  tex.needsUpdate = true
  return tex
}

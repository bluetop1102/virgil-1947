// 블루노이즈 64x64 + Halton 시퀀스. 외부 에셋 금지 규약 때문에 부팅 시 절차 생성한다.
// void-and-cluster(Ulichney 1993)를 가우시안 커널 근사로 구현했다. 디더링·그레인·TAA 지터가 공유한다.

import * as THREE from 'three'
import { rng } from '../core/util.js'

export function halton (index, base) {
  let f = 1, r = 0, i = index
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base) }
  return r
}

// 랭크 배열(0..n*n-1)을 만든다. 값이 낮을수록 먼저 배치된 점 = 어두운 픽셀.
function voidAndCluster (n, seed) {
  const size = n * n
  const energy = new Float32Array(size)
  const binary = new Uint8Array(size)
  const rank = new Int32Array(size).fill(-1)

  const sigma = 1.9
  const R = 6
  const kx = [], ky = [], kw = []
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      kx.push(dx); ky.push(dy); kw.push(Math.exp(-d2 / (2 * sigma * sigma)))
    }
  }
  const kn = kw.length

  const splat = (i, s) => {
    const x = i % n
    const y = (i / n) | 0
    for (let k = 0; k < kn; k++) {
      const xx = (x + kx[k] + n) % n
      const yy = (y + ky[k] + n) % n
      energy[yy * n + xx] += s * kw[k]
    }
  }

  // want=1이면 점 집합에서 가장 조밀한 곳, want=0이면 가장 빈 곳
  const extreme = (want, hi) => {
    let best = -1
    let bv = hi ? -Infinity : Infinity
    for (let i = 0; i < size; i++) {
      if (binary[i] !== want) continue
      const e = energy[i]
      if (hi ? e > bv : e < bv) { bv = e; best = i }
    }
    return best
  }

  const r = rng(seed)
  const initial = Math.max(8, Math.round(size / 10))
  let placed = 0
  while (placed < initial) {
    const i = Math.floor(r() * size) % size
    if (binary[i]) continue
    binary[i] = 1; splat(i, 1); placed++
  }

  // Phase 0 — 초기 패턴을 균질화한다
  for (let guard = 0; guard < size * 2; guard++) {
    const t = extreme(1, true)
    binary[t] = 0; splat(t, -1)
    const v = extreme(0, false)
    if (v === t) { binary[t] = 1; splat(t, 1); break }
    binary[v] = 1; splat(v, 1)
  }

  const proto = binary.slice()

  // Phase 1 — 초기 점들을 역순으로 뽑아 랭크 0..initial-1
  let c = initial
  while (c > 0) {
    const t = extreme(1, true)
    binary[t] = 0; splat(t, -1)
    c--
    rank[t] = c
  }

  // Phase 2 — 절반까지 빈 곳을 채우며 랭크 부여
  binary.set(proto)
  energy.fill(0)
  for (let i = 0; i < size; i++) if (binary[i]) splat(i, 1)
  for (let i = initial; i < size / 2; i++) {
    const v = extreme(0, false)
    binary[v] = 1; splat(v, 1)
    rank[v] = i
  }

  // Phase 3 — 여집합을 점 집합으로 뒤집어 나머지 절반에 랭크 부여
  energy.fill(0)
  for (let i = 0; i < size; i++) if (!binary[i]) splat(i, 1)
  for (let i = size / 2; i < size; i++) {
    const t = extreme(0, true)
    binary[t] = 1; splat(t, -1)
    rank[t] = i
  }

  return rank
}

export function blueNoiseTexture (n = 64, seed = 0x5EC17) {
  const rank = voidAndCluster(n, seed)
  const data = new Uint8Array(n * n)
  const size = n * n
  for (let i = 0; i < size; i++) data[i] = Math.min(255, Math.floor((rank[i] + 0.5) / size * 256))

  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

// R2 저불일치 수열. 프레임마다 노이즈를 밀어 시간축 상관을 끊는다.
const R2X = 0.7548776662466927
const R2Y = 0.5698402909980532

export function goldenOffset (frame, out) {
  out.set((frame * R2X) % 1, (frame * R2Y) % 1)
  return out
}

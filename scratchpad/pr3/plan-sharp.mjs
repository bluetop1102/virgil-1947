// 심사자 [POST/G8] "샤프닝 링잉" 원인 귀속. 내 소유(dof)에는 언샤프 항이 없다 —
// GATHER 의 가중치는 clamp(...,0,1) 로 음수 로브가 없어 링잉을 만들 수 없다.
// taa.js 의 uSharpen(언샤프 마스크)이 유일한 후보이므로 그것만 갈라 본다.
export default {
  cases: [
    { tag: 'S0-ship', apply: 'S.settle(140); S.fixExposure(P.composite.exposure); S.info = { ev: +P.composite.exposure.toFixed(3), sharpen: P.taa && P.taa.mat ? P.taa.mat.uniforms.uSharpen.value : (P.taa ? Object.keys(P.taa) : null) }' },
    { tag: 'S1-sharp0', apply: 'P.taa.mat.uniforms.uSharpen.value = 0; S.settle(60)' },
    { tag: 'S2-restore', apply: 'P.taa.mat.uniforms.uSharpen.value = S.info.sharpen; S.settle(60)', png: false }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['S0-ship'].w, H = B['S0-ship'].h, n = W * H
    const lum = t => { const b = B[t].buf, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    // 어두운 얇은 지오메트리 양쪽의 오버슛: 5px 창의 국소 최대 - 창 밖 배경 중간값
    const overshoot = (L, r) => {
      let s = 0, c = 0, mx = 0
      for (let y = r[1]; y < r[3]; y++) {
        for (let x = r[0] + 4; x < r[2] - 4; x++) {
          const i = y * W + x
          const lo = Math.min(L[i - 1], L[i], L[i + 1])
          const hi = Math.max(L[i - 4], L[i + 4])
          if (L[i] > lo + 6 && L[i] > hi + 4) { const v = L[i] - hi; s += v; c++; if (v > mx) mx = v }
        }
      }
      return { count: c, meanOver: +(s / Math.max(c, 1)).toFixed(2), maxOver: +mx.toFixed(1) }
    }
    const BOX = { cartTube: [1540, 1060, 1690, 1210], cartWide: [1500, 950, 1950, 1400], wainscot: [640, 750, 1040, 1150] }
    const out = { info: S.info, over: {}, diff: {} }
    const a = lum('S0-ship'), b = lum('S1-sharp0')
    for (const t of ['S0-ship', 'S1-sharp0']) { const L = lum(t); out.over[t] = {}; for (const k in BOX) out.over[t][k] = overshoot(L, BOX[k]) }
    for (const k in BOX) {
      const r = BOX[k]; let s = 0, c = 0, mx = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const i = y * W + x, d = Math.abs(a[i] - b[i]); s += d; c++; if (d > mx) mx = d }
      out.diff[k] = { meanAbs: +(s / c).toFixed(2), max: +mx.toFixed(1) }
    }
    return out
  }
}

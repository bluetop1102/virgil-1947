// 헐레이션 게인 시각 스윕. 블랙포인트는 후보값(40%)으로 고정한 상태에서 고른다.
const G = v => `P.composite.mat.uniforms.uHalGain.value = ${v}`
export default {
  cases: [
    { tag: 'C0-gain2.4', apply: 'S.settle(90); S.fixExposure(P.composite.exposure); P.composite.mat.uniforms.uFloor.value.set(0.0006, 0.0008, 0.0014); S.hal = P.ctx.look.halation; S.info = { ev: P.composite.exposure }' },
    { tag: 'C1-gain0.5', apply: G(0.5) },
    { tag: 'C2-gain0.8', apply: G(0.8) },
    { tag: 'C3-gain1.2', apply: G(1.2) },
    { tag: 'C4-gain1.7', apply: G(1.7) },
    { tag: 'C5-halOff', apply: 'P.ctx.look.halation = 0' }
  ],
  analyze: (S) => {
    const BOX = {
      haloTop: [1160, 150, 1400, 250],
      haloLeft: [1090, 230, 1200, 310],
      ceilCore: [1210, 246, 1436, 284],
      sconceHalo: [1700, 330, 1980, 470],
      nearWallL: [100, 780, 700, 1250],
      farEnd: [1150, 650, 1500, 900],
      flatCeil: [1600, 60, 2100, 160],
      darkCorner: [40, 40, 400, 220]
    }
    const B = S.bufs
    const W = B['C0-gain2.4'].w, H = B['C0-gain2.4'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) }
    }
    const hf = (L, r) => {
      let s = 0, n = 0
      for (let y = r[1] + 1; y < r[3] - 1; y++) for (let x = r[0] + 1; x < r[2] - 1; x++) {
        const i = y * W + x
        const v = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]
        s += v * v; n++
      }
      return +Math.sqrt(s / n).toFixed(2)
    }
    const out = { info: S.info, box: {}, hf: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.box[t] = {}; out.hf[t] = {}
      for (const k in BOX) { out.box[t][k] = stat(L, BOX[k]); out.hf[t][k] = hf(L, BOX[k]) }
    }
    return out
  }
}

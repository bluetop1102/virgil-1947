// R3 광축 셸 재판단 (ATMOSPHERE → POST 항목). r2 에서 shaftScale=0 으로 내린 근거는
// SHAFT_GAIN 0.30 · 하드 삼각형 시절의 셸을 잰 것이다. 지금은 GAIN 0.055 + fbm + VSM 이라
// 같은 결론이 유지되는지 다시 잰다. 노출 고정이라 프레임 평균 상승분이 그대로 보인다.
const M = "S.moods['corridor-night']"
export default {
  cases: [
    {
      tag: 'C0-shaft0',
      apply: `
        S.dustHide(true); S.settle(120); S.fixExposure(P.composite.exposure);
        S.info = { ev: +P.composite.exposure.toFixed(3), shaftScale: ${M}.shaftScale }`
    },
    { tag: 'C1-shaft04', apply: `${M}.shaftScale = 0.4; S.settle(60)` },
    { tag: 'C2-shaft08', apply: `${M}.shaftScale = 0.8; S.settle(60)` },
    { tag: 'C3-shaft16', apply: `${M}.shaftScale = 1.6; S.settle(60)` },
    {
      tag: 'C4-shaft08-free',
      apply: `${M}.shaftScale = 0.8; S.freeExposure(); S.settle(150); S.info.evShaft08 = +P.composite.exposure.toFixed(3)`,
      png: false
    },
    {
      tag: 'C5-shaft0-free',
      apply: `${M}.shaftScale = 0; S.settle(150); S.info.evShaft0 = +P.composite.exposure.toFixed(3)`,
      png: false
    }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['C0-shaft0'].w, H = B['C0-shaft0'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = {
      shaftCore: [1390, 600, 1620, 920],
      ceilBeamR: [1150, 340, 1500, 620],
      ceilBeamL: [330, 320, 700, 620],
      shaftOut: [700, 580, 1000, 950],
      leftNearWall: [90, 140, 700, 760],
      nearWallL: [200, 900, 800, 1400],
      carpet: [900, 1160, 1650, 1400],
      farEnd: [1100, 560, 1580, 880],
      damaskMid: [1660, 430, 1830, 720]
    }
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { m: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) } }
    const grad = (L, r) => { let s = 0, n = 0; for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) { const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]; s += dx * dx + dy * dy; n++ } return +Math.sqrt(s / n).toFixed(2) }
    const out = { info: S.info, box: {}, grad: {}, frame: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t); out.box[t] = {}; out.grad[t] = {}
      for (const k in BOX) { out.box[t][k] = stat(L, BOX[k]); out.grad[t][k] = grad(L, BOX[k]) }
      let s = 0; const hist = new Uint32Array(256)
      for (let i = 0; i < L.length; i++) { s += L[i]; hist[Math.min(255, L[i] | 0)]++ }
      let c = 0, p50 = 0, p99 = 0
      for (let i = 0; i < 256; i++) { c += hist[i]; if (!p50 && c >= L.length * 0.5) p50 = i; if (!p99 && c >= L.length * 0.99) p99 = i }
      out.frame[t] = { mean: +(s / L.length).toFixed(1), p50, p99, darkPct: +((hist.slice(0, 7).reduce((a, b) => a + b, 0) / L.length) * 100).toFixed(2) }
    }
    return out
  }
}

// 새 헐레이션 체인 검증 + 게인/블랙포인트 스윕. 노출은 B0에서 고정한다.
const F = (r, g, b) => `P.composite.mat.uniforms.uFloor.value.set(${r}, ${g}, ${b})`
export default {
  cases: [
    { tag: 'B0-ship', apply: 'S.settle(90); S.fixExposure(P.composite.exposure); S.hal = P.ctx.look.halation; S.info = { ev: P.composite.exposure, gain: P.composite.mat.uniforms.uHalGain.value }' },
    { tag: 'B1-halOff', apply: 'P.ctx.look.halation = 0', png: false },
    { tag: 'B2-gain1.6', apply: 'P.ctx.look.halation = S.hal; P.composite.mat.uniforms.uHalGain.value = 1.6', png: false },
    { tag: 'B3-gain3.4', apply: 'P.composite.mat.uniforms.uHalGain.value = 3.4', png: false },
    { tag: 'B4-floor60', apply: 'P.composite.mat.uniforms.uHalGain.value = 2.4; ' + F(0.0009, 0.0012, 0.0021), png: false },
    { tag: 'B5-floor40', apply: F(0.0006, 0.0008, 0.0014), png: false },
    { tag: 'B6-floor25', apply: F(0.00038, 0.0005, 0.00088), png: false },
    { tag: 'B7-restore', apply: F(0.0015, 0.0020, 0.0035), png: false }
  ],
  analyze: (S) => {
    const BOX = {
      haloTop: [1160, 150, 1400, 250],
      haloLeft: [1090, 230, 1200, 310],
      ceilCore: [1210, 246, 1436, 284],
      sconceHalo: [1700, 330, 1980, 470],
      carpet: [700, 1250, 1600, 1420],
      nearWallL: [100, 780, 700, 1250],
      farEnd: [1150, 650, 1500, 900],
      flatCeil: [1600, 60, 2100, 160],
      darkCorner: [40, 40, 400, 220]
    }
    const B = S.bufs
    const W = B['B0-ship'].w, H = B['B0-ship'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const hf = (L, r) => {
      let s = 0, n = 0
      for (let y = r[1] + 1; y < r[3] - 1; y++) for (let x = r[0] + 1; x < r[2] - 1; x++) {
        const i = y * W + x
        const v = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]
        s += v * v; n++
      }
      return +Math.sqrt(s / n).toFixed(2)
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) }
    }
    const hist = t => {
      const b = B[t].buf, n = W * H, h = new Float64Array(256)
      let dark = 0, white = 0, black = 0
      for (let i = 0; i < n; i++) {
        const v = Math.round(0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2])
        h[Math.max(0, Math.min(255, v))]++
        if (v <= 6) dark++
        if (v >= 250) white++
        if (b[i * 3] === 0 && b[i * 3 + 1] === 0 && b[i * 3 + 2] === 0) black++
      }
      const q = p => { let c = 0; const need = n * p; for (let i = 0; i < 256; i++) { c += h[i]; if (c >= need) return i } return 255 }
      let min = 0; while (h[min] === 0 && min < 255) min++
      return { min, p001: q(0.001), p01: q(0.01), p50: q(0.5), p999: q(0.999), darkPct: +(dark / n * 100).toFixed(3), whitePct: +(white / n * 100).toFixed(3), blackPct: +(black / n * 100).toFixed(4) }
    }
    // 휘도 구간별 고주파 RMS — 그레인 응답 검증(3x3 평균 기준 밴드 분류)
    const bands = [[20, 40], [40, 60], [90, 130], [180, 230], [230, 256]]
    const grainBands = t => {
      const L = lum(t)
      const acc = bands.map(() => ({ s: 0, n: 0 }))
      for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
        const i = y * W + x
        let m = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += L[i + dy * W + dx]
        m /= 9
        const d = L[i] - m
        for (let k = 0; k < bands.length; k++) if (m >= bands[k][0] && m < bands[k][1]) { acc[k].s += d * d; acc[k].n++ }
      }
      const o = {}
      bands.forEach((b, k) => { o[b[0] + '-' + b[1]] = acc[k].n > 500 ? +Math.sqrt(acc[k].s / acc[k].n).toFixed(2) : null })
      return o
    }
    // 헤일로 방사 프로파일 — 램프 위쪽으로 올라가며 단조 감쇠하는지, 이산 계단이 없는지
    const radial = t => { const L = lum(t); const a = []; for (let y = 100; y < 250; y += 5) { let s = 0; for (let x = 1240; x < 1400; x++) s += L[y * W + x]; a.push(+(s / 160).toFixed(1)) } return a }
    const shadowRB = t => {
      const b = B[t].buf, n = W * H
      const L = lum(t)
      const s = Float32Array.from(L).sort()
      const thr = s[Math.floor(n * 0.25)]
      let r = 0, g = 0, bl = 0, c = 0
      for (let i = 0; i < n; i++) if (L[i] <= thr) { r += b[i * 3]; g += b[i * 3 + 1]; bl += b[i * 3 + 2]; c++ }
      return { r: +(r / c).toFixed(1), g: +(g / c).toFixed(1), b: +(bl / c).toFixed(1) }
    }
    const out = { info: S.info, hf: {}, box: {}, hist: {}, grain: {}, radial: {}, shadowRB: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.hf[t] = {}; out.box[t] = {}
      for (const k in BOX) { out.hf[t][k] = hf(L, BOX[k]); out.box[t][k] = stat(L, BOX[k]) }
      out.hist[t] = hist(t)
      out.radial[t] = radial(t)
    }
    out.grain['B0-ship'] = grainBands('B0-ship')
    out.grain['B5-floor40'] = grainBands('B5-floor40')
    for (const t of ['B0-ship', 'B4-floor60', 'B5-floor40', 'B6-floor25']) out.shadowRB[t] = shadowRB(t)
    return out
  }
}

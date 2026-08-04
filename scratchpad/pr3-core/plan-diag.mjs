// 라운드2 심사 지적 4건의 원인 분리. 노출은 1번 케이스에서 고정하고 이후 전 구성이 같은 값을 쓴다.
export default {
  cases: [
    { tag: 'A0-ship', apply: 'S.settle(90); S.fixExposure(P.composite.exposure); S.info = { ev: P.composite.exposure, sharpen: P.taa.mat.uniforms.uSharpen.value }' },
    // composite.render 가 매 프레임 look/quality 에서 다시 읽으므로 유니폼이 아니라 소스를 바꾼다.
    { tag: 'A1-halOff', apply: 'S.hal = P.ctx.look.halation; P.ctx.look.halation = 0', png: false },
    { tag: 'A2-grainOff', apply: 'P.ctx.look.halation = S.hal; P.ctx.quality.grain = false', png: false },
    { tag: 'A2b-halGrainOff', apply: 'P.ctx.look.halation = 0', png: false },
    { tag: 'A2c-restore', apply: 'P.ctx.look.halation = S.hal; P.ctx.quality.grain = true', png: false },
    { tag: 'A3-sharpOff', apply: 'P.taa.mat.uniforms.uSharpen.value = 0; S.settle(40)', png: false },
    { tag: 'A4-sharpBack', apply: 'P.taa.mat.uniforms.uSharpen.value = 0.32; S.settle(40)', png: false }
  ],
  analyze: (S) => {
    const BOX = {
      haloTop: [1160, 150, 1400, 250],
      haloLeft: [1090, 230, 1200, 310],
      ceilCore: [1210, 246, 1436, 284],
      sconceHalo: [1700, 330, 1980, 470],
      cartTube: [1540, 1060, 1680, 1200],
      carpet: [700, 1250, 1600, 1420],
      nearWallL: [100, 780, 700, 1250],
      farEnd: [1150, 650, 1500, 900],
      flatCeil: [1600, 60, 2100, 160]
    }
    const B = S.bufs
    const W = B['A0-ship'].w, H = B['A0-ship'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    // 라플라시안 RMS = 고주파(점 노이즈) 에너지. 매끄러운 감쇠면 0에 가깝다.
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
      let dark = 0, white = 0
      for (let i = 0; i < n; i++) {
        const v = Math.round(0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2])
        h[Math.max(0, Math.min(255, v))]++
        if (v <= 6) dark++
        if (v >= 250) white++
      }
      const q = p => { let c = 0; const need = n * p; for (let i = 0; i < 256; i++) { c += h[i]; if (c >= need) return i } return 255 }
      let min = 0; while (h[min] === 0 && min < 255) min++
      return { min, p001: q(0.001), p01: q(0.01), p50: q(0.5), p999: q(0.999), darkPct: +(dark / n * 100).toFixed(3), whitePct: +(white / n * 100).toFixed(3) }
    }
    // 카트 튜브 가로 스캔라인 — 샤프닝 링잉은 어두운 튜브 양옆의 대칭 밝은 1px 테두리로 나온다.
    const scan = (t, y, x0, x1) => { const L = lum(t); const a = []; for (let x = x0; x < x1; x++) a.push(Math.round(L[y * W + x])); return a }
    const out = { info: S.info, hf: {}, box: {}, hist: {}, scan: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.hf[t] = {}; out.box[t] = {}
      for (const k in BOX) { out.hf[t][k] = hf(L, BOX[k]); out.box[t][k] = stat(L, BOX[k]) }
      out.hist[t] = hist(t)
      out.scan[t] = scan(t, 1120, 1560, 1640)
    }
    // 하위 25% 휘도 픽셀의 평균 R/B (색분리 확인)
    const shadowRB = t => {
      const b = B[t].buf, n = W * H
      const L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      const s = Float32Array.from(L).sort()
      const thr = s[Math.floor(n * 0.25)]
      let r = 0, g = 0, bl = 0, c = 0
      for (let i = 0; i < n; i++) if (L[i] <= thr) { r += b[i * 3]; g += b[i * 3 + 1]; bl += b[i * 3 + 2]; c++ }
      return { r: +(r / c).toFixed(1), g: +(g / c).toFixed(1), b: +(bl / c).toFixed(1) }
    }
    out.shadowRB = { 'A0-ship': shadowRB('A0-ship') }
    return out
  }
}

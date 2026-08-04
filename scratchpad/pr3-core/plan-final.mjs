// 최종 확인. (1) 새 헐레이션의 ON/OFF 분리, (2) 램프 옆 고스트가 SSR인지, (3) 발광 바에 계조가 있는지.
export default {
  cases: [
    { tag: 'D0-ship', apply: 'S.settle(90); S.fixExposure(P.composite.exposure); S.hal = P.ctx.look.halation; S.ev = P.composite.exposure; S.info = { ev: P.composite.exposure, gain: P.composite.mat.uniforms.uHalGain.value }' },
    { tag: 'D1-halOff', apply: 'P.ctx.look.halation = 0' },
    { tag: 'D2-ssrOff', apply: 'P.ctx.look.halation = S.hal; S.effOff("ssr"); S.settle(30)' },
    { tag: 'D3-ssrBack', apply: 'S.effOn("ssr"); S.settle(30)', png: false },
    // 노출을 1/8로 내려 발광부가 클리핑에서 벗어난 상태의 계조를 본다.
    { tag: 'D4-expoLow', apply: 'S.fixExposure(S.ev / 8)' },
    { tag: 'D5-expoLow32', apply: 'S.fixExposure(S.ev / 32)' }
  ],
  analyze: (S) => {
    const BOX = {
      ghost: [1880, 350, 2060, 470],
      sconceBowl: [1720, 350, 1860, 470],
      wallpaperRef: [2100, 520, 2280, 640],
      haloTop: [1160, 150, 1400, 250],
      haloLeft: [1090, 230, 1200, 310],
      sconceHalo: [1700, 330, 1980, 470],
      ceilBar: [1210, 260, 1440, 278],
      nearWallL: [100, 780, 700, 1250],
      farEnd: [1150, 650, 1500, 900],
      flatCeil: [1600, 60, 2100, 160],
      carpet: [700, 1250, 1600, 1420],
      darkCorner: [40, 40, 400, 220]
    }
    const B = S.bufs
    const W = B['D0-ship'].w, H = B['D0-ship'].h
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
    // 발광 바 세로 프로파일(램프 중앙 x=1320, y 240..350) — 클리핑 밖에서 계조가 있는지
    const vprof = t => { const L = lum(t); const a = []; for (let y = 240; y < 350; y += 3) a.push(Math.round(L[y * W + 1320])); return a }
    const out = { info: S.info, box: {}, hf: {}, vprof: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.box[t] = {}; out.hf[t] = {}
      for (const k in BOX) { out.box[t][k] = stat(L, BOX[k]); out.hf[t][k] = hf(L, BOX[k]) }
      out.vprof[t] = vprof(t)
    }
    return out
  }
}

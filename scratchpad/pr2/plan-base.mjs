// 기준선 계측. 노출은 첫 케이스에서 고정하고 이후 전 케이스가 그 값을 쓴다.
export default {
  cases: [
    { tag: '1-ship', apply: 'S.fixExposure(P.composite.exposure)' },
    { tag: '2-ship-nodust', apply: 'S.dustHide(true)' },
    { tag: '3-volOFF', apply: 'S.effOff("volumetric")' },
    { tag: '4-rawOFF', apply: 'P.ctx.look.halation = 0; for (const n of ["gtao","ssr","bloom","dof","motionblur"]) S.effOff(n)' },
    { tag: '5-rawVolON', apply: 'S.effOn("volumetric")' },
    { tag: '6-rawVolON-dof', apply: 'S.effOn("dof")' },
    { tag: '7-ship-nodof', apply: 'for (const n of ["gtao","ssr","bloom","motionblur"]) S.effOn(n); S.effOff("dof"); P.ctx.look.halation = 0.24; S.dustHide(false)' }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['1-ship'].w, H = B['1-ship'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
      darkPatch: [0, 0, 300, 200],
      ceilLamp: [300, 150, 940, 550],
      nearWall: [60, 780, 700, 1250],
      midWall: [560, 380, 880, 700],
      farDoor: [1180, 560, 1520, 900],
      shaftIn: [1500, 700, 1700, 900],
      shaftOut: [900, 700, 1100, 900],
      cartPanel: [1620, 1000, 1900, 1200]
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0, mn = 255, mx = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
        const v = L[y * W + x]; s += v; s2 += v * v; n++
        if (v < mn) mn = v; if (v > mx) mx = v
      }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1), min: +mn.toFixed(0), max: +mx.toFixed(0) }
    }
    const grad = (L, r) => {
      let s = 0, n = 0
      for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) {
        const i = y * W + x
        const dx = L[i + 1] - L[i], dy = L[i + W] - L[i]
        s += dx * dx + dy * dy; n++
      }
      return +Math.sqrt(s / n).toFixed(2)
    }
    const frame = t => {
      const b = B[t].buf, L = lum(t), n = W * H
      const hist = new Int32Array(256)
      let black = 0, white = 0, mn = 255
      for (let i = 0; i < n; i++) {
        const v = L[i] | 0; hist[v]++
        if (L[i] < mn) mn = L[i]
        if (b[i * 3] === 0 && b[i * 3 + 1] === 0 && b[i * 3 + 2] === 0) black++
        if (b[i * 3] === 255 && b[i * 3 + 1] === 255 && b[i * 3 + 2] === 255) white++
      }
      const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
      const q25 = rank(0.25)
      let sr = 0, sg = 0, sb = 0, c25 = 0
      for (let i = 0; i < n; i++) if (L[i] <= q25) { sr += b[i * 3]; sg += b[i * 3 + 1]; sb += b[i * 3 + 2]; c25++ }
      return {
        min: +mn.toFixed(1), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999),
        blackPct: +(black * 100 / n).toFixed(3), whitePct: +(white * 100 / n).toFixed(3),
        pctOver250: +(((n - (() => { let c = 0; for (let v = 0; v <= 250; v++) c += hist[v]; return c })()) * 100 / n).toFixed(3)),
        shadowRGB: [+(sr / c25).toFixed(1), +(sg / c25).toFixed(1), +(sb / c25).toFixed(1)]
      }
    }

    const out = { frame: {}, boxes: {}, grad: {} }
    for (const t of ['1-ship', '3-volOFF', '4-rawOFF', '5-rawVolON', '7-ship-nodof']) {
      const L = lum(t)
      out.frame[t] = frame(t)
      out.boxes[t] = {}
      out.grad[t] = {}
      for (const k in BOX) { out.boxes[t][k] = stat(L, BOX[k]); out.grad[t][k] = grad(L, BOX[k]) }
    }

    // 광축 마스크: raw 기준 vol ON/OFF 차분. 배경이 같으므로 순수 인스캐터다.
    const on = lum('5-rawVolON'), off = lum('4-rawOFF')
    const n = W * H
    const d = new Float32Array(n)
    const dh = new Int32Array(512)
    for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; const q = Math.min(511, Math.max(0, (d[i] + 128) | 0)); dh[q]++ }
    const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
    const p999 = drank(0.999)
    const thr = 0.4 * p999
    let coreS = 0, coreN = 0, edgeS = 0, edgeN = 0, outS = 0, outOffS = 0, outN = 0, maskN = 0
    const hiThr = 0.85 * p999
    for (let i = 0; i < n; i++) {
      if (d[i] >= thr) {
        maskN++
        if (d[i] >= hiThr) { coreS += on[i]; coreN++ }
        if (d[i] < thr * 1.25) { edgeS += on[i]; edgeN++ }
      } else { outS += on[i]; outOffS += off[i]; outN++ }
    }
    out.beam = {
      deltaP999: p999, thr: +thr.toFixed(1),
      maskPct: +(maskN * 100 / n).toFixed(2),
      coreL: +(coreS / Math.max(coreN, 1)).toFixed(1),
      edgeL: +(edgeS / Math.max(edgeN, 1)).toFixed(1),
      coreEdgeRatio: +((coreS / Math.max(coreN, 1)) / Math.max(edgeS / Math.max(edgeN, 1), 1e-3)).toFixed(2),
      outsideDeltaPct: +(((outS - outOffS) / Math.max(outOffS, 1e-3)) * 100).toFixed(2)
    }
    const nw = out.boxes['1-ship'].nearWall.mean
    out.g2 = {
      farOverNear: +((out.boxes['1-ship'].farDoor.mean / nw) * 100).toFixed(1),
      shaftInSd: out.boxes['1-ship'].shaftIn.sd,
      shaftOutSd: out.boxes['1-ship'].shaftOut.sd
    }
    return out
  }
}

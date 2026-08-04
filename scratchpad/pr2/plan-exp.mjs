// look.exposure 는 자동노출이 흡수하지 못하는 유일한 레버다 — expo.measure 는 노출 적용 전
// HDR 을 읽고, look.exposure 는 그 뒤에 곱해진다(pipeline.js:450). 안개 밀도를 올리면
// measure 가 그만큼 되받아 올려 복도 끝이 도로 살아나지만(실측 G2~G5), 이 값은 그렇지 않다.
const set = (exp, volI) => `
  P.ctx.look.exposure = ${exp}
  P.ctx.look.volumetricIntensity = ${volI}
  S.volI = ${volI}
  S.freeExposure(); S.settle(90); S.fixExposure(P.composite.exposure)`
const volOff = 'P.ctx.look.volumetricIntensity = 0'
const volOn = 'P.ctx.look.volumetricIntensity = S.volI'

export default {
  cases: [
    { tag: 'H0-pre', apply: 'S.dustHide(true)', png: false },
    { tag: 'H1-on', apply: set(1.10, 0.40), png: false },
    { tag: 'H1-off', apply: volOff, png: false },
    { tag: 'H2-on', apply: volOn + '\n' + set(0.95, 0.40), png: false },
    { tag: 'H2-off', apply: volOff, png: false },
    { tag: 'H3-on', apply: volOn + '\n' + set(0.85, 0.40) },
    { tag: 'H3-off', apply: volOff, png: false },
    { tag: 'H4-on', apply: volOn + '\n' + set(0.85, 0.55) },
    { tag: 'H4-off', apply: volOff, png: false },
    { tag: 'H5-on', apply: volOn + '\n' + set(0.75, 0.55) },
    { tag: 'H5-off', apply: volOff, png: false },
    { tag: 'H6-on', apply: volOn + '\n' + set(0.75, 0.70) },
    { tag: 'H6-off', apply: volOff, png: false }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['H1-on'].w, H = B['H1-on'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = { farEnd: [1216, 640, 1600, 896], nearWall: [320, 1024, 896, 1408], midWall: [576, 512, 896, 794], nearCarpet: [1088, 1152, 1472, 1408], beamCore: [1267, 512, 1395, 666], beamOut: [1140, 512, 1240, 666] }
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) } }
    const n = W * H, out = {}
    for (const g of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) {
      const on = lum(`${g}-on`), off = lum(`${g}-off`), bo = B[`${g}-on`].buf
      const boxes = {}; for (const k in BOX) boxes[k] = stat(on, BOX[k])
      const d = new Float32Array(n), dh = new Int32Array(512)
      for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
      const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
      const p999 = drank(0.999), thr = Math.max(0.4 * p999, 1.5)
      const bins = 32, sIn = new Float64Array(bins), nIn = new Float64Array(bins), sOut = new Float64Array(bins), nOut = new Float64Array(bins)
      let veilS = 0, veilOff = 0, maskN = 0
      for (let i = 0; i < n; i++) { const bi = Math.min(bins - 1, (off[i] / 8) | 0); if (d[i] >= thr) { sIn[bi] += on[i]; nIn[bi]++; maskN++ } else { sOut[bi] += on[i]; nOut[bi]++; veilS += on[i]; veilOff += off[i] } }
      let rs = 0, rw = 0
      for (let bi = 0; bi < bins; bi++) { if (nIn[bi] < 500 || nOut[bi] < 500) continue; const r = (sIn[bi] / nIn[bi]) / Math.max(sOut[bi] / nOut[bi], 1e-3); rs += r * nIn[bi]; rw += nIn[bi] }
      const hist = new Int32Array(256); let black = 0, over250 = 0, dark = 0
      for (let i = 0; i < n; i++) { hist[on[i] | 0]++; if (on[i] > 250) over250++; if (bo[i * 3] === 0 && bo[i * 3 + 1] === 0 && bo[i * 3 + 2] === 0) black++ }
      for (let v = 0; v <= 6; v++) dark += hist[v]
      const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
      const q25 = rank(0.25); let sr = 0, sb = 0, c25 = 0
      for (let i = 0; i < n; i++) if (on[i] <= q25) { sr += bo[i * 3]; sb += bo[i * 3 + 2]; c25++ }
      out[g] = { sameBg: +(rs / Math.max(rw, 1)).toFixed(2), veil: +(((veilS - veilOff) / Math.max(veilOff, 1e-3)) * 100).toFixed(2), farNear: +((boxes.farEnd.mean / boxes.nearWall.mean) * 100).toFixed(1), sdRatio: +(boxes.beamCore.sd / Math.max(boxes.beamOut.sd, 1e-3)).toFixed(2), mask: +(maskN * 100 / n).toFixed(2), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999), darkPct: +(dark * 100 / n).toFixed(2), black: +(black * 100 / n).toFixed(3), over250: +(over250 * 100 / n).toFixed(3), shR: +(sr / c25).toFixed(1), shB: +(sb / c25).toFixed(1), bandSd: [boxes.nearCarpet.sd, boxes.midWall.sd, boxes.farEnd.sd] }
    }
    return out
  }
}

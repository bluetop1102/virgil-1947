// R3 출하 구성 검증. 광축 마스크는 "셸+인스캐터 둘 다 끈 상태" 대비 델타로 잡는다 —
// r2 는 인스캐터만 껐지만 지금은 셸도 광축의 절반을 만들기 때문이다.
const M = "S.moods['corridor-night']"
const U = 'P.effects.volumetric.mMarch.uniforms'
export default {
  cases: [
    { tag: 'V0-ship', apply: `S.settle(140); S.fixExposure(P.composite.exposure); S.keep = { s: ${M}.shaftScale, v: E.look.volumetricIntensity, w: ${U}.uWisp.value }; S.info = { ev: +P.composite.exposure.toFixed(3), shaftScale: ${M}.shaftScale, volI: E.look.volumetricIntensity, wisp: ${U}.uWisp.value, maxCoc: P.effects.dof.mComp.uniforms.uMaxCoc.value, nearCap: P.effects.dof.mComp.uniforms.uNearCap.value }` },
    { tag: 'V1-noDust', apply: 'S.dustHide(true)', png: false },
    { tag: 'V2-axisOFF', apply: `${M}.shaftScale = 0; E.look.volumetricIntensity = 0; S.settle(80)`, png: false },
    { tag: 'V3-axisON', apply: `${M}.shaftScale = S.keep.s; E.look.volumetricIntensity = S.keep.v; S.settle(80)`, png: false },
    { tag: 'V4-wisp0', apply: `${U}.uWisp.value = 0; S.settle(50)`, png: false },
    { tag: 'V5-dofOFF', apply: `${U}.uWisp.value = S.keep.w; S.settle(50); S.effOff("dof")`, png: false },
    { tag: 'V6-dofON-dust', apply: 'S.effOn("dof"); S.dustHide(false)', png: false }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['V0-ship'].w, H = B['V0-ship'].h, n = W * H
    const lum = t => { const b = B[t].buf, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = {
      ceilLamp: [1203, 243, 1459, 346], rightSconce: [1779, 371, 1920, 461],
      farEnd: [1216, 640, 1600, 896], nearWall: [320, 1024, 896, 1408],
      midWall: [576, 512, 896, 794], nearCarpet: [1088, 1152, 1472, 1408],
      ceilBeamR: [1150, 340, 1500, 620], rightFore: [2100, 300, 2540, 1150],
      leftNearWall: [90, 140, 700, 760]
    }
    const stat = (L, r) => { let s = 0, s2 = 0, c = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; c++ } const m = s / c; return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / c - m * m, 0)).toFixed(1) } }
    const grad = (L, r) => { let s = 0, c = 0; for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) { const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]; s += dx * dx + dy * dy; c++ } return +Math.sqrt(s / c).toFixed(2) }
    const out = { info: S.info, boxes: {} }
    for (const t of Object.keys(B)) { const L = lum(t); out.boxes[t] = {}; for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k]) }

    const b = B['V0-ship'].buf, L0 = lum('V0-ship')
    const hist = new Int32Array(256)
    let black = 0, mn = 255, over250 = 0
    for (let i = 0; i < n; i++) { const v = L0[i] | 0; hist[v]++; if (L0[i] < mn) mn = L0[i]; if (L0[i] > 250) over250++; if (b[i * 3] === 0 && b[i * 3 + 1] === 0 && b[i * 3 + 2] === 0) black++ }
    const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
    const q25 = rank(0.25)
    let sr = 0, sb = 0, c25 = 0
    for (let i = 0; i < n; i++) if (L0[i] <= q25) { sr += b[i * 3]; sb += b[i * 3 + 2]; c25++ }
    out.frame = { min: +mn.toFixed(1), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999), blackPct: +(black * 100 / n).toFixed(3), over250Pct: +(over250 * 100 / n).toFixed(3), shadowR: +(sr / c25).toFixed(1), shadowB: +(sb / c25).toFixed(1) }

    const off = lum('V2-axisOFF'), on = lum('V3-axisON'), nw = lum('V4-wisp0')
    const d = new Float32Array(n), dw = new Float32Array(n), dh = new Int32Array(512)
    for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dw[i] = nw[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
    const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
    const p999 = drank(0.999), thr = Math.max(0.4 * p999, 1.5)
    const bins = 32, sIn = new Float64Array(bins), nIn = new Float64Array(bins), sOut = new Float64Array(bins), nOut = new Float64Array(bins)
    const mask = new Uint8Array(n)
    let veilS = 0, veilOff = 0, maskN = 0
    for (let i = 0; i < n; i++) {
      const bi = Math.min(bins - 1, (off[i] / 8) | 0)
      if (d[i] >= thr) { mask[i] = 1; sIn[bi] += on[i]; nIn[bi]++; maskN++ } else { sOut[bi] += on[i]; nOut[bi]++; veilS += on[i]; veilOff += off[i] }
    }
    let rs = 0, rw = 0
    for (let bi = 0; bi < bins; bi++) { if (nIn[bi] < 500 || nOut[bi] < 500) continue; const r = (sIn[bi] / nIn[bi]) / Math.max(sOut[bi] / nOut[bi], 1e-3); rs += r * nIn[bi]; rw += nIn[bi] }
    // 광축 내부 구조: 마스크 안에서 델타의 고주파 RMS / 델타 평균. 셸+인스캐터가 만든
    // 광축 자체의 얼룩만 재고 배경 텍스처는 빠진다(델타 이미지라서).
    const struct = (D) => {
      let g = 0, s = 0, c = 0
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (!mask[i]) continue
        const hp = D[i] - 0.25 * (D[i - 1] + D[i + 1] + D[i - W] + D[i + W])
        g += hp * hp; s += D[i]; c++
      }
      const m = s / Math.max(c, 1)
      return { hpRms: +Math.sqrt(g / Math.max(c, 1)).toFixed(2), mean: +m.toFixed(2), ratio: +((Math.sqrt(g / Math.max(c, 1)) / Math.max(m, 1e-3)) * 100).toFixed(1) }
    }
    out.beam = {
      deltaP999: p999, maskPct: +(maskN * 100 / n).toFixed(2),
      sameBgRatio: +(rs / Math.max(rw, 1)).toFixed(2),
      veilPct: +(((veilS - veilOff) / Math.max(veilOff, 1e-3)) * 100).toFixed(2),
      farOverNear: +((out.boxes['V3-axisON'].farEnd.mean / out.boxes['V3-axisON'].nearWall.mean) * 100).toFixed(1),
      structWisp: struct(d), structNoWisp: struct(dw),
      ceilBeamDelta: +(out.boxes['V3-axisON'].ceilBeamR.mean - out.boxes['V2-axisOFF'].ceilBeamR.mean).toFixed(1)
    }
    const sharp = lum('V5-dofOFF'), soft = lum('V6-dofON-dust')
    out.grad = {}
    for (const k of ['ceilLamp', 'rightSconce', 'midWall', 'nearWall', 'farEnd', 'nearCarpet', 'rightFore']) {
      const a = grad(soft, BOX[k]), s = grad(sharp, BOX[k])
      out.grad[k] = { dofOn: a, dofOff: s, pct: +((a / s) * 100).toFixed(1) }
    }
    return out
  }
}

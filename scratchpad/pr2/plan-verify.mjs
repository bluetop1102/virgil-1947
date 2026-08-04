// 출하 구성 검증. 노출은 출하 자동노출이 수렴한 값으로 고정한 뒤 A/B 한다.
export default {
  cases: [
    { tag: 'V0-ship', apply: 'S.settle(90); S.fixExposure(P.composite.exposure); S.info = { ev: P.composite.exposure, coc: P.effects.dof.mGather.uniforms.uMaxCoc.value, volI: P.ctx.look.volumetricIntensity, shaft: (() => { let m = 0; E.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === "ConeGeometry" && o.material.uniforms && o.material.uniforms.uIntensity) m = Math.max(m, o.material.uniforms.uIntensity.value) }); return m })() }' },
    { tag: 'V1-noDust', apply: 'S.dustHide(true)', png: false },
    { tag: 'V2-vol000', apply: 'P.ctx.look.volumetricIntensity = 0.0', png: false },
    { tag: 'V3-volON', apply: 'P.ctx.look.volumetricIntensity = 0.55', png: false },
    { tag: 'V4-dofOFF', apply: 'S.effOff("dof")', png: false },
    { tag: 'V5-dofON-dust', apply: 'S.effOn("dof"); S.dustHide(false)', png: false }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['V0-ship'].w, H = B['V0-ship'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
      ceilLamp: [1203, 243, 1459, 346], rightSconce: [1779, 371, 1920, 461],
      farEnd: [1216, 640, 1600, 896], nearWall: [320, 1024, 896, 1408],
      midWall: [576, 512, 896, 794], nearCarpet: [1088, 1152, 1472, 1408],
      beamCore: [1267, 512, 1395, 666], beamOut: [1140, 512, 1240, 666]
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) }
    }
    const grad = (L, r) => {
      let s = 0, n = 0
      for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) {
        const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]
        s += dx * dx + dy * dy; n++
      }
      return +Math.sqrt(s / n).toFixed(2)
    }
    const out = { info: S.info, boxes: {}, grad: {} }
    for (const t of Object.keys(B)) { const L = lum(t); out.boxes[t] = {}; for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k]) }

    const b = B['V0-ship'].buf, L0 = lum('V0-ship'), n = W * H
    const hist = new Int32Array(256)
    let black = 0, mn = 255, over250 = 0
    for (let i = 0; i < n; i++) { const v = L0[i] | 0; hist[v]++; if (L0[i] < mn) mn = L0[i]; if (L0[i] > 250) over250++; if (b[i * 3] === 0 && b[i * 3 + 1] === 0 && b[i * 3 + 2] === 0) black++ }
    const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
    const q25 = rank(0.25)
    let sr = 0, sb = 0, c25 = 0
    for (let i = 0; i < n; i++) if (L0[i] <= q25) { sr += b[i * 3]; sb += b[i * 3 + 2]; c25++ }
    out.frame = { min: +mn.toFixed(1), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999), blackPct: +(black * 100 / n).toFixed(3), over250Pct: +(over250 * 100 / n).toFixed(3), shadowR: +(sr / c25).toFixed(1), shadowB: +(sb / c25).toFixed(1) }

    // 광축: uIntensity 0 대비. 소광은 양쪽에 다 있으므로 순수 인스캐터 기여만 남는다.
    const off = lum('V2-vol000'), on = lum('V3-volON')
    const d = new Float32Array(n), dh = new Int32Array(512)
    for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
    const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
    const p999 = drank(0.999), thr = Math.max(0.4 * p999, 1.5)
    const bins = 32, sIn = new Float64Array(bins), nIn = new Float64Array(bins), sOut = new Float64Array(bins), nOut = new Float64Array(bins)
    let veilS = 0, veilOff = 0, maskN = 0
    for (let i = 0; i < n; i++) {
      const bi = Math.min(bins - 1, (off[i] / 8) | 0)
      if (d[i] >= thr) { sIn[bi] += on[i]; nIn[bi]++; maskN++ } else { sOut[bi] += on[i]; nOut[bi]++; veilS += on[i]; veilOff += off[i] }
    }
    let rs = 0, rw = 0
    for (let bi = 0; bi < bins; bi++) { if (nIn[bi] < 500 || nOut[bi] < 500) continue; const r = (sIn[bi] / nIn[bi]) / Math.max(sOut[bi] / nOut[bi], 1e-3); rs += r * nIn[bi]; rw += nIn[bi] }
    out.beam = {
      deltaP999: p999, maskPct: +(maskN * 100 / n).toFixed(2),
      sameBgRatio: +(rs / Math.max(rw, 1)).toFixed(2),
      veilPct: +(((veilS - veilOff) / Math.max(veilOff, 1e-3)) * 100).toFixed(2),
      farOverNear: +((out.boxes['V3-volON'].farEnd.mean / out.boxes['V3-volON'].nearWall.mean) * 100).toFixed(1),
      shaftCoreSd: out.boxes['V3-volON'].beamCore.sd, shaftOutSd: out.boxes['V3-volON'].beamOut.sd
    }
    const sharp = lum('V4-dofOFF'), soft = lum('V5-dofON-dust')
    out.grad = {}
    for (const k of ['ceilLamp', 'rightSconce', 'midWall', 'nearWall', 'farEnd', 'nearCarpet']) {
      const a = grad(soft, BOX[k]), s = grad(sharp, BOX[k])
      out.grad[k] = { dofOn: a, dofOff: s, pct: +((a / s) * 100).toFixed(1) }
    }
    return out
  }
}

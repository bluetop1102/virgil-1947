// 셸(ConeGeometry 광축 껍데기)을 끈 상태를 새 기준선으로 삼고 볼류메트릭을 0에서부터 올린다.
const OFF_CONES = `S.cones = []; E.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry') S.cones.push(o) }); for (const o of S.cones) o.visible = false`

export default {
  cases: [
    { tag: 'A0-shellsOff-auto', apply: OFF_CONES },
    { tag: 'A1-fixed', apply: 'S.fixExposure(P.composite.exposure); S.info = { evFixed: P.composite.exposure }' },
    { tag: 'A2-ssrOFF', apply: 'S.effOff("ssr")' },
    { tag: 'A3-bloomOFF', apply: 'S.effOff("bloom")' },
    { tag: 'A4-dofOFF', apply: 'S.effOff("dof")' },
    { tag: 'A5-volOFF', apply: 'S.effOff("volumetric"); S.dustHide(true)' },
    { tag: 'A6-vol060', apply: 'S.effOn("volumetric"); P.ctx.look.volumetricIntensity = 0.6', png: false },
    { tag: 'A7-vol100', apply: 'P.ctx.look.volumetricIntensity = 1.0', png: false },
    { tag: 'A8-vol172', apply: 'P.ctx.look.volumetricIntensity = 1.72' },
    { tag: 'A9-vol250', apply: 'P.ctx.look.volumetricIntensity = 2.5', png: false },
    { tag: 'B-shipDof', apply: 'P.ctx.look.volumetricIntensity = 1.72; S.effOn("dof"); S.effOn("bloom"); S.effOn("ssr"); S.dustHide(false)' }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['A1-fixed'].w, H = B['A1-fixed'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
      ceilLamp: [1203, 243, 1459, 346],
      ceilGhostL: [380, 230, 780, 350],
      ceilGhostR: [1900, 210, 2320, 340],
      rightSconce: [1779, 371, 1920, 461],
      beamCol: [1229, 358, 1434, 896],
      farEnd: [1216, 640, 1600, 896],
      nearWall: [320, 1024, 896, 1408],
      midWall: [576, 512, 896, 794],
      nearCarpet: [1088, 1152, 1472, 1408],
      darkCeil: [1664, 38, 2432, 179]
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0, mn = 255, mx = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
        const v = L[y * W + x]; s += v; s2 += v * v; n++; if (v < mn) mn = v; if (v > mx) mx = v
      }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1), min: +mn.toFixed(0), max: +mx.toFixed(0) }
    }
    const grad = (L, r) => {
      let s = 0, n = 0
      for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) {
        const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]
        s += dx * dx + dy * dy; n++
      }
      return +Math.sqrt(s / n).toFixed(2)
    }
    const frame = t => {
      const b = B[t].buf, L = lum(t), n = W * H, hist = new Int32Array(256)
      let black = 0, mn = 255, dark = 0
      for (let i = 0; i < n; i++) { const v = L[i] | 0; hist[v]++; if (L[i] < mn) mn = L[i]; if (b[i * 3] === 0 && b[i * 3 + 1] === 0 && b[i * 3 + 2] === 0) black++ }
      for (let v = 0; v <= 6; v++) dark += hist[v]
      const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
      const q25 = rank(0.25)
      let sr = 0, sb = 0, c = 0
      for (let i = 0; i < n; i++) if (L[i] <= q25) { sr += b[i * 3]; sb += b[i * 3 + 2]; c++ }
      return { min: +mn.toFixed(1), p1: rank(0.01), p50: rank(0.5), p999: rank(0.999), blackPct: +(black * 100 / n).toFixed(3), darkPct: +(dark * 100 / n).toFixed(2), shadowR: +(sr / c).toFixed(1), shadowB: +(sb / c).toFixed(1) }
    }

    const out = { info: S.info, frame: {}, boxes: {}, grad: {}, beam: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.frame[t] = frame(t)
      out.boxes[t] = {}
      for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k])
    }
    for (const t of ['A4-dofOFF', 'A8-vol172', 'B-shipDof']) {
      const L = lum(t); out.grad[t] = {}
      for (const k of ['midWall', 'nearWall', 'rightSconce', 'ceilLamp', 'farEnd']) out.grad[t][k] = grad(L, BOX[k])
    }

    const off = lum('A5-volOFF')
    const n = W * H
    for (const t of ['A6-vol060', 'A7-vol100', 'A8-vol172', 'A9-vol250']) {
      const on = lum(t)
      const d = new Float32Array(n), dh = new Int32Array(512)
      for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
      const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
      const p999 = drank(0.999)
      const thr = Math.max(0.4 * p999, 1.5), hi = 0.85 * p999
      let coreS = 0, coreN = 0, edgeS = 0, edgeN = 0, outS = 0, outOff = 0, outN = 0, maskN = 0
      for (let i = 0; i < n; i++) {
        if (d[i] >= thr) { maskN++; if (d[i] >= hi) { coreS += on[i]; coreN++ }; if (d[i] < thr * 1.3) { edgeS += on[i]; edgeN++ } }
        else { outS += on[i]; outOff += off[i]; outN++ }
      }
      out.beam[t] = {
        deltaP999: p999, maskPct: +(maskN * 100 / n).toFixed(2),
        coreL: +(coreS / Math.max(coreN, 1)).toFixed(1), edgeL: +(edgeS / Math.max(edgeN, 1)).toFixed(1),
        coreEdge: +((coreS / Math.max(coreN, 1)) / Math.max(edgeS / Math.max(edgeN, 1), 1e-3)).toFixed(2),
        outsidePct: +(((outS - outOff) / Math.max(outOff, 1e-3)) * 100).toFixed(2),
        farOverNear: +((out.boxes[t].farEnd.mean / out.boxes[t].nearWall.mean) * 100).toFixed(1)
      }
    }
    return out
  }
}

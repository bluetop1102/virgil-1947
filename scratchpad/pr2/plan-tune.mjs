// 셸 제거 후 (1) 볼류메트릭 인스캐터 게인, (2) DOF 흐림 반경을 각각 최소치에서 올린다.
// 인스캐터 기준선은 "패스 제거"가 아니라 uIntensity=0 이다 — 그래야 소광(대기 원근)은 그대로 두고
// 인스캐터 단독 기여만 잰다. 패스를 빼면 소광까지 사라져 베일 판정이 오염된다.
const OFF_CONES = `S.cones = []; E.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry') S.cones.push(o) }); for (const o of S.cones) o.visible = false`
const SETCOC = v => `for (const m of [P.effects.dof.mPrep, P.effects.dof.mGather, P.effects.dof.mComp]) m.uniforms.uMaxCoc.value = ${v}`

export default {
  cases: [
    { tag: 'C0-auto', apply: OFF_CONES, png: false },
    { tag: 'C1-i000', apply: 'S.fixExposure(P.composite.exposure); S.info = { ev: P.composite.exposure }; S.dustHide(true); P.ctx.look.volumetricIntensity = 0.0', png: false },
    { tag: 'C2-i030', apply: 'P.ctx.look.volumetricIntensity = 0.30', png: false },
    { tag: 'C3-i040', apply: 'P.ctx.look.volumetricIntensity = 0.40' },
    { tag: 'C4-i050', apply: 'P.ctx.look.volumetricIntensity = 0.50', png: false },
    { tag: 'C5-i060', apply: 'P.ctx.look.volumetricIntensity = 0.60' },
    { tag: 'C6-i080', apply: 'P.ctx.look.volumetricIntensity = 0.80', png: false },
    { tag: 'D0-coc6', apply: 'P.ctx.look.volumetricIntensity = 0.45; S.dustHide(false)' },
    { tag: 'D1-coc4', apply: SETCOC(4), png: false },
    { tag: 'D2-coc3', apply: SETCOC(3) },
    { tag: 'D3-coc2', apply: SETCOC(2), png: false },
    { tag: 'D4-dofOFF', apply: 'S.effOff("dof")' }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['C1-i000'].w, H = B['C1-i000'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
      ceilLamp: [1203, 243, 1459, 346],
      rightSconce: [1779, 371, 1920, 461],
      leftSconce: [954, 493, 1024, 544],
      farEnd: [1216, 640, 1600, 896],
      nearWall: [320, 1024, 896, 1408],
      midWall: [576, 512, 896, 794],
      nearCarpet: [1088, 1152, 1472, 1408]
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
    const out = { info: S.info, boxes: {}, vol: {}, dof: {} }
    for (const t of Object.keys(B)) { const L = lum(t); out.boxes[t] = {}; for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k]) }

    const off = lum('C1-i000')
    const n = W * H
    for (const t of ['C2-i030', 'C3-i040', 'C4-i050', 'C5-i060', 'C6-i080']) {
      const on = lum(t)
      const d = new Float32Array(n), dh = new Int32Array(512)
      for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
      const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
      const p999 = drank(0.999)
      const thr = Math.max(0.4 * p999, 1.5), hi = 0.85 * p999
      let coreS = 0, coreN = 0, edgeS = 0, edgeN = 0, outS = 0, outOff = 0, maskN = 0
      for (let i = 0; i < n; i++) {
        if (d[i] >= thr) { maskN++; if (d[i] >= hi) { coreS += on[i]; coreN++ }; if (d[i] < thr * 1.3) { edgeS += on[i]; edgeN++ } }
        else { outS += on[i]; outOff += off[i] }
      }
      out.vol[t] = {
        deltaP999: p999, maskPct: +(maskN * 100 / n).toFixed(2),
        coreEdge: +((coreS / Math.max(coreN, 1)) / Math.max(edgeS / Math.max(edgeN, 1), 1e-3)).toFixed(2),
        veilPct: +(((outS - outOff) / Math.max(outOff, 1e-3)) * 100).toFixed(2),
        farOverNear: +((out.boxes[t].farEnd.mean / out.boxes[t].nearWall.mean) * 100).toFixed(1),
        bandSd: [out.boxes[t].nearCarpet.sd, out.boxes[t].midWall.sd, out.boxes[t].farEnd.sd]
      }
    }
    for (const t of ['D0-coc6', 'D1-coc4', 'D2-coc3', 'D3-coc2', 'D4-dofOFF']) {
      const L = lum(t); out.dof[t] = {}
      for (const k of ['ceilLamp', 'rightSconce', 'leftSconce', 'midWall', 'nearWall', 'farEnd']) out.dof[t][k] = grad(L, BOX[k])
    }
    const ref = out.dof['D4-dofOFF']
    for (const t of ['D0-coc6', 'D1-coc4', 'D2-coc3', 'D3-coc2']) {
      out.dof[t].pctOfSharp = {}
      for (const k in ref) if (k !== 'pctOfSharp') out.dof[t].pctOfSharp[k] = +((out.dof[t][k] / ref[k]) * 100).toFixed(1)
    }
    return out
  }
}

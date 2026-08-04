// 광축 자체의 품질: 마치에 들어가는 광원 수, 같은 배경 기준 광축 안/밖 휘도비,
// 광축 코어의 밀도 변주(sd), 근·중·원 밴드 sd 단조성.
const OFF_CONES = `S.cones = []; E.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry') S.cones.push(o) }); for (const o of S.cones) o.visible = false`
const SETCOC = v => `for (const m of [P.effects.dof.mPrep, P.effects.dof.mGather, P.effects.dof.mComp]) m.uniforms.uMaxCoc.value = ${v}`
const DUMP = `S.info = Object.assign(S.info || {}, { ev: P.composite.exposure, marched: P.effects.volumetric.lights.map(r => ({ t: r.type, sh: r.shadowIdx, i: +r.obj.intensity.toFixed(1), p: r.obj.position.toArray().map(v => +v.toFixed(2)) })), pool: (() => { let n = 0; E.scene.traverse(o => { if (o.isLight && o.visible && !o.isAmbientLight && !o.isHemisphereLight) n++ }); return n })() })`

export default {
  cases: [
    { tag: 'F0-i000', apply: `${OFF_CONES}; S.fixExposure(P.composite.exposure); S.dustHide(true); ${SETCOC(3)}; P.effects.volumetric.maxLights = 6; P.ctx.look.volumetricIntensity = 0.0`, png: false },
    { tag: 'F1-i030', apply: `P.ctx.look.volumetricIntensity = 0.30; ${DUMP}`, png: false },
    { tag: 'F2-i040', apply: 'P.ctx.look.volumetricIntensity = 0.40' },
    { tag: 'F3-i055', apply: 'P.ctx.look.volumetricIntensity = 0.55' },
    { tag: 'F4-i070', apply: 'P.ctx.look.volumetricIntensity = 0.70', png: false },
    { tag: 'F5-i040-4lights', apply: 'P.ctx.look.volumetricIntensity = 0.40; P.effects.volumetric.maxLights = 4', png: false },
    { tag: 'F6-dust', apply: 'P.effects.volumetric.maxLights = 6; P.ctx.look.volumetricIntensity = 0.40; S.dustHide(false)' }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['F0-i000'].w, H = B['F0-i000'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    // 천장등 광축이 어두운 원경 개구부를 가로지르는 구간. 중심/양옆이 같은 배경이라 비교가 성립한다.
    const SEG = { core: [1267, 512, 1395, 666], sideL: [1140, 512, 1240, 666], sideR: [1420, 512, 1520, 666] }
    const BOX = {
      beamCore: [1267, 512, 1395, 666],
      beamOut: [1140, 512, 1240, 666],
      farEnd: [1216, 640, 1600, 896],
      nearWall: [320, 1024, 896, 1408],
      midWall: [576, 512, 896, 794],
      nearCarpet: [1088, 1152, 1472, 1408],
      leftSconceBeam: [880, 560, 1060, 780]
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) }
    }
    const out = { info: S.info, boxes: {}, beam: {} }
    for (const t of Object.keys(B)) { const L = lum(t); out.boxes[t] = {}; for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k]) }

    const off = lum('F0-i000')
    const n = W * H
    for (const t of Object.keys(B)) {
      if (t === 'F0-i000') continue
      const on = lum(t)
      const d = new Float32Array(n), dh = new Int32Array(512)
      for (let i = 0; i < n; i++) { d[i] = on[i] - off[i]; dh[Math.min(511, Math.max(0, (d[i] + 128) | 0))]++ }
      const drank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 512; v++) { c += dh[v]; if (c >= t2) return v - 128 } return 383 }
      const p999 = drank(0.999)
      const thr = Math.max(0.4 * p999, 1.5)
      // 같은 배경 대역(off 휘도 8단위 bin) 안에서만 광축 안/밖을 비교한다.
      const bins = 32, sIn = new Float64Array(bins), nIn = new Float64Array(bins), sOut = new Float64Array(bins), nOut = new Float64Array(bins)
      let veilS = 0, veilOff = 0, maskN = 0
      for (let i = 0; i < n; i++) {
        const b = Math.min(bins - 1, (off[i] / 8) | 0)
        if (d[i] >= thr) { sIn[b] += on[i]; nIn[b]++; maskN++ } else { sOut[b] += on[i]; nOut[b]++; veilS += on[i]; veilOff += off[i] }
      }
      let rs = 0, rw = 0
      const perBin = []
      for (let b = 0; b < bins; b++) {
        if (nIn[b] < 500 || nOut[b] < 500) continue
        const r = (sIn[b] / nIn[b]) / Math.max(sOut[b] / nOut[b], 1e-3)
        perBin.push([b * 8, +r.toFixed(2), nIn[b] | 0])
        rs += r * nIn[b]; rw += nIn[b]
      }
      const seg = k => stat(on, SEG[k])
      out.beam[t] = {
        deltaP999: p999, maskPct: +(maskN * 100 / n).toFixed(2),
        sameBgRatio: +(rs / Math.max(rw, 1)).toFixed(2),
        perBin: perBin.slice(0, 10),
        segCore: seg('core'), segL: seg('sideL'), segR: seg('sideR'),
        segRatio: +(seg('core').mean / Math.max((seg('sideL').mean + seg('sideR').mean) / 2, 1e-3)).toFixed(2),
        veilPct: +(((veilS - veilOff) / Math.max(veilOff, 1e-3)) * 100).toFixed(2),
        farOverNear: +((out.boxes[t].farEnd.mean / out.boxes[t].nearWall.mean) * 100).toFixed(1),
        bandSd: [out.boxes[t].nearCarpet.sd, out.boxes[t].midWall.sd, out.boxes[t].farEnd.sd]
      }
    }
    return out
  }
}

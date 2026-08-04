// 소광(density)과 단일산란 알베도를 함께 움직여 "광축 대비"와 "복도 끝 소멸"의 파레토를 다시 찾는다.
// 각 변형은 자동노출이 그 구성에서 수렴한 값으로 고정한 뒤 잰다 — 출하 상태와 같은 노출이어야
// 톤커브 압축 정도가 같고, 다른 노출에서 잰 비율을 섞으면 판정이 어긋난다.
const set = (dens, alb, volI) => `
  E.scene.fog.density = ${dens}
  const u = P.effects.volumetric.mMarch.uniforms
  u.uExtinct.value = ${dens} * 2.4
  u.uScatter.value = ${dens} * 2.4 * ${alb}
  P.ctx.look.volumetricIntensity = ${volI}
  S.volI = ${volI}
  S.freeExposure(); S.settle(90); S.fixExposure(P.composite.exposure)`
const volOff = 'P.ctx.look.volumetricIntensity = 0'
const volOn = 'P.ctx.look.volumetricIntensity = S.volI'

export default {
  cases: [
    { tag: 'G0-pre', apply: 'S.dustHide(true)', png: false },
    { tag: 'G1-on', apply: set(0.0833, 0.90, 0.40) },
    { tag: 'G1-off', apply: volOff, png: false },
    { tag: 'G2-on', apply: volOn + '\n' + set(0.115, 0.90, 0.40) },
    { tag: 'G2-off', apply: volOff, png: false },
    { tag: 'G3-on', apply: volOn + '\n' + set(0.115, 0.70, 0.55) },
    { tag: 'G3-off', apply: volOff, png: false },
    { tag: 'G4-on', apply: volOn + '\n' + set(0.150, 0.62, 0.65) },
    { tag: 'G4-off', apply: volOff, png: false },
    { tag: 'G5-on', apply: volOn + '\n' + set(0.150, 0.80, 0.50) },
    { tag: 'G5-off', apply: volOff, png: false }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['G1-on'].w, H = B['G1-on'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
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
    const n = W * H
    const out = {}
    for (const g of ['G1', 'G2', 'G3', 'G4', 'G5']) {
      const on = lum(`${g}-on`), off = lum(`${g}-off`), bo = B[`${g}-on`].buf
      const boxes = {}; for (const k in BOX) boxes[k] = stat(on, BOX[k])
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
      const hist = new Int32Array(256)
      let black = 0, over250 = 0
      for (let i = 0; i < n; i++) { hist[on[i] | 0]++; if (on[i] > 250) over250++; if (bo[i * 3] === 0 && bo[i * 3 + 1] === 0 && bo[i * 3 + 2] === 0) black++ }
      const rank = q => { let c = 0; const t2 = n * q; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t2) return v } return 255 }
      const q25 = rank(0.25)
      let sr = 0, sb = 0, c25 = 0
      for (let i = 0; i < n; i++) if (on[i] <= q25) { sr += bo[i * 3]; sb += bo[i * 3 + 2]; c25++ }
      out[g] = {
        sameBgRatio: +(rs / Math.max(rw, 1)).toFixed(2),
        veilPct: +(((veilS - veilOff) / Math.max(veilOff, 1e-3)) * 100).toFixed(2),
        farOverNear: +((boxes.farEnd.mean / boxes.nearWall.mean) * 100).toFixed(1),
        coreSd: boxes.beamCore.sd, outSd: boxes.beamOut.sd,
        sdRatio: +(boxes.beamCore.sd / Math.max(boxes.beamOut.sd, 1e-3)).toFixed(2),
        maskPct: +(maskN * 100 / n).toFixed(2), deltaP999: p999,
        p1: rank(0.01), p50: rank(0.5), p999f: rank(0.999), blackPct: +(black * 100 / n).toFixed(3),
        over250Pct: +(over250 * 100 / n).toFixed(3), shadowR: +(sr / c25).toFixed(1), shadowB: +(sb / c25).toFixed(1),
        bandSd: [boxes.nearCarpet.sd, boxes.midWall.sd, boxes.farEnd.sd],
        farMean: boxes.farEnd.mean, nearMean: boxes.nearWall.mean
      }
    }
    return out
  }
}

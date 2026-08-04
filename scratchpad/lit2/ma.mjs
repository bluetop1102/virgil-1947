// 라운드5 판정 3항목을 한 번에. node scratchpad/lit2/ma.mjs <png...>
import { decode, lum } from './png.mjs'

const P = {
  ceilLeft: [150, 20, 450, 300],
  ceilMid: [900, 0, 1400, 300],
  ceilRight: [1900, 0, 2200, 300],
  nearL: [40, 60, 600, 700],
  nearR: [2100, 100, 2555, 900],
  farWain: [1030, 590, 1250, 700],
  farEnd: [960, 430, 1290, 700],
  sconceWall: [900, 400, 1080, 720]
}

function stat (L, w, [x0, y0, x1, y1]) {
  let s = 0, n = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += L[y * w + x]; n++ }
  const m = s / n
  // 국소 대비(rms of high-pass): 판정 "국소 대비비"
  let q = 0
  for (let y = y0 + 2; y < y1 - 2; y++) for (let x = x0 + 2; x < x1 - 2; x++) {
    const c = L[y * w + x]
    const a = (L[y * w + x - 2] + L[y * w + x + 2] + L[(y - 2) * w + x] + L[(y + 2) * w + x]) / 4
    q += (c - a) * (c - a)
  }
  const nn = (x1 - x0 - 4) * (y1 - y0 - 4)
  return { mean: +m.toFixed(1), lc: +Math.sqrt(q / nn).toFixed(2) }
}
// 세로 프로파일(행 평균)에서 줄무늬 진폭: 국소 최대/최소 쌍의 상대 낙차 최대값
function stripes (L, w, x0, x1, y0, y1) {
  const p = []
  for (let y = y0; y < y1; y++) { let s = 0; for (let x = x0; x < x1; x++) s += L[y * w + x]; p.push(s / (x1 - x0)) }
  let best = 0, at = 0
  for (let i = 6; i < p.length - 6; i++) {
    let hi = 0
    for (let j = Math.max(0, i - 45); j < Math.min(p.length, i + 45); j++) if (p[j] > hi) hi = p[j]
    const d = (hi - p[i]) / Math.max(hi, 1e-3)
    if (d > best) { best = d; at = i }
  }
  return { drop: +(best * 100).toFixed(1), at: y0 + at, max: +Math.max(...p).toFixed(1), min: +Math.min(...p).toFixed(1) }
}
// 벽-바닥 접합: 열 x0..x1 에서 y 창의 최소값 vs 위(벽)·아래(바닥) 평균
function contact (L, w, x0, x1, yMin0, yMin1, yUp0, yUp1, yDn0, yDn1) {
  const avg = (a, b) => { let s = 0, n = 0; for (let y = a; y < b; y++) for (let x = x0; x < x1; x++) { s += L[y * w + x]; n++ } return s / n }
  let mn = 1e9, at = 0
  for (let y = yMin0; y < yMin1; y++) { let s = 0; for (let x = x0; x < x1; x++) s += L[y * w + x]; const v = s / (x1 - x0); if (v < mn) { mn = v; at = y } }
  const up = avg(yUp0, yUp1), dn = avg(yDn0, yDn1)
  return { min: +mn.toFixed(1), at, wall: +up.toFixed(1), floor: +dn.toFixed(1), dropWall: +((1 - mn / up) * 100).toFixed(1), dropFloor: +((1 - mn / dn) * 100).toFixed(1) }
}

const rows = []
for (const f of process.argv.slice(2)) {
  const img = decode(f), L = lum(img), w = img.w
  const o = {}
  for (const k in P) o[k] = stat(L, w, P[k])
  const s = {
    L: stripes(L, w, 150, 450, 20, 300),
    M: stripes(L, w, 900, 1400, 0, 300),
    R: stripes(L, w, 1900, 2200, 0, 300)
  }
  const c = contact(L, w, 800, 830, 1205, 1270, 1160, 1195, 1300, 1345)
  const lcNL = +(o.nearL.lc / o.farWain.lc).toFixed(2)
  const lcNR = +(o.nearR.lc / o.farWain.lc).toFixed(2)
  rows.push({
    f: f.split('/').pop().replace('.png', ''),
    ceilL: o.ceilLeft.mean, stripeL: s.L.drop, stripeM: s.M.drop,
    nearL: o.nearL.mean, nearLlc: o.nearL.lc, nearR: o.nearR.mean, nearRlc: o.nearR.lc,
    far: o.farWain.mean, farlc: o.farWain.lc, farEnd: o.farEnd.mean, scWall: o.sconceWall.mean,
    'LC nL/f': lcNL, 'LC nR/f': lcNR, 'mean nR/f': +(o.nearR.mean / o.farWain.mean).toFixed(2),
    cMin: c.min, cWall: c.wall, cDropW: c.dropWall, cDropF: c.dropFloor
  })
}
console.table(rows)

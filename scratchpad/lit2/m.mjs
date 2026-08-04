// 라운드5 판정 지표. node scratchpad/lit2/m.mjs <png...>
import { decode, lum } from './png.mjs'

const BOX = {
  nearWallpaperL: [40, 60, 600, 700],
  nearWallR: [2100, 100, 2555, 900],
  farWainscot: [1030, 590, 1250, 700],
  farEnd: [960, 430, 1290, 700]
}
// 국소 대비: 3x3 평균 대비 편차의 rms / 평균 (마이크로 콘트라스트)
function localContrast (L, w, [x0, y0, x1, y1]) {
  let s = 0, n = 0, hi = 0, lo = 1e9, sum = 0
  for (let y = y0 + 2; y < y1 - 2; y++) {
    for (let x = x0 + 2; x < x1 - 2; x++) {
      const c = L[y * w + x]
      const m = (L[y * w + x - 2] + L[y * w + x + 2] + L[(y - 2) * w + x] + L[(y + 2) * w + x]) / 4
      s += (c - m) * (c - m); n++; sum += c
      if (c > hi) hi = c; if (c < lo) lo = c
    }
  }
  const mean = sum / n
  return { mean: +mean.toFixed(2), rms: +Math.sqrt(s / n).toFixed(3), hi, lo }
}
function stat (L, w, [x0, y0, x1, y1]) {
  let s = 0, ss = 0, n = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = L[y * w + x]; s += v; ss += v * v; n++ }
  const m = s / n
  return { mean: +m.toFixed(2), sd: +Math.sqrt(ss / n - m * m).toFixed(2) }
}
for (const f of process.argv.slice(2)) {
  const img = decode(f), L = lum(img), w = img.w
  console.log(f, `${img.w}x${img.h}`)
  const o = {}
  for (const k in BOX) { o[k] = { ...stat(L, w, BOX[k]), ...localContrast(L, w, BOX[k]) }; console.log('  ', k.padEnd(15), JSON.stringify(o[k])) }
  const lcRatio = (a, b) => +((o[a].rms / Math.max(o[a].mean, 1e-3)) / (o[b].rms / Math.max(o[b].mean, 1e-3))).toFixed(2)
  console.log('   LC(rms) nearL/far', +(o.nearWallpaperL.rms / o.farWainscot.rms).toFixed(2),
    ' nearR/far', +(o.nearWallR.rms / o.farWainscot.rms).toFixed(2))
  console.log('   LC(rms/mean) nearL/far', lcRatio('nearWallpaperL', 'farWainscot'), ' nearR/far', lcRatio('nearWallR', 'farWainscot'))
  console.log('   mean ladder nearR/far', +(o.nearWallR.mean / o.farWainscot.mean).toFixed(2))
}

// reg.mjs <a.png> [b.png] — 지정 영역들의 평균휘도 · 그래디언트 RMS · (b가 있으면) 평균차
import { decode, lum } from './png.mjs'
const REG = {
  radiator: [370, 1200, 170, 200],
  lfixture: [600, 250, 180, 170],
  beams: [700, 0, 1200, 350],
  domeBar: [1180, 250, 300, 80],
  domeGlow: [1130, 200, 420, 220],
  sconceR: [1740, 320, 200, 200],
  sconceL: [880, 420, 180, 180],
  wallMid: [1500, 700, 300, 300],
  carpet: [900, 1150, 500, 250]
}
function stats (img, [x, y, w, h]) {
  let s = 0, g = 0, n = 0
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      const l = lum(img, j * img.w + i)
      s += l; n++
      const dx = lum(img, j * img.w + i + 1) - l
      const dy = lum(img, (j + 1) * img.w + i) - l
      g += dx * dx + dy * dy
    }
  }
  return { mean: +(s / n).toFixed(2), grad: +Math.sqrt(g / n).toFixed(2) }
}
const a = decode(process.argv[2])
const b = process.argv[3] ? decode(process.argv[3]) : null
const rows = []
for (const [k, r] of Object.entries(REG)) {
  const sa = stats(a, r)
  const sb = b ? stats(b, r) : null
  rows.push(sb ? `${k.padEnd(10)} mean ${String(sa.mean).padStart(7)} → ${String(sb.mean).padStart(7)}  Δ${(sb.mean - sa.mean).toFixed(2).padStart(7)}   grad ${String(sa.grad).padStart(6)} → ${String(sb.grad).padStart(6)}`
    : `${k.padEnd(10)} mean ${String(sa.mean).padStart(7)}  grad ${String(sa.grad).padStart(6)}`)
}
console.log(rows.join('\n'))

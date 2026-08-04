import { decode } from './png.mjs'
const a = decode(process.argv[2]), b = decode(process.argv[3])
let diff = 0, max = 0, sum = 0
for (let i = 0; i < a.w * a.h; i++) {
  let d = 0
  for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(a.data[i * a.ch + k] - b.data[i * b.ch + k]))
  if (d) diff++
  if (d > max) max = d
  sum += d
}
console.log(`diffPx ${(diff * 100 / (a.w * a.h)).toFixed(2)}%  maxCh ${max}  meanCh ${(sum / (a.w * a.h)).toFixed(3)}`)

// node scratchpad/lit1/prof.mjs <png> <axis:row|col> <x0> <y0> <x1> <y1>
import { decode, lum } from './png.mjs'
const [src, axis, x0, y0, x1, y1] = process.argv.slice(2)
const img = decode(src)
const L = lum(img)
const X0 = +x0, Y0 = +y0, X1 = +x1, Y1 = +y1
const out = []
if (axis === 'row') {
  for (let y = Y0; y < Y1; y++) { let s = 0; for (let x = X0; x < X1; x++) s += L[y * img.w + x]; out.push([y, +(s / (X1 - X0)).toFixed(1)]) }
} else {
  for (let x = X0; x < X1; x++) { let s = 0; for (let y = Y0; y < Y1; y++) s += L[y * img.w + x]; out.push([x, +(s / (Y1 - Y0)).toFixed(1)]) }
}
const mx = Math.max(...out.map(o => o[1])), mn = Math.min(...out.map(o => o[1]))
for (const [i, v] of out) {
  const bar = '#'.repeat(Math.round((v - mn) / Math.max(mx - mn, 1e-6) * 60))
  console.log(String(i).padStart(5), String(v).padStart(7), bar)
}
console.log(`min ${mn.toFixed(1)}  max ${mx.toFixed(1)}  ratio ${(mx / Math.max(mn, 1e-3)).toFixed(2)}`)

import { decode, lum } from '../post4/png.mjs'
const A = decode(process.argv[2]), B = decode(process.argv[3])
const G = 64
const out = []
for (let by = 0; by < A.h; by += G) for (let bx = 0; bx < A.w; bx += G) {
  let s = 0, n = 0, mx = 0
  for (let y = by; y < Math.min(by + G, A.h); y++) for (let x = bx; x < Math.min(bx + G, A.w); x++) {
    const i = y * A.w + x
    const d = Math.abs(lum(A, i) - lum(B, i))
    s += d; n++; if (d > mx) mx = d
  }
  out.push([bx, by, s / n, mx])
}
out.sort((a, b) => b[2] - a[2])
for (const [x, y, m, mx] of out.slice(0, 12)) console.log(`${x},${y}  mean ${m.toFixed(2)}  max ${mx.toFixed(0)}`)

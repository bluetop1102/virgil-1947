import { decode, lum } from '../post4/png.mjs'
const A = decode(process.argv[2]), B = decode(process.argv[3])
const ring = (cx, cy, r0, r1) => {
  let s = 0, n = 0
  for (let y = cy - 170; y <= cy + 170; y++) for (let x = cx - 170; x <= cx + 170; x++) {
    if (x < 0 || y < 0 || x >= A.w || y >= A.h) continue
    const d = Math.hypot(x - cx, y - cy)
    if (d < r0 || d >= r1) continue
    s += lum(A, y * A.w + x) - lum(B, y * B.w + x); n++
  }
  return n ? (s / n).toFixed(2) : '-'
}
const SP = [[0, 8], [8, 16], [16, 32], [32, 48], [48, 64], [64, 96], [96, 128], [128, 160]]
for (const t of process.argv.slice(4)) {
  const [name, cx, cy] = t.split(',')
  console.log(name.padEnd(10), SP.map(([a, b]) => `${a}-${b}:${ring(+cx, +cy, a, b)}`).join('  '))
}

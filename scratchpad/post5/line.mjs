// line.mjs <png> <x0> <y0> <dx> <dy> <n> [halfwidth] — 선을 따라 휘도 프로파일(수직 평균)
import { decode, lum } from '../post4/png.mjs'
const img = decode(process.argv[2])
const [x0, y0, dx, dy, n, hw] = process.argv.slice(3).map(Number)
const H = hw ?? 0
const out = []
for (let i = 0; i < n; i++) {
  let s = 0, c = 0
  for (let k = -H; k <= H; k++) {
    const x = Math.round(x0 + dx * i - dy * k), y = Math.round(y0 + dy * i + dx * k)
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue
    s += lum(img, y * img.w + x); c++
  }
  out.push(`${Math.round(x0 + dx * i)},${Math.round(y0 + dy * i)}:${(s / c).toFixed(0)}`)
}
console.log(out.join(' '))

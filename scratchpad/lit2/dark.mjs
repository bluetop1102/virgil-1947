import { decode, lum } from './png.mjs'
const img = decode(process.argv[2]), L = lum(img), w = img.w, h = img.h
const GX = 8, GY = 6
const cell = Array.from({ length: GY }, () => new Array(GX).fill(0))
let tot = 0
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (L[y * w + x] <= 6) { cell[Math.min(GY - 1, (y * GY / h) | 0)][Math.min(GX - 1, (x * GX / w) | 0)]++; tot++ }
}
console.log('dark total', (tot * 100 / (w * h)).toFixed(2) + '%')
const per = (w / GX) * (h / GY)
for (let j = 0; j < GY; j++) console.log(cell[j].map(v => (v * 100 / per).toFixed(1).padStart(6)).join(''))

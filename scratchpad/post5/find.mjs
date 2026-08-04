// 밝은 덩어리 찾기: 32x32 블록 평균휘도 상위 N
import { decode, lum } from '../post4/png.mjs'
const img = decode(process.argv[2])
const B = 32
const out = []
for (let by = 0; by + B <= img.h; by += B) {
  for (let bx = 0; bx + B <= img.w; bx += B) {
    let s = 0
    for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) s += lum(img, (by + j) * img.w + bx + i)
    out.push([bx + B / 2, by + B / 2, s / (B * B)])
  }
}
out.sort((a, b) => b[2] - a[2])
for (const [x, y, v] of out.slice(0, +(process.argv[3] ?? 24))) console.log(`${x},${y}  ${v.toFixed(1)}`)
